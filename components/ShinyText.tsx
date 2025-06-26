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
    const intervalRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (disabled) return;

        const scheduleShine = () => {
            // Clear any existing timeouts
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearTimeout(intervalRef.current);

            // Random delay between 8-20 seconds for next shine
            const randomDelay = (8 + Math.random() * 12) * 1000;
            
            timeoutRef.current = setTimeout(() => {
                // Start shining
                setIsShining(true);
                
                // Stop shining after the animation duration (fixed 6 seconds)
                setTimeout(() => {
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
            setTimeout(() => {
                setIsShining(false);
                // Start the regular scheduling
                scheduleShine();
            }, 6000);
        }, initialDelay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearTimeout(intervalRef.current);
        };
    }, [disabled, speed]);

    if (disabled) {
        return (
            <div className={`inline-block ${className}`}>
                {text}
            </div>
        );
    }

    return (
        <div
            className={`inline-block ${className}`}
            style={{
                background: 'linear-gradient(120deg, hsl(var(--muted-foreground)) 30%, rgba(255, 255, 255, 0.9) 50%, hsl(var(--muted-foreground)) 70%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animation: isShining ? 'shine 6s linear' : 'none', // Fixed 6-second duration
                backgroundPosition: isShining ? '-200% 0' : '200% 0',
            }}
        >
            {text}
            <style jsx>{`
                @keyframes shine {
                    0% { 
                        background-position: 200% 0;
                    }
                    100% { 
                        background-position: -200% 0;
                    }
                }
                
                @supports not (-webkit-background-clip: text) {
                    div {
                        color: hsl(var(--muted-foreground)) !important;
                        background: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ShinyText;