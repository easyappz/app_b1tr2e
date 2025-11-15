import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const logicalWidth = 320;    // logical pixel resolution for crisp pixel-art
const logicalHeight = 240;

// helpers
const clamp = (v, min, max) => (v < min ? min : (v > max ? max : v));

const Game = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const keysRef = useRef({});
  const navigate = useNavigate();

  const [paused, setPaused] = useState(false);
  const [distance, setDistance] = useState(0); // meters
  const [best, setBest] = useState(() => {
    try {
      const v = sessionStorage.getItem('race_best');
      return v ? parseFloat(v) : 0;
    } catch (e) { return 0; }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // State
    let running = true;
    let last = performance.now();

    let carX = logicalWidth / 2; // x center
    const carY = logicalHeight - 40; // y fixed near bottom
    let carSpeed = 0;        // px/s in logical space
    let carAngle = 0;        // for slight visual tilt on turn

    const maxSpeed = 160;    // px/s
    const accel = 120;       // px/s^2
    const brake = 170;       // px/s^2
    const friction = 80;     // px/s^2 natural decel
    const turnRate = 2.2;    // px per frame translated to angle tilt

    // Road
    let worldY = 0;          // how far we've advanced (px)
    const roadWidth = 120;   // px
    const laneWidth = 8;     // px center line dash size

    const getRoadCenter = (y) => {
      // sinusoidal curve depending on world distance
      const t = y * 0.0025;
      return logicalWidth / 2 + Math.sin(t) * 40 + Math.sin(t * 0.37 + 1.2) * 18;
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'd' || e.key === 'Escape') {
        e.preventDefault();
      }
      if (e.key === ' ' || e.key === 'Escape') {
        // toggle pause
        setPaused((p) => !p);
        return;
      }
      keysRef.current[e.key] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const drawCar = (x, y) => {
      // simple pixel car (rectangle + nose) with angle tilt
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(carAngle * 0.05);
      // body
      ctx.fillStyle = '#ff2f6d';
      ctx.fillRect(-6, -10, 12, 20);
      // nose
      ctx.fillStyle = '#ffd1df';
      ctx.fillRect(-4, -12, 8, 2);
      // wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(-7, -8, 2, 6);
      ctx.fillRect(5, -8, 2, 6);
      ctx.fillRect(-7, 4, 2, 6);
      ctx.fillRect(5, 4, 2, 6);
      ctx.restore();
    };

    const drawHUD = () => {
      const kmh = Math.max(0, carSpeed) * 0.6; // scale to feel like km/h
      ctx.fillStyle = '#001a14';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(6, 6, 120, 42);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#00ffd1';
      ctx.font = '12px monospace';
      ctx.fillText(`СКОРОСТЬ: ${kmh.toFixed(0)} км/ч`, 10, 18);
      ctx.fillText(`ДИСТАНЦИЯ: ${(distance).toFixed(0)} м`, 10, 30);
      ctx.fillText(`РЕКОРД: ${(best).toFixed(0)} м`, 10, 42);

      if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        ctx.fillStyle = '#00ffd1';
        ctx.font = '16px monospace';
        ctx.fillText('Пауза (Пробел / Esc)', logicalWidth / 2 - 80, logicalHeight / 2);
      }
    };

    const step = () => {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000); // seconds, cap at 33ms
      last = now;

      if (!paused) {
        // input
        const up = keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W'];
        const down = keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S'];
        const left = keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A'];
        const right = keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D'];

        if (up) carSpeed += accel * dt;
        if (down) carSpeed -= brake * dt;

        // friction
        if (!up && carSpeed > 0) carSpeed = Math.max(0, carSpeed - friction * dt);
        if (!down && carSpeed < 0) carSpeed = Math.min(0, carSpeed + friction * dt);

        carSpeed = clamp(carSpeed, -30, maxSpeed);

        if (left) carX -= (1 + carSpeed / maxSpeed) * turnRate;
        if (right) carX += (1 + carSpeed / maxSpeed) * turnRate;
        carAngle += (right ? 1 : 0) - (left ? 1 : 0);
        carAngle *= 0.85; // damp angle

        // advance world by speed
        worldY += Math.max(0, carSpeed) * dt;

        // increase distance by forward movement (approximate px to meters)
        const d = Math.max(0, carSpeed) * dt * 0.8; // feel-good scale
        if (d > 0) {
          setDistance((prev) => {
            const cur = prev + d;
            if (cur > best) {
              setBest(cur);
              try { sessionStorage.setItem('race_best', String(cur)); } catch (e) {}
            }
            return cur;
          });
        }
      }

      // drawing
      // clear
      ctx.fillStyle = '#0b0d1a';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // starry background feel (simple dither)
      ctx.fillStyle = '#0f1230';
      for (let y = 0; y < logicalHeight; y += 16) {
        for (let x = (y % 32 === 0 ? 0 : 8); x < logicalWidth; x += 16) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // road rendering from bottom to top stripes
      for (let sy = 0; sy < logicalHeight; sy++) {
        const yWorld = worldY + sy;
        const center = getRoadCenter(yWorld);
        const leftEdge = center - roadWidth / 2;
        const rightEdge = center + roadWidth / 2;

        // road base
        ctx.fillStyle = '#2a2e52';
        ctx.fillRect(leftEdge, logicalHeight - sy, roadWidth, 1);

        // borders
        ctx.fillStyle = '#f7d54a';
        ctx.fillRect(leftEdge - 2, logicalHeight - sy, 2, 1);
        ctx.fillRect(rightEdge, logicalHeight - sy, 2, 1);

        // center dashed line
        if (Math.floor((yWorld / 6)) % 2 === 0) {
          ctx.fillStyle = '#d8e6ff';
          ctx.fillRect(center - 0.5, logicalHeight - sy, 1, 1);
        }
      }

      // collision with current road edges at car position line
      const centerNow = getRoadCenter(worldY + (logicalHeight - carY));
      const leftNow = centerNow - roadWidth / 2 + 2;
      const rightNow = centerNow + roadWidth / 2 - 2;

      if (carX < leftNow) { carX = leftNow; carSpeed *= 0.7; }
      if (carX > rightNow) { carX = rightNow; carSpeed *= 0.7; }

      // draw car
      drawCar(carX, carY);

      // HUD
      drawHUD();

      rafRef.current = requestAnimationFrame(step);
    };

    // Fit canvas to container while preserving pixel look (scale via CSS)
    const resize = () => {
      const parent = canvas.parentElement;
      const maxW = Math.min(parent.clientWidth, 900);
      const maxH = Math.min(parent.clientHeight, 760);
      const scale = Math.floor(Math.min(maxW / logicalWidth, maxH / logicalHeight));
      const cssW = Math.max(logicalWidth * (scale || 1), logicalWidth);
      const cssH = Math.max(logicalHeight * (scale || 1), logicalHeight);
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    };

    resize();
    window.addEventListener('resize', resize);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
    };
  }, [paused, best, distance]);

  return (
    <div className="game-screen" data-easytag="id1-react/src/components/Game/index.jsx">
      <div className="game-wrapper">
        <div className="game-topbar">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>В меню</button>
          <button className="btn btn-primary" onClick={() => setPaused((p) => !p)}>{paused ? 'Продолжить' : 'Пауза'}</button>
        </div>
        <div className="canvas-holder">
          <canvas ref={canvasRef} />
        </div>
        <div className="game-hint">Управление: Стрелки / WASD • Пауза: Пробел или Esc</div>
      </div>
    </div>
  );
};

export default Game;
