'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function Preloader() {
  const [stage, setStage] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false) // State to track image load

  useEffect(() => {
    // DO NOT start the timers until the image is actually loaded on the user's screen
    if (!isLoaded) return

    // Stage 1: Trigger the "Focus" effect, subtitle, and progress line
    const t1 = setTimeout(() => setStage(1), 100)

    // Stage 2: Slide the preloader up while pulling the logo down (Parallax)
    const t2 = setTimeout(() => setStage(2), 2600)

    // Stage 3: Unmount component from DOM entirely
    const t3 = setTimeout(() => setStage(3), 3600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isLoaded])

  // Once fully unmounted, free up DOM resources
  if (stage === 3) return null

  return (
    <div
      aria-hidden={stage === 2}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#FAFAFA] transition-transform duration-[1000ms] ease-[cubic-bezier(0.85,0,0.15,1)] ${
        stage === 2 ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Inner container for Parallax exit effect */}
      <div 
        className={`flex flex-col items-center justify-center transition-all duration-[800ms] ease-in-out ${
          stage === 2 ? 'translate-y-12 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
        }`}
      >
        {/* Image Logo with Enhanced "Vision" Blur-to-Sharp Effect */}
        <div
          className={`relative transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex justify-center ${
            stage >= 1
              ? 'opacity-100 blur-none scale-100 drop-shadow-xl'
              : 'opacity-0 blur-[24px] scale-110 drop-shadow-none'
          }`}
        >
          <Image
            src="/logo.png"
            alt="Icon Opticals Premium Eyewear"
            width={800}
            height={260}
            priority
            onLoad={() => setIsLoaded(true)} // <-- The trigger that starts everything
            className="object-contain w-[280px] md:w-[450px] lg:w-[600px] h-auto"
          />
        </div>

        {/* Staggered Premium Subtitle */}
        <div 
           className={`mt-6 tracking-[0.4em] text-xs md:text-sm text-[#0A1128]/60 uppercase font-light transition-all duration-[1200ms] delay-500 ease-out ${
             stage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
           }`}
        >
          Premium Eyewear
        </div>
      </div>

      {/* Symmetrical Center-Out Progress Line */}
      <div className="absolute bottom-16 w-64 md:w-80 h-[1px] bg-slate-200 overflow-hidden">
        <div
          className={`h-full bg-[#0A1128] origin-center transition-transform duration-[2200ms] ease-[cubic-bezier(0.85,0,0.15,1)] ${
            stage >= 1 ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </div>
    </div>
  )
}