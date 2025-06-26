import React, { useState, useEffect } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 4, className = '' }) => {
    const [isShining, setIsShining] = useState(false);

    useEffect(() => {
        if (disabled) return;

        // Start the shine effect immediately
        setIsShining(true);

        // Set up interval to trigger shine every 3 seconds
        const interval = setInterval(() => {
            setIsShining(false);
            // Small delay before starting the next shine
            setTimeout(() => setIsShining(true), 100);
        }, 3000);

        return () => clearInterval(interval);
    }, [disabled]);

    const animationDuration = `${speed}s`;

    return (
        <div
            className={`inline-block ${className}`}
            style={{
                background: isShining && !disabled 
                    ? 'linear-gradient(120deg, currentColor 40%, rgba(255, 255, 255, 0.9) 50%, currentColor 60%)'
                    : 'currentColor',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animation: isShining && !disabled ? `shine ${animationDuration} ease-in-out` : 'none',
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText;