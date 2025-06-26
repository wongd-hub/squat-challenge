'use client';

import React, { useEffect, useState, useRef } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const [isShining, setIsShining] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const intervalRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (disabled) return;

        const scheduleShine = () => {
            // Clear any existing timeouts
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearTimeout(intervalRef.current);

            // Random delay between 0-8 seconds for initial start
            const randomDelay = Math.random() * 8000;
            
            timeoutRef.current = setTimeout(() => {
                // Start shining
                setIsShining(true);
                
                // Stop shining after the animation duration
                setTimeout(() => {
                    setIsShining(false);
                }, speed * 1000);
                
                // Schedule next shine (8-20 seconds)
                const nextInterval = (8 + Math.random() * 12) * 1000;
                intervalRef.current = setTimeout(scheduleShine, nextInterval);
            }, randomDelay);
        };

        // Start the scheduling
        scheduleShine();

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
            className={`inline-block ${className} ${isShining ? 'animate-shine' : ''}`}
            style={{
                background: 'linear-gradient(120deg, hsl(var(--muted-foreground)) 30%, rgba(255, 255, 255, 0.9) 50%, hsl(var(--muted-foreground)) 70%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animationDuration: `${speed}s`,
                // Fallback for browsers that don't support background-clip: text
            }}
        >
            {text}
            <style jsx>{`
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