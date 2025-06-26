'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface SquatDialProps {
  onSquatsChange: (squats: number) => void;
  currentSquats: number;
  targetSquats: number;
  currentDay: number;
  compact?: boolean;
}

export function SquatDial({ onSquatsChange, currentSquats, targetSquats, currentDay, compact = false }: SquatDialProps) {
  const [dialRotation, setDialRotation] = useState(0);
  const [tempSquats, setTempSquats] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const totalRotation = useRef(0);

  const calculateSquats = useCallback((rotation: number) => {
    return Math.floor(rotation / 36); // 360 degrees / 10 squats = 36 degrees per squat
  }, []);

  const getAngleFromPoint = useCallback((centerX: number, centerY: number, pointX: number, pointY: number) => {
    const deltaX = pointX - centerX;
    const deltaY = pointY - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // Normalize to 0-360, with 0 at top
    return angle;
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    isDragging.current = true;
    lastAngle.current = getAngleFromPoint(centerX, centerY, clientX, clientY);
  }, [getAngleFromPoint]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current || !dialRef.current) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const currentAngle = getAngleFromPoint(centerX, centerY, clientX, clientY);
    let angleDiff = currentAngle - lastAngle.current;
    
    // Handle angle wrap-around
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    
    totalRotation.current += angleDiff;
    
    setDialRotation(totalRotation.current);
    const squats = calculateSquats(totalRotation.current);
    setTempSquats(squats);
    
    lastAngle.current = currentAngle;
  }, [getAngleFromPoint, calculateSquats]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  // Global event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging.current) {
        handleMouseUp();
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const bankSquats = () => {
    if (tempSquats !== 0) {
      const newTotal = Math.max(0, currentSquats + tempSquats); // Prevent negative totals
      onSquatsChange(newTotal);
      setTempSquats(0);
      setDialRotation(0);
      totalRotation.current = 0;
    }
  };

  const progressPercentage = Math.abs(tempSquats / 10) * 100; // Progress for current 10-squat cycle
  const dialSize = compact ? 'w-48 h-48' : 'w-80 h-80';
  const innerDialSize = compact ? 'w-40 h-40' : 'w-64 h-64';

  // Determine colors based on positive/negative
  const isNegative = tempSquats < 0;
  const progressColor = isNegative ? 'hsl(var(--destructive))' : 'hsl(var(--chart-4))';
  const indicatorColor = isNegative ? 'hsl(var(--destructive))' : 'hsl(var(--chart-4))';

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Dial Container */}
      <div className="relative mb-8">
        {/* Outer Ring */}
        <div className={`${dialSize} rounded-full glass-strong shadow-2xl flex items-center justify-center relative`}>
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
              opacity="0.3"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={progressColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPercentage * 2.827} 282.7`}
              className="transition-all duration-300 ease-out"
            />
          </svg>

          {/* Inner Dial */}
          <div
            ref={dialRef}
            className={`${innerDialSize} rounded-full glass cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-center relative`}
            style={{
              transform: `rotate(${dialRotation}deg)`,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Center Number - Fixed position to prevent rotation */}
            <div 
              className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-4xl' : 'text-6xl'} font-bold ${isNegative ? 'text-destructive' : 'text-foreground'}`}
              style={{
                transform: `rotate(${-dialRotation}deg)`, // Counter-rotate to keep number upright
              }}
            >
              {tempSquats > 0 ? `+${tempSquats}` : tempSquats}
            </div>

            {/* Progress Indicator - Properly aligned */}
            <div 
              className={`absolute ${compact ? 'w-8 h-4' : 'w-12 h-6'} rounded-full flex items-center justify-center shadow-lg`}
              style={{
                top: compact ? '6px' : '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: indicatorColor,
              }}
            >
              <div className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded-full flex items-center justify-center shadow-inner`} style={{ background: 'hsl(var(--muted))' }}>
                <div className={`${compact ? 'w-1 h-1' : 'w-2 h-2'} rounded-full`} style={{ background: indicatorColor }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mb-6">
        <p className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-foreground mb-1`}>
          Already banked today:
        </p>
        <p className={`${compact ? 'text-base' : 'text-xl'} font-semibold text-foreground`}>
          {currentSquats} of {targetSquats}
        </p>
        {tempSquats !== 0 && (
          <p className={`${compact ? 'text-sm' : 'text-base'} ${isNegative ? 'text-destructive' : 'text-green-600 dark:text-green-400'} mt-2`}>
            {isNegative ? `Removing ${Math.abs(tempSquats)} squats` : `Adding ${tempSquats} squats`}
          </p>
        )}
      </div>

      {/* Bank Button */}
      <Button
        onClick={bankSquats}
        disabled={tempSquats === 0}
        className={`${compact ? 'w-48 h-12' : 'w-64 h-14'} glass-strong text-foreground rounded-full ${compact ? 'text-base' : 'text-lg'} font-medium shadow-lg hover:glass disabled:opacity-50 disabled:cursor-not-allowed ${
          isNegative ? 'border-destructive/50 hover:border-destructive' : ''
        }`}
      >
        {isNegative ? 'Remove Squats' : 'Bank Squats'}
      </Button>
    </div>
  );
}