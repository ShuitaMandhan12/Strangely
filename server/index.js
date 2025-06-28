const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Data structures
const users = {};
const rooms = new Map();
const roomMessages = new Map();
const readReceipts = new Map();
const roomActivityTimers = new Map();

// Initialize default rooms
['general', 'gaming', 'movies', 'music'].forEach(room => {
  rooms.set(room, new Set());
  roomMessages.set(room, [{
    id: uuidv4(),
    username: 'System',
    message: `Room ${room} created`,
    timestamp: new Date().toISOString(),
    isSystem: true,
    room: room
  }]);
  roomActivityTimers.set(room, Date.now());
});

// Room cleanup function
function checkInactiveRooms() {
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  rooms.forEach((usersInRoom, roomName) => {
    if (['general', 'gaming', 'movies', 'music'].includes(roomName)) return;
    
    const lastActivity = roomActivityTimers.get(roomName) || 0;
    const isRoomEmpty = usersInRoom.size === 0;
    const isInactiveFor24h = now - lastActivity > TWENTY_FOUR_HOURS;
    
    if (isInactiveFor24h && isRoomEmpty) {
      rooms.delete(roomName);
      roomMessages.delete(roomName);
      roomActivityTimers.delete(roomName);
      io.emit('room-removed', roomName);
      console.log(`Room ${roomName} removed due to inactivity`);
    }
  });
}

// Helper functions
function updateRoomActivity(roomName) {
  roomActivityTimers.set(roomName, Date.now());
}

function isValidRoom(room) {
  return rooms.has(room);
}

function getUsersInRoom(room) {
  if (!rooms.has(room)) return [];
  return Array.from(rooms.get(room))
    .map(socketId => users[socketId])
    .filter(Boolean)
    .map(user => ({
      username: user.username,
      id: user.id,
      status: user.status,
      avatarIndex: user.avatarIndex
    }));
}

// Run cleanup every hour
setInterval(checkInactiveRooms, 60 * 60 * 1000);

io.on('connection', (socket) => {
  console.log('👉 New user connected:', socket.id);

  // Send current room list to newly connected client
  socket.emit('room-list', Array.from(rooms.keys()));

  let currentRoom = 'general';
  let currentUsername = '';

  // When user joins
  socket.on('join', ({ username, avatarIndex }) => {
   
    currentUsername = username;
    users[socket.id] = {
      username,
      id: socket.id,
      room: currentRoom,
      status: 'online',
       avatarIndex: avatarIndex || 0
    };

    rooms.get(currentRoom).add(socket.id);
    socket.join(currentRoom);
    updateRoomActivity(currentRoom);
    
    // Send history
    const roomHistory = roomMessages.get(currentRoom) || [];
    const filteredHistory = roomHistory.filter(msg => 
      msg.isSystem || msg.room === currentRoom
    );
    socket.emit('room-history', filteredHistory);

    // Send current room list to newly connected client
    socket.emit('room-list', Array.from(rooms.keys()));
    
    // Notify room about new user
   io.to(currentRoom).emit('user-joined', username);
   io.to(currentRoom).emit('update-users', getUsersInRoom(currentRoom));


    // Send current room list
    socket.emit('room-list', Array.from(rooms.keys()));
  });

  // When message is sent
  socket.on('send-message', (messageData) => {
    const user = users[socket.id];
    if (!user) return;

    let messageObj;
    
    if (typeof messageData === 'object' && messageData.type === 'file') {
      messageObj = {
        ...messageData,
        id: uuidv4(),
        username: user.username,
        timestamp: new Date().toISOString(),
        reactions: {},
        edited: false,
        room: user.room,
        avatarIndex: user.avatarIndex
      };
    } else if (typeof messageData === 'object' && messageData.message) {
      messageObj = { 
        id: uuidv4(),
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        reactions: {},
        edited: false,
        room: user.room,
        replyTo: messageData.replyTo || null,
        avatarIndex: user.avatarIndex
      };
    } else if (typeof messageData === 'string') {
      messageObj = { 
        id: uuidv4(),
        username: user.username,
        message: messageData,
        timestamp: new Date().toISOString(),
        reactions: {},
        edited: false,
        room: user.room,
        replyTo: null,
        avatarIndex: user.avatarIndex
      };
    } else {
      console.error('Invalid message format:', messageData);
      return;
    }
    
    roomMessages.get(user.room).push(messageObj);
    readReceipts.set(messageObj.id, new Set());
    io.to(user.room).emit('receive-message', messageObj);
  });

  // When user changes room
  socket.on('change-room', (newRoom) => {
    const user = users[socket.id];
    if (!user || !isValidRoom(newRoom)) return;
    
    const oldRoom = user.room;
    rooms.get(oldRoom).delete(socket.id);
    socket.leave(oldRoom);
    
    io.to(oldRoom).emit('user-left', user.username);
    io.to(oldRoom).emit('update-users', getUsersInRoom(oldRoom));

    currentRoom = newRoom;
    user.room = newRoom;
    rooms.get(newRoom).add(socket.id);
    socket.join(newRoom);
    updateRoomActivity(newRoom);
    
    const roomHistory = roomMessages.get(newRoom) || [];
    const filteredHistory = roomHistory.filter(msg => 
      msg.isSystem || msg.room === newRoom
    );
    socket.emit('room-history', filteredHistory);
    
    io.to(newRoom).emit('user-joined', user.username);
    io.to(newRoom).emit('update-users', getUsersInRoom(newRoom));
    
    
    // Mark messages as read when joining room
    const messages = roomMessages.get(newRoom);
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.username !== user.username) {
        socket.emit('mark-as-read', lastMessage.id);
      }
    }
  });


  // When user creates a new room
  socket.on('create-room', (roomName) => {
    if (!roomName || typeof roomName !== 'string') return;
    
    const normalizedRoom = roomName.trim().toLowerCase();
    if (!rooms.has(normalizedRoom)) {
      rooms.set(normalizedRoom, new Set());
      roomMessages.set(normalizedRoom, []);
      updateRoomActivity(normalizedRoom);
      io.emit('room-created', normalizedRoom);
    }
  });

  // Typing indicator
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit('typing', {
        username: user.username,
        isTyping
      });
    }
  });

  // Message reactions
  socket.on('update-reaction', ({ messageId, emoji, action }) => {
    const user = users[socket.id];
    if (!user) return;

    const messages = roomMessages.get(currentRoom);
    if (!messages) return;
    
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    
    if (action === 'add') {
      Object.keys(message.reactions).forEach(e => {
        if (message.reactions[e].users.includes(user.username)) {
          message.reactions[e].users = message.reactions[e].users.filter(u => u !== user.username);
          message.reactions[e].count--;
          if (message.reactions[e].count === 0) {
            delete message.reactions[e];
          }
        }
      });
      
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = {
          count: 0,
          users: []
        };
      }
      message.reactions[emoji].count++;
      message.reactions[emoji].users.push(user.username);
    } else if (action === 'remove') {
      if (message.reactions[emoji]) {
        message.reactions[emoji].users = message.reactions[emoji].users.filter(u => u !== user.username);
        message.reactions[emoji].count--;
        if (message.reactions[emoji].count === 0) {
          delete message.reactions[emoji];
        }
      }
    }
    
    io.to(currentRoom).emit('reaction-updated', {
      messageId,
      reactions: message.reactions
    });
  });

  // Message editing
  socket.on('edit-message', ({ messageId, newMessage }) => {
    const user = users[socket.id];
    if (!user) return;

    const messages = roomMessages.get(currentRoom);
    if (!messages) return;
    
    const messageIndex = messages.findIndex(m => 
      m.id === messageId && m.username === user.username
    );
    
    if (messageIndex !== -1) {
      messages[messageIndex].message = newMessage;
      messages[messageIndex].edited = true;
      io.to(currentRoom).emit('message-edited', {
        messageId,
        newMessage
      });
    }
  });

  // Message deletion
  socket.on('delete-message', (messageId) => {
    const user = users[socket.id];
    if (!user) return;

    const messages = roomMessages.get(currentRoom);
    if (!messages) return;
    
    const messageIndex = messages.findIndex(m => 
      m.id === messageId && m.username === user.username
    );
    
    if (messageIndex !== -1) {
      messages.splice(messageIndex, 1);
      io.to(currentRoom).emit('message-deleted', { messageId });
    }
  });

  // Read receipts
  socket.on('mark-as-read', (messageId) => {
    const user = users[socket.id];
    if (!user) return;
    
    if (readReceipts.has(messageId)) {
      const receipts = readReceipts.get(messageId);
      if (!receipts.has(user.username)) {
        receipts.add(user.username);
        io.to(currentRoom).emit('message-read', {
          messageId,
          username: user.username
        });
      }
    }
  });

  // User status updates
  socket.on('user-status', (status) => {
    const user = users[socket.id];
    if (user) {
      user.status = status;
      io.to(user.room).emit('update-users', getUsersInRoom(user.room));
    }
  });

  // Avatar changes
  // socket.on('avatar-change', (avatarIndex) => {
  //   const user = users[socket.id];
  //   if (user) {
  //     user.avatarIndex = avatarIndex;
  //     io.to(user.room).emit('update-users', getUsersInRoom(user.room));
  //     socket.broadcast.emit('avatar-updated', {
  //       userId: socket.id,
  //       avatarIndex
  //     });
  //   }
  // });

  // When user leaves
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const room = user.room;
      rooms.get(room).delete(socket.id);
      updateRoomActivity(room);
      
      if (rooms.get(room).size === 0 && !['general', 'gaming', 'movies', 'music'].includes(room)) {
        updateRoomActivity(room);
      }
      
      io.to(room).emit('user-left', user.username);
      io.to(room).emit('update-users', getUsersInRoom(room));
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});