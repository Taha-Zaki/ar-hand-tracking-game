
import React from 'react';

interface CrosshairProps {
  x: number;
  y: number;
  isPinching: boolean;
}

const Crosshair: React.FC<CrosshairProps> = ({ x, y, isPinching }) => {
  return (
    <div 
      className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${isPinching ? 0.8 : 1})` 
      }}
    >
      <div className={`relative flex items-center justify-center w-16 h-16 border-2 rounded-full transition-colors duration-200 ${isPinching ? 'border-red-500 bg-red-500/20' : 'border-[#b4ff32] bg-white/5'}`}>
        <div className="absolute w-6 h-0.5 bg-current -left-2" />
        <div className="absolute w-6 h-0.5 bg-current -right-2" />
        <div className="absolute w-0.5 h-6 bg-current -top-2" />
        <div className="absolute w-0.5 h-6 bg-current -bottom-2" />
        <div className={`w-1 h-1 rounded-full ${isPinching ? 'bg-red-400' : 'bg-white'}`} />
      </div>
    </div>
  );
};

export default Crosshair;
