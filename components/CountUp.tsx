'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
  startOnView?: boolean;
}

export function CountUp({ 
  value, 
  duration = 2000, 
  className = '', 
  formatter = (val) => val.toString(),
  startOnView = true 
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Debug log
  console.log('CountUp component:', { value, hasStarted, displayValue });

  useEffect(() => {
    if (!startOnView) {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          console.log('CountUp element in view, starting animation for value:', value);
          startAnimation();
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, hasStarted, startOnView]);

  const startAnimation = () => {
    console.log('Starting CountUp animation from 0 to', value);
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        console.log('CountUp animation completed at value:', endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div ref={elementRef} className={className}>
      {formatter(displayValue)}
    </div>
  );
}