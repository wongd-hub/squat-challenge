'use client';

import React, { useEffect, useState, useRef } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 6, className = '' }) => {
    const [isShining, setIsShining] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const animationTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (disabled) return;

        const scheduleShine = () => {
            // Clear any existing timeouts
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);

            // Random delay between 8-20 seconds for next shine
            const randomDelay = (8 + Math.random() * 12) * 1000;
            
            timeoutRef.current = setTimeout(() => {
                // Start shining
                setIsShining(true);
                
                // Stop shining after the animation duration (fixed 6 seconds)
                animationTimeoutRef.current = setTimeout(() => {
                    setIsShining(false);
                    // Schedule next shine immediately after this one ends
                    scheduleShine();
                }, 6000); // Fixed 6-second animation duration
                
            }, randomDelay);
        };

        // Start the first shine after initial random delay (0-8 seconds)
        const initialDelay = Math.random() * 8000;
        timeoutRef.current = setTimeout(() => {
            setIsShining(true);
            animationTimeoutRef.current = setTimeout(() => {
                setIsShining(false);
                // Start the regular scheduling
                scheduleShine();
            }, 6000);
        }, initialDelay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        };
    }, [disabled]);

    if (disabled) {
        return (
            <span className={className}>
                {text}
            </span>
        );
    }

    return (
        <span
            className={`inline-block ${className} ${isShining ? 'animate-shine' : ''}`}
            style={{
                background: isShining 
                    ? 'linear-gradient(110deg, hsl(var(--muted-foreground)) 45%, rgba(255, 255, 255, 0.8) 50%, hsl(var(--muted-foreground)) 55%)'
                    : 'transparent',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: isShining ? 'text' : 'unset',
                backgroundClip: isShining ? 'text' : 'unset',
                color: isShining ? 'transparent' : 'hsl(var(--muted-foreground))',
                transition: 'all 0.3s ease',
            }}
        >
            {text}
        </span>
    );
};

export default ShinyText;