// components/CloudBackground.jsx
import { useEffect, useRef } from 'react';
import './UsernameForm.css';

export default function CloudBackground() {
  const canvasRef = useRef(null);
  const cloudImages = [
    '/clouds/cloud1.png',
    '/clouds/cloud2.png',
    '/clouds/cloud3.png',
    '/clouds/cloud4.png',
    '/clouds/cloud5.png'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Cloud configurations
    const clouds = [];
    const neonColors = [
      '#8921C2', // Purple
      '#FE39A4', // Pink
      '#25CDF8', // Blue
      '#53E8D4', // Teal
      '#FFFDBB'  // Yellow
    ];

    // Load cloud images
    const images = [];
    let loadedImages = 0;
    
    cloudImages.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        loadedImages++;
        if (loadedImages === cloudImages.length) {
          initClouds();
          animate();
        }
      };
      img.src = src;
      images.push(img);
    });

    function initClouds() {
      for (let i = 0; i < 6; i++) {
        const imgIndex = i % images.length;
        const scale = 0.5 + Math.random() * 0.5;
        clouds.push({
          img: images[imgIndex],
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.6,
          width: images[imgIndex].width * scale,
          height: images[imgIndex].height * scale,
          speed: 0.2 + Math.random() * 0.3,
          color: neonColors[i % neonColors.length],
          opacity: 0.6 + Math.random() * 0.3,
          pulseSpeed: 0.002 + Math.random() * 0.003
        });
      }
    }

    function drawCloud(cloud) {
      // Save context state
      ctx.save();
      
      // Set glow effect
      ctx.shadowColor = cloud.color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = cloud.opacity;
      
      // Draw cloud image
      ctx.drawImage(
        cloud.img, 
        cloud.x, 
        cloud.y, 
        cloud.width, 
        cloud.height
      );
      
      // Restore context
      ctx.restore();
    }

    function animate() {
      // Clear canvas with a semi-transparent background for motion blur effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw clouds
      clouds.forEach(cloud => {
        // Update position
        cloud.x += cloud.speed;
        
        // Reset position if off screen
        if (cloud.x > canvas.width + cloud.width) {
          cloud.x = -cloud.width;
          cloud.y = Math.random() * canvas.height * 0.6;
        }
        
        // Update opacity for pulsing effect
        cloud.opacity = 0.6 + Math.sin(Date.now() * cloud.pulseSpeed) * 0.3;
        
        drawCloud(cloud);
      });
      
      requestAnimationFrame(animate);
    }

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
    />
  );
}