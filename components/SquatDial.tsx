'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useHaptic } from 'use-haptic';
import StarBorder from './StarBorder';

interface SquatDialProps {
  onSquatsChange: (squats: number) => void;
  currentSquats: number;
  targetSquats: number;
  currentDay: number;
  compact?: boolean;
  hideTip?: boolean;
}

export function SquatDial({ onSquatsChange, currentSquats, targetSquats, currentDay, compact = false, hideTip = false }: SquatDialProps) {
  const [dialRotation, setDialRotation] = useState(0);
  const [tempSquats, setTempSquats] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const totalRotation = useRef(0);
  const cachedRect = useRef<DOMRect | null>(null);
  
  // Track previous squat count for sound triggers
  const prevSquatsRef = useRef(0);

  // Use haptic feedback hook
  const { triggerHaptic } = useHaptic();
  
  // Audio context for click sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    // Create audio context on first user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    // Add event listener for first user interaction
    document.addEventListener('pointerdown', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('pointerdown', initAudio);
      document.removeEventListener('click', initAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Generate satisfying chime sound with pitch based on squat count
  const playClickSound = useCallback((squatCount: number) => {
    if (!audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      
      // Extended pentatonic scale for wider range (C major pentatonic)
      const baseFrequencies = [
        196.00, // G3
        220.00, // A3
        261.63, // C4
        293.66, // D4  
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00, // A5
        1046.50, // C6
        1174.66, // D6
        1318.51, // E6
        1567.98  // G6
      ];
      
      // Map squat count to scale index (clamp to available range)
      // Range: -5 to +10 squats maps to indices 0-15 (each squat = one scale step)
      const scaleIndex = Math.max(0, Math.min(baseFrequencies.length - 1, squatCount + 5));
      const baseFreq = baseFrequencies[scaleIndex];
      
      // Create major triad based on the selected root note
      const frequencies = [
        baseFreq,           // Root
        baseFreq * 1.25,    // Major third (5/4 ratio)
        baseFreq * 1.5      // Perfect fifth (3/2 ratio)
      ];
      
      const now = ctx.currentTime;
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        // Bell-like waveform
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, now);
        
        // Staggered attack for arpeggio effect
        const startTime = now + (index * 0.02);
        const duration = 0.4 - (index * 0.05); // Higher notes fade faster
        
        // Quick attack, gentle decay for bell-like envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
      
      // Add a subtle lower harmonic for warmth (bass note)
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      
      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(baseFreq * 0.5, now); // One octave lower
      
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      bassOsc.start(now);
      bassOsc.stop(now + 0.3);
      
      // Master volume envelope - slightly louder for higher notes to maintain presence
      const volumeBoost = 1 + (scaleIndex * 0.02); // Gradual volume increase with pitch
      masterGain.gain.setValueAtTime(0.8 * volumeBoost, now);
      masterGain.gain.exponentialRampToValueAtTime(0.1, now + 0.4);
      
    } catch (error) {
      // Silently fail if audio context issues
    }
  }, []);

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
    
    // Cache the rect to avoid repeated calculations
    const rect = dialRef.current.getBoundingClientRect();
    cachedRect.current = rect;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    isDragging.current = true;
    lastAngle.current = getAngleFromPoint(centerX, centerY, clientX, clientY);
    
    // Initialize audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [getAngleFromPoint]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current || !cachedRect.current) return;
    
    // Use cached rect instead of calling getBoundingClientRect again
    const rect = cachedRect.current;
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
    
    // Apply limits: can't go below 0 total squats, can't exceed target
    const newTotal = currentSquats + squats;
    const maxSquats = targetSquats - currentSquats; // Maximum squats we can add
    const minSquats = -currentSquats; // Maximum squats we can remove (to reach 0)
    
    // Clamp tempSquats to valid range
    const clampedSquats = Math.max(minSquats, Math.min(maxSquats, squats));
    
    // Check if we crossed an integer boundary and play click sound
    if (clampedSquats !== prevSquatsRef.current && isDragging.current) {
      playClickSound(clampedSquats);
      prevSquatsRef.current = clampedSquats;
    }
    
    setTempSquats(clampedSquats);
    
    // If we hit a limit, adjust the rotation to match
    if (clampedSquats !== squats) {
      const clampedRotation = clampedSquats * 36;
      totalRotation.current = clampedRotation;
      setDialRotation(clampedRotation);
    }
    
    lastAngle.current = currentAngle;
  }, [getAngleFromPoint, calculateSquats, currentSquats, targetSquats, playClickSound]);

  const handleEnd = useCallback(() => {
    isDragging.current = false;
    cachedRect.current = null; // Clear cached rect
    prevSquatsRef.current = 0; // Reset squat tracking
  }, []);

  // Unified pointer events instead of separate mouse/touch
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      handleMove(e.clientX, e.clientY);
    }
  }, [handleMove]);

  // Unified pointer events instead of separate mouse/touch
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      handleEnd();
    }
  }, [handleEnd]);

  // Global event listeners for pointer events
  useEffect(() => {
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const bankSquats = () => {
    if (tempSquats !== 0) {
      // Trigger haptic feedback for banking action
      const triggerHapticFeedback = () => {
        // Detect platform and use appropriate haptic method
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
          // iOS Safari 18.0+ with use-haptic library
          try {
            triggerHaptic();
          } catch (error) {
            console.log('iOS haptic failed:', error);
          }
                 } else {
           // Android/Chrome and other browsers - use navigator.vibrate
           if (navigator.vibrate) {
             // Success pattern: short-long-short vibration
             navigator.vibrate([50, 30, 100]);
           }
         }
      };
      
      triggerHapticFeedback();
      
      const newTotal = currentSquats + tempSquats;
      onSquatsChange(newTotal);
      setTempSquats(0);
      setDialRotation(0);
      totalRotation.current = 0;
    }
  };

  // Check if target is reached
  const isTargetReached = currentSquats >= targetSquats;
  const canBankSquats = tempSquats !== 0 && (!isTargetReached || tempSquats < 0);

  const progressPercentage = Math.abs(tempSquats / 10) * 100; // Progress for current 10-squat cycle
  const dialSize = compact ? 'w-48 h-48' : 'w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80';
  const innerDialSize = compact ? 'w-40 h-40' : 'w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64';

  // Determine colors based on positive/negative
  const isNegative = tempSquats < 0;

  // Calculate stroke-dashoffset for proper direction
  const strokeDashoffset = isNegative 
    ? 282.7 + (progressPercentage * 2.827) // For negative, increase offset to go counterclockwise
    : 282.7 - (progressPercentage * 2.827); // For positive, decrease offset to go clockwise

  return (
    <div className="flex flex-col items-center justify-center px-4 pt-8 pb-4" style={{ contain: 'layout style paint' }}>
      {/* Dial Container */}
      <div className="relative mb-8" style={{ contain: 'layout' }}>
        {/* Outer Ring */}
        <div 
          className={`${dialSize} rounded-full glass-strong shadow-2xl flex items-center justify-center relative`}
          style={{ contain: 'strict', willChange: 'auto' }}
        >
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ pointerEvents: 'none' }}>
            <defs>
              {/* Purple gradient for positive progress */}
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9a8d4" /> {/* from-pink-300 */}
                <stop offset="50%" stopColor="#c4b5fd" /> {/* via-purple-300 */}
                <stop offset="100%" stopColor="#818cf8" /> {/* to-indigo-400 */}
              </linearGradient>
              {/* Alternative gradient for better circular effect */}
              <linearGradient id="purpleGradientCircular" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f9a8d4" />
                <stop offset="33%" stopColor="#c4b5fd" />
                <stop offset="66%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              {/* Orange to rose gradient for negative progress */}
              <linearGradient id="orangeRoseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fb923c" /> {/* from-orange-400 */}
                <stop offset="100%" stopColor="#fb7185" /> {/* to-rose-400 */}
              </linearGradient>
            </defs>
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
            {tempSquats !== 0 && (
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isNegative ? 'url(#orangeRoseGradient)' : 'url(#purpleGradientCircular)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="282.7"
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-out"
              />
            )}
          </svg>

          {/* Inner Dial */}
          <div
            ref={dialRef}
            className={`${innerDialSize} rounded-full glass cursor-grab active:cursor-grabbing select-none flex items-center justify-center relative`}
            style={{
              transform: `translate3d(0, 0, 0) rotate(${dialRotation}deg)`,
              contain: 'layout style paint',
              willChange: 'transform',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              msUserSelect: 'none',
            }}
            onPointerDown={handlePointerDown}
          >
            {/* Center Number - Fixed position to prevent rotation */}
            <div 
              className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-4xl' : 'text-4xl sm:text-5xl md:text-6xl'} font-bold ${isNegative ? 'text-destructive' : 'text-foreground'}`}
              style={{
                transform: `rotate(${-dialRotation}deg)`, // Counter-rotate to keep number upright
              }}
            >
              {tempSquats > 0 ? `+${tempSquats}` : tempSquats}
            </div>

            {/* New Circular Indicator */}
            <div 
              className={`absolute ${compact ? 'w-6 h-6' : 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8'} flex items-center justify-center`}
              style={{
                top: compact ? '4px' : '4px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {/* Outer circle with border */}
              <div 
                className={`${compact ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7'} rounded-full border-2 border-white shadow-lg flex items-center justify-center`}
                style={{ 
                  background: isNegative ? 'linear-gradient(135deg, #fb923c 0%, #fb7185 100%)' : 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 50%, #818cf8 100%)',
                }}
              >
                {/* Inner dot */}
                <div 
                  className={`${compact ? 'w-2 h-2' : 'w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3'} rounded-full bg-white shadow-sm`}
                />
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
        {isTargetReached && (
          <p className={`${compact ? 'text-sm' : 'text-base'} text-green-600 dark:text-green-400 mt-2 font-semibold`}>
            {targetSquats === 0 ? '☕ Rest day! No squats needed today.' : '🎉 Target reached! Great job!'}
          </p>
        )}
        {!compact && !hideTip && (
          <p className={`text-sm text-muted-foreground mt-3 px-4`}>
            💡 <strong>Tip:</strong> Use the progress chart below to edit and bank squats for previous days
          </p>
        )}
      </div>

      {/* Bank Button with StarBorder */}
      <StarBorder
        as="button"
        className={`${compact ? 'w-48 h-12' : 'w-52 h-12 sm:w-56 sm:h-12 md:w-64 md:h-14'} ${!canBankSquats ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        color="cyan"
        speed="5s"
        onClick={bankSquats}
        disabled={!canBankSquats}
      >
        <span className={`${compact ? 'text-base' : 'text-base sm:text-lg md:text-lg'} font-medium`}>
          {isNegative ? 'Remove Squats' : isTargetReached ? (targetSquats === 0 ? 'Enjoying Rest Day' : 'Target Reached!') : 'Bank Squats'}
        </span>
      </StarBorder>


    </div>
  );
}
