import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Send, ChevronDown, X, Menu, Paperclip, Moon, Sun, 
  Edit, Trash2, Plus, Reply, Copy, Smile, Search, 
  MessageCircle, Users, UserCircle 
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import FileMessage from './FileMessage';
import AvatarSelector from './AvatarSelector';

const socket = io('http://localhost:5000');

// Avatar component
function Avatar({ username, avatarIndex, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xl',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-12 h-12 text-3xl'
  };

const avatars = ["👨", "👩", "🧑", "👨‍🦰", "👩‍🦰", "👨‍🦱", "👩‍🦱", "👨‍💼", "👩‍💼", "🧔", "🧓", "👳‍♂️", "👲", "🧕", "👮‍♂️"];

  return (
    <div className={`rounded-full flex items-center justify-center ${sizes[size]} ${className}`}>
      {avatarIndex !== undefined && avatarIndex !== null ? (
        <span className="hover:scale-110 transition-transform">{avatars[avatarIndex]}</span>
      ) : (
        <div className={`${sizes[size]} rounded-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 text-white`}>
          {username?.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function ChatRoom({ username, avatarIndex: initialAvatarIndex }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeRoom, setActiveRoom] = useState('general');
  const [typingUsers, setTypingUsers] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [darkMode, setDarkMode] = useState(false);
  const [readReceipts, setReadReceipts] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [rooms, setRooms] = useState(['general', 'gaming', 'movies', 'music']);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showEmojiPalette, setShowEmojiPalette] = useState(null);
  const [view, setView] = useState('chats');
  const [avatarIndex, setAvatarIndex] = useState(initialAvatarIndex || 0);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const emojiPaletteRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢'];

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        const savedTime = localStorage.getItem('chatHistoryTime');
        if (savedTime && Date.now() - parseInt(savedTime) < 48 * 60 * 60 * 1000) {
          setMessages(history);
        }
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const userRooms = new Set(messages.map(msg => msg.room));
      const history = messages
        .filter(msg => userRooms.has(msg.room))
        .slice(-100);
      
      localStorage.setItem('chatHistory', JSON.stringify(history));
      localStorage.setItem('chatHistoryTime', Date.now().toString());
    }
  }, [messages]);

  // Handle window resize for sidebar visibility
  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close emoji picker and message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        const emojiButton = event.target.closest('button[aria-label="emoji"]')
        if (!emojiButton) {
          setShowEmojis(false)
        }
      }
      
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        const menuButton = event.target.closest('.message-container')
        if (!menuButton) {
          setActiveMessageMenu(null)
        }
      }
      
      if (emojiPaletteRef.current && !emojiPaletteRef.current.contains(event.target)) {
        const plusButton = event.target.closest('.plus-reaction-button')
        if (!plusButton) {
          setShowEmojiPalette(null)
        }
      }
    
      if (window.innerWidth < 768 && showSidebar && 
          !event.target.closest('.sidebar') && 
          !event.target.closest('.menu-button')) {
        setShowSidebar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSidebar, activeMessageMenu, showEmojiPalette])

  // Set up socket listeners
  useEffect(() => {
    socket.emit('join', { username, avatarIndex })

    socket.on('room-list', (roomList) => {
      setRooms(roomList);
    });

    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, data])
    })

    socket.on('room-history', (history) => {
      setMessages(history)
    })

    socket.on('user-joined', (username) => {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        username: 'System', 
        message: `${username} joined`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }])
    })
  
    socket.on('user-left', (username) => {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        username: 'System', 
        message: `${username} left`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }])
    })
  
    socket.on('update-users', (usersList) => {
      setUsers(usersList)
    })
  
    socket.on('typing', ({ username, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping && !prev.includes(username)) {
          return [...prev, username]
        } else if (!isTyping) {
          return prev.filter(u => u !== username)
        }
        return prev
      })
    })

    socket.on('reaction-updated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            reactions
          }
        }
        return msg
      }))
    })

    socket.on('message-edited', ({ messageId, newMessage }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            message: newMessage,
            edited: true
          }
        }
        return msg
      }))
    })

    socket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    })

    socket.on('message-read', ({ messageId, username }) => {
      setReadReceipts(prev => {
        const existingReceipts = prev[messageId] || []
        if (!existingReceipts.includes(username)) {
          return {
            ...prev,
            [messageId]: [...existingReceipts, username]
          }
        }
        return prev
      })
    })

    socket.on('room-created', (newRoom) => {
      setRooms(prev => [...prev, newRoom])
    })

    socket.on('room-removed', (roomName) => {
      setRooms(prev => prev.filter(room => room !== roomName))
    })

    socket.on('avatar-updated', ({ userId, avatarIndex }) => {
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, avatarIndex } : user
      ));
    });

    // Get initial room list
    socket.emit('get-rooms')

    return () => {
      socket.off('receive-message')
      socket.off('room-history')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('update-users')
      socket.off('typing')
      socket.off('reaction-updated')
      socket.off('message-edited')
      socket.off('message-deleted')
      socket.off('message-read')
      socket.off('room-created')
      socket.off('room-removed')
      socket.off('avatar-updated')
    }
  }, [username, avatarIndex])

  // Apply dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Track when messages are viewed for read receipts
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.username !== username) {
      socket.emit('mark-as-read', lastMessage.id)
    }
  }, [messages, username])

  // Idle detection for user status
  useEffect(() => {
    let timeout
    
    const resetIdleTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        socket.emit('user-status', 'idle')
      }, 30000)
    }

    const handleActivity = () => {
      socket.emit('user-status', 'online')
      resetIdleTimer()
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    resetIdleTimer()
    
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      clearTimeout(timeout)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTyping = (isTyping) => {
    socket.emit('typing', isTyping)
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (message.trim()) {
      if (editingMessageId) {
        socket.emit('edit-message', {
          messageId: editingMessageId,
          newMessage: message
        })
        setEditingMessageId(null)
      } else {
        const messageData = {
          id: Date.now().toString(),
          username,
          message,
          timestamp: new Date().toISOString(),
          replyTo: replyingTo?.id,
          avatarIndex
        }
        socket.emit('send-message', messageData)
      }
      setMessage('')
      setReplyingTo(null)
      handleTyping(false)
      setShowEmojis(false)
    }
  }

  const renderMessageContent = (msg) => {
    if (msg.type === 'file') {
      return <FileMessage message={msg} isOwnMessage={msg.username === username} />
    }
    return <p className="break-words">{msg.message}</p>
  }

  const handleFileUpload = async (file) => {
    setUploading(true)
    
    try {
      const fileMessage = {
        id: Date.now().toString(),
        username,
        type: 'file',
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        timestamp: new Date().toISOString(),
        replyTo: replyingTo?.id,
        avatarIndex
      }
      
      socket.emit('send-message', fileMessage)
      setReplyingTo(null)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleReaction = (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
  
    if (!message.reactions) {
      message.reactions = {};
    }
  
    const hasReacted = message.reactions[emoji]?.users.includes(username);
  
    socket.emit('update-reaction', { 
      messageId, 
      emoji,
      action: hasReacted ? 'remove' : 'add'
    });
    
    setActiveMessageMenu(null);
    setShowEmojiPalette(null);
  };

  const deleteMessage = (messageId) => {
    socket.emit('delete-message', messageId)
    setActiveMessageMenu(null)
  }

  const startEditing = (message) => {
    setEditingMessageId(message.id)
    setMessage(message.message)
    messageInputRef.current.focus()
    setActiveMessageMenu(null)
    setReplyingTo(null)
  }

  const cancelEditing = () => {
    setEditingMessageId(null)
    setMessage('')
  }

  const copyMessageText = (text) => {
    navigator.clipboard.writeText(text)
    setActiveMessageMenu(null)
  }

  const changeRoom = (room) => {
    socket.emit('change-room', room)
    setActiveRoom(room)
    setReplyingTo(null)
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      const roomName = newRoomName.trim().toLowerCase();
      if (!rooms.includes(roomName)) {
        socket.emit('create-room', roomName);
        setNewRoomName('');
        setShowCreateRoomModal(false);
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const insertEmoji = (emoji) => {
    setMessage(prev => prev + emoji.emoji)
    setShowEmojis(false)
    messageInputRef.current.focus()
  }

  const toggleMessageMenu = (messageId, event) => {
    event.stopPropagation()
    if (activeMessageMenu === messageId) {
      setActiveMessageMenu(null)
    } else {
      setActiveMessageMenu(messageId)
    }
  }

  const handleReply = (message) => {
    setReplyingTo(message)
    messageInputRef.current.focus()
    setActiveMessageMenu(null)
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const findMessageById = (id) => {
    return messages.find(msg => msg.id === id)
  }

  const toggleEmojiPalette = (messageId, event) => {
    event.stopPropagation()
    setShosidebarwEmojiPalette(showEmojiPalette === messageId ? null : messageId)
    setActiveMessageMenu(null)
  }

  const handleMessageHover = (messageId) => {
    clearTimeout(hoverTimeoutRef.current)
    setHoveredMessage(messageId)
  }

  const handleMessageLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessage(null)
    }, 300)
  }

  const handleAvatarChange = (newAvatarIndex) => {
    setAvatarIndex(newAvatarIndex);
    socket.emit('avatar-change', newAvatarIndex);
    setShowAvatarModal(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row">

      {/* Mobile menu button */}
      
      
      {/* Sidebar - Rooms and Online Users */}
      <div 
        ref={sidebarRef}
        className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          transform transition-transform duration-300 ease-in-out 
          fixed md:relative inset-y-0 left-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg w-72 shadow-lg md:shadow-none sidebar
          flex flex-col border-r border-gray-200 dark:border-gray-800
        `}
      >
        <div className="p-4 bg-gradient-to-r from-purple-900 to-pink-800 flex justify-between items-center border-b border-purple-500/30">
          <h2 className="text-xl font-bold text-white neon-text">Strangely</h2>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-full hover:bg-purple-800/30 text-white"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button 
              onClick={() => setShowAvatarModal(true)}
              className="p-1.5 rounded-full hover:bg-purple-800/30 text-white"
              title="Change avatar"
            >
              <UserCircle size={22} />
            </button>
            <button 
              onClick={() => setShowSidebar(false)}
              className="md:hidden p-1.5 rounded-full hover:bg-purple-800/30 text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setView('chats')}
            className={`flex-1 py-3 text-center font-medium flex items-center justify-center ${
              view === 'chats'
                ? 'text-pink-400 border-b-2 border-pink-400 bg-gray-100/50 dark:bg-gray-800/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <MessageCircle size={18} className="mr-2" />
            Chats
          </button>
          <button
            onClick={() => setView('users')}
            className={`flex-1 py-3 text-center font-medium flex items-center justify-center ${
              view === 'users'
                ? 'text-pink-400 border-b-2 border-pink-400 bg-gray-100/50 dark:bg-gray-800/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/30 dark:hover:bg-gray-800/30'
            }`}
          >
            <Users size={18} className="mr-2" />
            Users
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {view === 'chats' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2 py-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">ROOMS</h3>
                <button 
                  onClick={() => setShowCreateRoomModal(true)}
                  className="text-pink-400 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {rooms.map(room => (
                <button
                  key={room}
                  onClick={() => changeRoom(room)}
                  className={`w-full text-left px-3 py-3 rounded-md transition-all flex items-center ${
                    activeRoom === room 
                      ? 'bg-gradient-to-r from-purple-100/40 to-pink-100/40 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-600 dark:text-purple-300 border-l-4 border-pink-400 shadow-lg shadow-purple-500/10'
                      : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:shadow-md hover:shadow-purple-500/5'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium mr-3 neon-box"
                       style={{
                         background: `linear-gradient(135deg, ${['#8921C2', '#FE39A4', '#25CDF8', '#53E8D4'][Math.floor(Math.random() * 4)]}, ${['#FE39A4', '#25CDF8', '#53E8D4', '#8921C2'][Math.floor(Math.random() * 4)]})`
                       }}>
                    {room.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">#{room}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">5 members</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300 px-2 py-2">ONLINE USERS</h3>
              {users.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex flex-col items-center p-3 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                      <Avatar 
                        username={user.username} 
                        avatarIndex={user.avatarIndex} 
                        size="lg"
                        className="mb-2"
                      />
                      <div className="text-center">
                      <div className={`text-sm font-medium truncate w-full ${
  user.username === username ? "text-pink-500 dark:text-pink-400" : "text-gray-700 dark:text-gray-300"
}`}>
  {user.username === username ? "You" : user.username}
</div>
                        <div className="flex items-center justify-center mt-1">
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            user.status === 'online' ? 'bg-green-500 pulse' :
                            user.status === 'idle' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {user.status === 'online' ? 'Online' : 
                             user.status === 'idle' ? 'Idle' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm px-3">No other users online</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-h-0">

        {/* Chat Header */}
        <div className="bg-gradient-to-r from-purple-900/80 to-pink-800/80 p-3 flex items-center justify-between backdrop-blur-sm border-b border-purple-500/30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowSidebar(true)}
              className="md:hidden mr-1 p-1.5 rounded-full hover:bg-purple-800/30 text-white"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium mr-2 neon-box"
                   style={{
                     background: `linear-gradient(135deg, ${['#8921C2', '#FE39A4', '#25CDF8', '#53E8D4'][Math.floor(Math.random() * 4)]}, ${['#FE39A4', '#25CDF8', '#53E8D4', '#8921C2'][Math.floor(Math.random() * 4)]})`
                   }}>
                {activeRoom.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-medium text-white">#{activeRoom}</h1>
                {typingUsers.length > 0 && (
                  <span className="text-xs text-pink-300 italic">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2">
              <Avatar 
                username={username} 
                avatarIndex={avatarIndex} 
                size="sm"
              />
              <span className="text-sm text-white/90">{username}</span>
            </div>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hidden bg-white dark:bg-slate-900">
       
        {messages.map((msg) => (
  msg.isSystem ? (
    <div key={msg.id} className="text-center my-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 italic px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full inline-block">
        {msg.message}
      </span>
    </div>
            ) : (
              <div 
                key={msg.id} 
                data-message-id={msg.id}
                className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'} group`}
                onMouseEnter={() => handleMessageHover(msg.id)}
                onMouseLeave={handleMessageLeave}
              >
                {msg.username !== username && msg.username !== 'System' && (
                  <div className="flex-shrink-0 mr-2 self-end">
                    <Avatar 
                      username={msg.username} 
                      avatarIndex={users.find(u => u.username === msg.username)?.avatarIndex} 
                      size="sm"
                    />
                  </div>
                )}
                
                <div className={`max-w-xs md:max-w-md relative ${
                  msg.username === username ? 'order-1' : 'order-2'
                } message-container`}>
                  {/* Reply indicator */}
                  {msg.replyTo && (
                    <div className={`text-xs mb-1 px-2 py-1 rounded border-l-2 ${
                      msg.username === username 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' 
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    }`}>
                      <div className="font-medium truncate">
                        Replying to {findMessageById(msg.replyTo)?.username || 'deleted message'}
                      </div>
                      <div className="truncate italic">
                        {findMessageById(msg.replyTo)?.message || 'Message not available'}
                      </div>
                    </div>
                  )}
                  
                  {/* Message container */}
                  <div className={`px-3 py-2 rounded-lg ${
                    msg.username === username 
                      ? 'bg-teal-100 dark:bg-teal-800 text-gray-800 dark:text-white rounded-br-none' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-none shadow-sm'
                  }`}>
                    {msg.username !== 'System' && msg.username !== username && (
                      <div className={`font-medium text-sm mb-0.5 ${
                        msg.username === username ? 'text-teal-700 dark:text-teal-200' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {msg.username}
                      </div>
                    )}
                    
                    {msg.type === 'file' ? (
                      <FileMessage message={msg} isOwnMessage={msg.username === username} />
                    ) : (
                      <p className="break-words">{msg.message}</p>
                    )}
                    
                    <div className={`text-xs flex items-center justify-end mt-1 ${
                      msg.username === username ? 'text-teal-700 dark:text-teal-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                      {msg.edited && (
                        <span className="ml-1.5 italic">(edited)</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Message actions button (shows on hover) */}
                  {msg.username !== 'System' && hoveredMessage === msg.id && (
                    <button
                      onClick={(e) => toggleMessageMenu(msg.id, e)}
                      className={`absolute ${msg.username === username ? 'left-0 -ml-8' : 'right-0 -mr-8'} top-1/2 transform -translate-y-1/2 
                        p-1 rounded-full bg-white dark:bg-slate-700 shadow-md text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white
                        transition-opacity duration-200`}
                    >
                      <ChevronDown size={16} />
                    </button>
                  )}
                  
                  {/* Message menu (shows when arrow is clicked) */}
                  {activeMessageMenu === msg.id && (
                    <div 
                      ref={messageMenuRef}
                      className={`absolute ${msg.username === username ? 'left-0 -ml-48' : 'right-0 -mr-48'} top-50 mt-0 z-50 
                        bg-white dark:bg-slate-800 rounded-lg shadow-lg py-1 w-62 border dark:border-slate-700`}
                    >
                      {/* Reactions section with + button */}
                      <div className="p-2 border-b dark:border-slate-700">
                        <div className="flex justify-between items-center px-2">
                          <div className="flex space-x-1">
                            {quickReactions.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReaction(msg.id, emoji)
                                }}
                                className="text-xl hover:bg-gray-100 dark:hover:bg-slate-700 p-1 rounded-full transition-colors"
                                style={{ fontSize: '20px' }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEmojiPalette(msg.id, e)
                            }}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 plus-reaction-button"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <button 
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-gray-700 dark:text-gray-300"
                        onClick={() => copyMessageText(msg.message)}
                      >
                        <Copy size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
                        Copy
                      </button>
                      
                      <button 
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-gray-700 dark:text-gray-300"
                        onClick={() => handleReply(msg)}
                      >
                        <Reply size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
                        Reply
                      </button>
                      
                      {/* Only show edit/delete for own messages */}
                      {msg.username === username && (
                        <>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-gray-700 dark:text-gray-300"
                            onClick={() => startEditing(msg)}
                          >
                            <Edit size={16} className="mr-3 text-gray-500 dark:text-gray-400" />
                            Edit
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center text-red-600"
                            onClick={() => deleteMessage(msg.id)}
                          >
                            <Trash2 size={16} className="mr-3" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Emoji palette */}
                  {showEmojiPalette === msg.id && (
                    <div 
                      ref={emojiPaletteRef}
                      className={`absolute ${msg.username === username ? 'left-0' : 'right-0'} top-full mb-2 z-50`}
                      style={{ 
                        transform: msg.username === username ? 'translateX(-10px)' : 'translateX(300px)',
                        left: msg.username === username ? '-300px' : 'auto',
                        right: msg.username !== username ? '0px' : 'auto'
                      }}
                    >
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => {
                          handleReaction(msg.id, emojiData.emoji)
                          setShowEmojiPalette(null)
                        }}
                        width={300}
                        height={350}
                        previewConfig={{ showPreview: false }}
                        searchDisabled
                        skinTonesDisabled
                      />
                    </div>
                  )}

                  {/* Message Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex mt-1 gap-1 flex-wrap ${
                      msg.username === username ? 'justify-end' : 'justify-start'
                    }`}>
                      {Object.entries(msg.reactions).map(([emoji, data]) => (
                        <button 
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`text-xs rounded-full px-2 py-0.5 flex items-center transition-colors shadow-sm ${
                            data.users.includes(username)
                              ? 'bg-teal-500 dark:bg-teal-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                          }`}
                        >
                          <span className="mr-1" style={{ fontSize: '16px' }}>{emoji}</span>
                          <span>{data.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Read receipts for own messages */}
                  {msg.username === username && readReceipts[msg.id]?.length > 0 && (
                    <div className="flex justify-end mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <svg className="w-3 h-3 mr-0.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        Seen by {readReceipts[msg.id].length} {readReceipts[msg.id].length === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
          {/* Reply preview */}
          {replyingTo && (
            <div className="relative bg-gradient-to-r from-purple-100/30 to-pink-100/30 dark:from-purple-900/30 dark:to-pink-900/30 rounded-t-lg p-2 mb-2 border-l-4 border-pink-400">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-pink-500 dark:text-pink-300 flex items-center">
                  <Reply size={14} className="mr-1" />
                  Replying to {replyingTo.username}
                </div>
                <button 
                  onClick={cancelReply}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">
                {replyingTo.message}
              </div>
            </div>
          )}
          
          {/* Edit message indicator */}
          {editingMessageId && (
            <div className="absolute -top-7 left-3 text-xs bg-gradient-to-r from-yellow-100/50 to-amber-100/50 dark:from-yellow-900/50 dark:to-amber-900/50 p-1 px-2 rounded-full text-amber-600 dark:text-amber-300 flex items-center shadow">
              <Edit size={12} className="mr-1.5" />
              Editing message
              <button 
                onClick={cancelEditing}
                className="ml-2 text-pink-500 dark:text-pink-300 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="flex space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              disabled={uploading}
            >
              {uploading ? (
                <svg className="animate-spin h-5 w-5 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Paperclip size={20} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            
            <div className="relative flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  handleTyping(e.target.value.length > 0)
                }}
                onBlur={() => handleTyping(false)}
                ref={messageInputRef}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 neon-input"
                placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Type a message..."}
              />
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
                aria-label="emoji"
              >
                <Smile size={20} />
              </button>
              
              {/* Emoji Picker */}
              {showEmojis && (
                <div className="absolute bottom-14 right-0 z-10" ref={emojiPickerRef}>
                  <EmojiPicker 
                    onEmojiClick={insertEmoji}
                    width={300}
                    height={350}
                    previewConfig={{ showPreview: false }}
                    searchDisabled
                    skinTonesDisabled
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-pink-500 text-white p-3 rounded-full hover:shadow-lg hover:shadow-pink-500/30 transition-all neon-button"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {showSidebar && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
  
      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Create New Chat</h3>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter chat name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-700 dark:text-white mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateRoomModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-lg hover:bg-teal-700 dark:hover:bg-teal-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Change Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Change Your Avatar</h3>
            <AvatarSelector 
              selected={avatarIndex} 
              onSelect={handleAvatarChange}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}