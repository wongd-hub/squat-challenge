import React, { useEffect, useState } from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, disabled = false, speed = 5, className = '' }) => {
    const [isShining, setIsShining] = useState(false);

    useEffect(() => {
        // Inject custom animation styles
        const styleId = 'shiny-text-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes customShine {
                    0% {
                        background-position: 200% 0;
                    }
                    40% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
                .custom-shine-animation {
                    animation: customShine 4s linear;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (disabled) return;

        const scheduleNextShine = () => {
            // Random interval between 5-10 seconds (5000-10000ms)
            const randomDelay = Math.random() * 5000 + 5000;
            
            setTimeout(() => {
                setIsShining(true);
                
                // Remove the animation after it completes (4 seconds)
                setTimeout(() => {
                    setIsShining(false);
                    // Schedule the next shine
                    scheduleNextShine();
                }, 4000);
            }, randomDelay);
        };

        // Start the first shine cycle
        scheduleNextShine();
    }, [disabled]);

    return (
        <div
            className={`inline-block ${isShining ? 'custom-shine-animation' : ''} ${className}`}
            style={{
                backgroundImage: disabled 
                    ? 'none'
                    : 'linear-gradient(110deg, hsl(var(--muted-foreground)) 45%, #fff 55%, hsl(var(--muted-foreground)) 65%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: disabled ? 'initial' : 'text',
                backgroundClip: disabled ? 'initial' : 'text',
                WebkitTextFillColor: disabled ? 'hsl(var(--muted-foreground))' : 'transparent',
                color: disabled ? 'hsl(var(--muted-foreground))' : 'transparent',
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText; 