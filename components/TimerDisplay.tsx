
import React from 'react';
import { TimerMode } from '../types';

interface TimerDisplayProps {
  timeRemaining: number;
  totalDuration: number;
  mode: TimerMode;
  isActive: boolean;
  color: string;
  darkMode?: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  timeRemaining, 
  totalDuration, 
  mode, 
  isActive,
  color,
  darkMode = false
}) => {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Calculate stroke offset based on percentage
  const progress = totalDuration > 0 ? timeRemaining / totalDuration : 0;
  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const modeText = {
    [TimerMode.WORK]: '专注工作',
    [TimerMode.SHORT_BREAK]: '休息一下',
    [TimerMode.MICRO_BREAK]: '眨眼放松'
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 transition-all duration-500"
        >
          {/* Background Ring */}
          <circle
            stroke={darkMode ? '#374151' : '#e5e7eb'}
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress Ring */}
          <circle
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear, stroke 1s ease' }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-6xl font-bold tracking-tighter" 
            style={{ color: isActive ? (darkMode ? '#f3f4f6' : '#1f2937') : '#9ca3af' }}
          >
            {formattedTime}
          </span>
          <span className="text-lg font-medium text-gray-500 mt-2 uppercase tracking-wide">
            {modeText[mode]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
