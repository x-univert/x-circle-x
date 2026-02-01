import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
}

export const StarryBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    // Initialize stars
    const initStars = () => {
      const starCount = Math.floor((canvas.width * canvas.height) / 3000); // Density based on screen size
      starsRef.current = [];

      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }

      // Initialize shooting stars pool
      shootingStarsRef.current = Array(5).fill(null).map(() => ({
        x: 0,
        y: 0,
        length: 0,
        speed: 0,
        angle: 0,
        opacity: 0,
        active: false,
      }));
    };

    // Create a new shooting star
    const createShootingStar = () => {
      const inactiveStar = shootingStarsRef.current.find(s => !s.active);
      if (!inactiveStar) return;

      inactiveStar.x = Math.random() * canvas.width * 0.8;
      inactiveStar.y = Math.random() * canvas.height * 0.3;
      inactiveStar.length = Math.random() * 80 + 50;
      inactiveStar.speed = Math.random() * 15 + 10;
      inactiveStar.angle = Math.PI / 4 + (Math.random() * 0.3 - 0.15); // ~45 degrees with variation
      inactiveStar.opacity = 1;
      inactiveStar.active = true;
    };

    // Animation loop
    let lastShootingStarTime = 0;
    const animate = (time: number) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and animate stars
      starsRef.current.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;

        // Star glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 2
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
        gradient.addColorStop(0.5, `rgba(200, 200, 255, ${currentOpacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();
      });

      // Create shooting stars randomly
      if (time - lastShootingStarTime > 2000 + Math.random() * 4000) {
        createShootingStar();
        lastShootingStarTime = time;
      }

      // Draw and animate shooting stars
      shootingStarsRef.current.forEach(star => {
        if (!star.active) return;

        // Move shooting star
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        star.opacity -= 0.015;

        if (star.opacity <= 0 || star.x > canvas.width || star.y > canvas.height) {
          star.active = false;
          return;
        }

        // Draw shooting star trail
        const tailX = star.x - Math.cos(star.angle) * star.length;
        const tailY = star.y - Math.sin(star.angle) * star.length;

        const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, `rgba(200, 200, 255, ${star.opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${star.opacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(star.x, star.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: '#000000' }}
    />
  );
};

export default StarryBackground;
