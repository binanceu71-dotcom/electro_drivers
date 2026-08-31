'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/ThemeContext';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  speedX: number;
  speedY: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
  thickness: number;
}

export default function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.03;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.03;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const isDark = theme === 'dark';
    const starCount = Math.min(140, Math.floor((width * height) / 9000));
    let stars: Star[] = [];

    const initStars = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.4 + 0.4,
          alpha: Math.random() * 0.7 + 0.2,
          baseAlpha: Math.random() * 0.6 + 0.2,
          speedX: (Math.random() - 0.5) * 0.1,
          speedY: (Math.random() - 0.5) * 0.1,
          twinkleSpeed: Math.random() * 0.015 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    initStars();

    const meteors: Meteor[] = [];
    const spawnMeteor = () => {
      if (meteors.length < 2) {
        meteors.push({
          x: Math.random() * width * 1.1,
          y: Math.random() * height * 0.35,
          length: Math.random() * 90 + 60,
          speed: Math.random() * 8 + 6,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.15,
          opacity: 0.9,
          active: true,
          thickness: Math.random() * 1.2 + 0.8
        });
      }
    };

    let meteorTimer = 0;

    const render = () => {
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Strict monochrome background
      if (isDark) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw stars (White/Gray in dark mode, Charcoal/Gray in light mode)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.twinklePhase += s.twinkleSpeed;
        const currentAlpha = s.baseAlpha + Math.sin(s.twinklePhase) * 0.25;

        s.x += s.speedX;
        s.y += s.speedY;

        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        const px = s.x - mouseRef.current.x * (s.size * 0.3);
        const py = s.y - mouseRef.current.y * (s.size * 0.3);

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        ctx.fillStyle = isDark ? '#ffffff' : '#262626';
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Meteors
      meteorTimer++;
      if (meteorTimer > 200 + Math.random() * 150) {
        spawnMeteor();
        meteorTimer = 0;
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        if (!m.active) continue;

        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.opacity -= 0.015;

        if (m.opacity <= 0 || m.x > width + 150 || m.y > height + 150) {
          m.active = false;
          meteors.splice(i, 1);
          continue;
        }

        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const meteorGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        if (isDark) {
          meteorGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          meteorGrad.addColorStop(1, `rgba(255, 255, 255, ${m.opacity})`);
        } else {
          meteorGrad.addColorStop(0, 'rgba(40, 40, 40, 0)');
          meteorGrad.addColorStop(1, `rgba(40, 40, 40, ${m.opacity})`);
        }

        ctx.save();
        ctx.lineWidth = m.thickness;
        ctx.strokeStyle = meteorGrad;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
