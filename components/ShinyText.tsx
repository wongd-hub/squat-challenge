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
                    100% {
                        background-position: -80% 0;
                    }
                }
                .custom-shine-animation {
                    animation: customShine 2.4s ease-in-out;
                }
                @media (prefers-reduced-motion: reduce) {
                    .custom-shine-animation {
                        animation: none;
                        background-position: 100% 0;
                    }
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

                // Remove the animation after it completes (2.4 seconds)
                setTimeout(() => {
                    setIsShining(false);
                    // Schedule the next shine
                    scheduleNextShine();
                }, 2400);
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
                    : 'linear-gradient(100deg, rgb(var(--foreground)) 40%, #d97757 50%, rgb(var(--foreground)) 60%)',
                backgroundSize: '250% 100%',
                WebkitBackgroundClip: disabled ? 'initial' : 'text',
                backgroundClip: disabled ? 'initial' : 'text',
                WebkitTextFillColor: disabled ? 'rgb(var(--muted-foreground))' : 'transparent',
                color: disabled ? 'rgb(var(--muted-foreground))' : 'transparent',
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText;
