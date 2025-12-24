
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initHandTracking, PINCH_THRESHOLD, calculateDistance2D } from './services/handTracking';
import Crosshair from './components/Crosshair';
import GameScene from './components/GameScene';
import { Point } from './types/game';

// تولید صدای شلیک لیزری
const playShootSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [score, setScore] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const handTrackerRef = useRef<any>(null);
  const lastFireRef = useRef(0);
  const lastHandPosRef = useRef<Point | null>(null);

  const SMOOTH_ALPHA = 0.15;
  const [displayCursor, setDisplayCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const handleHit = useCallback((count: number) => {
    setScore(s => s + count);
  }, []);

  useEffect(() => {
    let animationId: number;
    const startApp = async () => {
      try {
        const tracker = await initHandTracking();
        handTrackerRef.current = tracker;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 60 },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
            animationId = requestAnimationFrame(detectLoop);
          };
        }
      } catch (err: any) {
        setInitError(err.message || "Connection Error");
      }
    };

    const detectLoop = () => {
      const now = performance.now();
      if (videoRef.current && handTrackerRef.current && videoRef.current.readyState >= 2) {
        try {
          const results = handTrackerRef.current.detectForVideo(videoRef.current, now);
          if (results.landmarks && results.landmarks.length > 0) {
            setIsHandVisible(true);
            const landmarks = results.landmarks[0];
            const indexTip = landmarks[8]; 
            const thumbTip = landmarks[4];

            const screenX = (1 - indexTip.x) * window.innerWidth;
            const screenY = indexTip.y * window.innerHeight;

            // محاسبه سرعت حرکت دست برای جلوگیری از شلیک کاذب
            let handSpeed = 0;
            if (lastHandPosRef.current) {
              handSpeed = Math.sqrt(Math.pow(screenX - lastHandPosRef.current.x, 2) + Math.pow(screenY - lastHandPosRef.current.y, 2));
            }
            lastHandPosRef.current = { x: screenX, y: screenY };

            setDisplayCursor(prev => ({
              x: prev.x + (screenX - prev.x) * SMOOTH_ALPHA,
              y: prev.y + (screenY - prev.y) * SMOOTH_ALPHA
            }));

            const dist = calculateDistance2D(indexTip, thumbTip);
            const pinching = dist < PINCH_THRESHOLD;
            
            const currentTime = now / 1000;
            // فیلتر: شلیک فقط اگر دست خیلی سریع تکان نمی‌خورد (سرعت < 50 پیکسل بر فریم)
            if (pinching && (currentTime - lastFireRef.current) > 0.15 && handSpeed < 50) {
              setIsPinching(true);
              playShootSound();
              lastFireRef.current = currentTime;
              setTimeout(() => setIsPinching(false), 100);
            }
          } else {
            setIsHandVisible(false);
          }
        } catch (e) {}
      }
      animationId = requestAnimationFrame(detectLoop);
    };

    startApp();
    return () => cancelAnimationFrame(animationId);
  }, []);

  if (initError) return <div className="h-screen bg-black flex items-center justify-center text-red-500 font-mono">ERROR: {initError}</div>;

  return (
    <div className="relative w-screen h-screen bg-[#050505] overflow-hidden flex items-center justify-center">
      {/* دوربین کاملاً مخفی اما در حال کار */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0 scale-x-[-1]" playsInline muted />

      {!isReady ? (
        <div className="z-50 text-center animate-pulse">
          <div className="w-10 h-10 border-2 border-[#b4ff32] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-[10px] font-mono text-[#b4ff32] uppercase tracking-[0.5em]">Syncing Neural Data...</h1>
        </div>
      ) : (
        <>
          <GameScene handPos={displayCursor} fireTrigger={isPinching} onHit={handleHit} />
          
          <Crosshair x={displayCursor.x} y={displayCursor.y} isPinching={isPinching} />

          {/* UI مینیمال */}
          <div className="absolute top-12 left-12 z-20 font-mono">
            <div className="text-[9px] text-white/40 uppercase tracking-[0.3em] mb-2">Targeting System</div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isHandVisible ? 'bg-[#b4ff32] shadow-[0_0_10px_#b4ff32]' : 'bg-red-500'}`} />
              <span className="text-[10px] text-white/80">{isHandVisible ? 'LOCKED' : 'SEARCHING'}</span>
            </div>
          </div>

          <div className="absolute top-12 right-12 z-20 text-right font-mono">
            <div className="text-[9px] text-white/40 uppercase tracking-[0.3em] mb-1">Combat Score</div>
            <div className="text-4xl font-black text-[#b4ff32] italic">{score.toString().padStart(4, '0')}</div>
          </div>

          {/* فلش شلیک */}
          <div className={`absolute inset-0 pointer-events-none bg-white transition-opacity duration-75 ${isPinching ? 'opacity-5' : 'opacity-0'}`} />
        </>
      )}
    </div>
  );
};

export default App;
