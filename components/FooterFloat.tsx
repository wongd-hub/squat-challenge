"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const FooterFloat: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const charElements = el.querySelectorAll(".float-char");

    gsap.set(charElements, {
      opacity: 0,
      yPercent: 100,
      scaleY: 2,
      scaleX: 0.5,
      transformOrigin: "50% 0%"
    });

    gsap.to(charElements, {
      duration: 1,
      ease: "back.inOut(2)",
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      scaleX: 1,
      stagger: 0.03,
      scrollTrigger: {
        trigger: el,
        start: "top bottom-=100px",
        end: "bottom center",
        toggleActions: "play none none reverse",
        // markers: true, // Uncomment to debug
      },
    });
  }, []);

  const renderText = (text: string, className = "") => {
    return text.split("").map((char, index) => (
      <span 
        key={`${text}-${index}`} 
        className={`float-char inline-block ${className}`}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  return (
    <footer className="py-24 text-center">
      <div 
        ref={containerRef}
        className="overflow-hidden mb-16"
      >
        <div className="text-[clamp(1.2rem,3vw,2rem)] leading-[1.5] text-muted-foreground">
          {/* "made by " */}
          {renderText("made by ")}
          
          {/* "the herd" with gradient */}
          <Link 
            href="https://www.herdmentality.xyz/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity"
          >
            {renderText("the herd").map((char, index) => (
              <span 
                key={index} 
                className="float-char inline-block text-purple-600 dark:text-purple-400"
              >
                {char}
              </span>
            ))}
          </Link>
          
          {/* space */}
          {renderText(" ")}
          
          {/* Ram emoji as single link */}
          <Link 
            href="https://www.herdmentality.xyz/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors no-underline hover:scale-110 inline-block transform"
          >
            <span className="float-char inline-block">🐏</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default FooterFloat; 