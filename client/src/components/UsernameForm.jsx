import { useState, useEffect } from 'react';
import AvatarSelector from './AvatarSelector';
import SmokeBackground from './SmokeBackground';
import './UsernameForm.css';

export default function UsernameForm({ onJoin }) {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  useEffect(() => {
    const ring = document.querySelector('.neon-ring');
    if (ring) {
      let rotation = 0;
      const animate = () => {
        rotation += 0.5;
        ring.style.transform = `rotate(${rotation}deg)`;
        requestAnimationFrame(animate);
      };
      animate();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onJoin(username, selectedAvatar);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-gray-900 overflow-x-hidden px-4">
      <SmokeBackground />

      {/* Neon ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="neon-ring absolute w-[600px] sm:w-[400px] md:w-[600px] lg:w-[800px] aspect-square rounded-full border-8 border-transparent" 
             style={{
               borderImage: 'linear-gradient(45deg, #8921C2, #FE39A4, #FFFDBB, #53E8D4, #25CDF8) 1',
               boxShadow: '0 0 60px rgba(137, 33, 194, 0.7), 0 0 100px rgba(254, 57, 164, 0.5)'
             }} />
      </div>

      {/* Form container */}
      <div className="relative bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md z-10 border border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-300">
          Strangely
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              Choose your avatar
            </label>
            <AvatarSelector selected={selectedAvatar} onSelect={setSelectedAvatar} />
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Enter your username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
              placeholder="Your username"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg hover:shadow-purple-500/30"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}
