import React, { useEffect, useRef, useState } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

interface ScrollLottieProps {
  animationPath?: string
  size?: number
  className?: string
}

export default function ScrollLottie({ 
  animationPath = '/squat-lottie.json',
  size = 32,
  className = ''
}: ScrollLottieProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [animationData, setAnimationData] = useState<any>(null)

  // Load animation data
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch(animationPath)
        const data = await response.json()
        setAnimationData(data)
      } catch (error) {
        console.error('Error loading Lottie animation:', error)
      }
    }

    loadAnimation()
  }, [animationPath])

  useEffect(() => {
    if (!lottieRef.current || !animationData) return

    const lottie = lottieRef.current

    // Create scroll trigger animation
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          // Map scroll progress to animation frame (3 complete cycles)
          const progress = self.progress
          const totalFrames = lottie.getDuration(true) // Get total frames
          
          if (totalFrames && totalFrames > 0) {
            // Multiply progress by 3 to get 3 complete cycles during full scroll
            const cycledProgress = (progress * 3) % 1
            const targetFrame = Math.floor(cycledProgress * totalFrames)
            // Go to specific frame based on scroll position
            lottie.goToAndStop(targetFrame, true)
          }
        },
        onRefresh: () => {
          // Start animation from beginning when page loads
          if (lottie) {
            lottie.goToAndStop(0, true)
          }
        }
      })

      // Also add a simple hover play animation
      if (containerRef.current) {
        const container = containerRef.current
        
        container.addEventListener('mouseenter', () => {
          lottie.play()
        })
        
        container.addEventListener('mouseleave', () => {
          lottie.pause()
        })
      }
    }, containerRef)

    // Cleanup
    return () => {
      ctx.revert()
    }
  }, [animationData])

  return (
    <div 
      ref={containerRef}
      className={`inline-flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${className}`}
      style={{ width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={false}
        autoplay={false}
        style={{ 
          width: size, 
          height: size,
          background: 'transparent'
        }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice'
        }}
      />
    </div>
  )
} 