'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface MenuItemData {
  link: string
  text: string
  image: string
}

interface FlowingMenuProps {
  items?: MenuItemData[]
  speed?: number
  textColor?: string
  bgColor?: string
  marqueeBgColor?: string
  marqueeTextColor?: string
  borderColor?: string
}

interface MenuItemProps extends MenuItemData {
  speed: number
  textColor: string
  marqueeBgColor: string
  marqueeTextColor: string
  borderColor: string
  isFirst: boolean
}

const FlowingMenu = ({
  items = [],
  speed = 15,
  textColor = '#fff',
  bgColor = '#120F17',
  marqueeBgColor = '#fff',
  marqueeTextColor = '#120F17',
  borderColor = '#fff',
}: FlowingMenuProps) => {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: bgColor }}>
      <nav style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0, padding: 0 }}>
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            {...item}
            speed={speed}
            textColor={textColor}
            marqueeBgColor={marqueeBgColor}
            marqueeTextColor={marqueeTextColor}
            borderColor={borderColor}
            isFirst={idx === 0}
          />
        ))}
      </nav>
    </div>
  )
}

const MenuItem = ({
  link,
  text,
  image,
  speed,
  textColor,
  marqueeBgColor,
  marqueeTextColor,
  borderColor,
  isFirst,
}: MenuItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const marqueeInnerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const positionRef = useRef(0)
  const contentWidthRef = useRef(0)
  const [repetitions, setRepetitions] = useState(6)
  const isRunning = useRef(true)

  // ── marquee animation (requestAnimationFrame, no GSAP) ──────────────
  const animate = useCallback(() => {
    if (!marqueeInnerRef.current || contentWidthRef.current === 0) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }
    const pxPerFrame = contentWidthRef.current / (speed * 60)
    positionRef.current -= pxPerFrame
    if (positionRef.current <= -contentWidthRef.current) {
      positionRef.current = 0
    }
    marqueeInnerRef.current.style.transform = `translateX(${positionRef.current}px)`
    rafRef.current = requestAnimationFrame(animate)
  }, [speed])

  useEffect(() => {
    isRunning.current = true
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      isRunning.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  // measure content width after render / resize
  useEffect(() => {
    const measure = () => {
      if (!marqueeInnerRef.current) return
      const part = marqueeInnerRef.current.querySelector('.fm-part') as HTMLElement | null
      if (!part) return
      const w = part.offsetWidth
      if (w === 0) return
      contentWidthRef.current = w
      const needed = Math.max(6, Math.ceil(window.innerWidth / w) + 3)
      setRepetitions(needed)
    }
    const t = setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [text, image])

  // ── slide-in / slide-out on hover ────────────────────────────────────
  const findEdge = (ex: number, ey: number, w: number, h: number): 'top' | 'bottom' => {
    const top = (ex - w / 2) ** 2 + ey ** 2
    const bot = (ex - w / 2) ** 2 + (ey - h) ** 2
    return top < bot ? 'top' : 'bottom'
  }

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current || !marqueeRef.current) return
    const r = itemRef.current.getBoundingClientRect()
    const edge = findEdge(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height)
    const overlay = marqueeRef.current
    overlay.style.transition = 'none'
    overlay.style.transform = edge === 'top' ? 'translateY(-101%)' : 'translateY(101%)'
    overlay.getBoundingClientRect()
    overlay.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)'
    overlay.style.transform = 'translateY(0%)'
  }

  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current || !marqueeRef.current) return
    const r = itemRef.current.getBoundingClientRect()
    const edge = findEdge(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height)
    const overlay = marqueeRef.current
    overlay.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)'
    overlay.style.transform = edge === 'top' ? 'translateY(-101%)' : 'translateY(101%)'
  }

  return (
    <div
      ref={itemRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        borderTop: isFirst ? 'none' : `1px solid ${borderColor}`,
      }}
    >
      <a
        href={link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          position: 'relative',
          cursor: 'pointer',
          textTransform: 'uppercase',
          textDecoration: 'none',
          fontWeight: 600,
          // ✅ FIX: was '4vh' — now vw-based so it scales with width, not height.
          // clamp(min, preferred, max) ensures legibility at all breakpoints:
          //   375px mobile  → ~14–16px  (was ~28–37px with 4vh — way too large)
          //   768px tablet  → ~26–30px
          //   1440px desktop → capped at 36px
          fontSize: 'clamp(12px, 3.8vw, 36px)',
          color: textColor,
          letterSpacing: '0.04em',
          fontFamily: "'DM Serif Display', Georgia, serif",
          // Prevent text wrapping on very small viewports
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: '0 clamp(8px, 2vw, 20px)',
        }}
      >
        {text}
      </a>

      {/* sliding overlay */}
      <div
        ref={marqueeRef}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
          transform: 'translateY(101%)',
          backgroundColor: marqueeBgColor,
          willChange: 'transform',
        }}
      >
        {/* scrolling inner strip */}
        <div
          ref={marqueeInnerRef}
          style={{
            height: '100%',
            width: 'max-content',
            display: 'flex',
            willChange: 'transform',
          }}
        >
          {Array.from({ length: repetitions }).map((_, idx) => (
            <div
              className="fm-part"
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                color: marqueeTextColor,
              }}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  fontWeight: 400,
                  // ✅ FIX: marquee text also scaled responsively
                  fontSize: 'clamp(11px, 3.5vw, 32px)',
                  lineHeight: 1,
                  padding: '0 clamp(4px, 1vw, 12px)',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.06em',
                }}
              >
                {text}
              </span>
              <div
                style={{
                  // ✅ FIX: image also scales with viewport width, not height
                  width: 'clamp(50px, 10vw, 200px)',
                  height: 'clamp(24px, 4.5vw, 56px)',
                  margin: 'clamp(4px, 1vw, 12px) clamp(4px, 1.5vw, 16px)',
                  borderRadius: 50,
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FlowingMenu