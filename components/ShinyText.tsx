'use client';

import React, { useEffect, useState } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const [animationDelay, setAnimationDelay] = useState(0);
    const [animationDuration, setAnimationDuration] = useState(speed);

    useEffect(() => {
        if (!disabled) {
            // Generate random delay between 0-8 seconds for initial start
            const randomDelay = Math.random() * 8;
            setAnimationDelay(randomDelay);

            // Generate random duration between speed and speed * 1.5
            const randomDuration = speed + (Math.random() * speed * 0.5);
            setAnimationDuration(randomDuration);

            // Set up random re-triggering
            const scheduleNextAnimation = () => {
                // Random interval between 8-20 seconds
                const nextInterval = (8 + Math.random() * 12) * 1000;
                
                setTimeout(() => {
                    // Generate new random values
                    const newDelay = Math.random() * 2; // Shorter delay for subsequent animations
                    const newDuration = speed + (Math.random() * speed * 0.5);
                    
                    setAnimationDelay(newDelay);
                    setAnimationDuration(newDuration);
                    
                    // Schedule the next one
                    scheduleNextAnimation();
                }, nextInterval);
            };

            // Start the random scheduling after initial animation
            const initialTimeout = setTimeout(scheduleNextAnimation, (randomDelay + randomDuration) * 1000);

            return () => {
                clearTimeout(initialTimeout);
            };
        }
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
                animation: `shine ${animationDuration}s ease-in-out infinite`,
                animationDelay: `${animationDelay}s`,
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