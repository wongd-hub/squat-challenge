import React from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const animationDuration = `${speed}s`;

    if (disabled) {
        return (
            <div className={`inline-block ${className}`}>
                {text}
            </div>
        );
    }

    return (
        <div
            className={`inline-block animate-shine ${className}`}
            style={{
                background: 'linear-gradient(120deg, hsl(var(--muted-foreground)) 40%, rgba(255, 255, 255, 0.9) 50%, hsl(var(--muted-foreground)) 60%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                animationDuration: animationDuration,
                // Fallback for browsers that don't support background-clip: text
                fallbacks: {
                    color: 'hsl(var(--muted-foreground))'
                }
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText;