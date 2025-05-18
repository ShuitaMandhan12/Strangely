// App.jsx
import { useState } from 'react';
import UsernameForm from './components/UsernameForm';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(() => {
    const savedAvatar = localStorage.getItem('avatarIndex');
    return savedAvatar ? parseInt(savedAvatar) : 0;
  });

  const handleJoin = (username, avatarIndex) => {
    setUsername(username);
    setAvatarIndex(avatarIndex);
    localStorage.setItem('avatarIndex', avatarIndex);
    setHasJoined(true);
  };

  return (
    <div className="min-h-screen w-full bg-gray-900">
      {!hasJoined ? (
        <UsernameForm onJoin={handleJoin} />
      ) : (
        <ChatRoom username={username} avatarIndex={avatarIndex} />
      )}
    </div>
  );
}

export default App;