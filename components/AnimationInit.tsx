'use client'
import { useEffect } from 'react'

export function AnimationInit() {
  useEffect(() => {
    function makeObserver(
      callback: (el: Element) => void,
      options?: IntersectionObserverInit
    ) {
      return new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) callback(e.target)
          }),
        options ?? { threshold: 0.25 }
      )
    }

    /* ─── 1. SCROLL FLOAT — section h2 titles ───────────────── */
    // SAFE: only adds inline style + CSS classes, never touches children
    function initScrollFloat() {
      const els = document.querySelectorAll<HTMLElement>('.scroll-float-target')
      els.forEach((el) => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(18px)'
        el.classList.add('scroll-float-ready')
      })

      const obs = makeObserver(
        (el) => {
          el.classList.add('float-visible')
          obs.unobserve(el)
        },
        { threshold: 0.2 }
      )
      els.forEach((el) => obs.observe(el))
    }

    /* ─── 2. RULE LINES — reveal on scroll ──────────────────── */
    // SAFE: only classList mutations
    function initRuleLines() {
      const els = document.querySelectorAll('.rule-animated')
      els.forEach((el) => el.classList.add('rule-ready'))

      const obs = makeObserver(
        (el) => {
          el.classList.add('rule-visible')
          obs.unobserve(el)
        },
        { threshold: 0.4 }
      )
      els.forEach((el) => obs.observe(el))
    }

    /* ─── 3. COUNTER — animates data-count-display spans ─────── */
    // SAFE: only targets [data-count-display] leaf spans that React
    // renders with no children — we own them exclusively at runtime.
    function initCounters() {
      function animateCount(el: HTMLElement) {
        const target = parseFloat(el.dataset.countDisplay!)
        const suffix = el.dataset.suffix ?? ''
        const isFloat = String(target).includes('.')
        const duration = 1600
        let start: number | null = null
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

        const step = (ts: number) => {
          if (!start) start = ts
          const progress = Math.min((ts - start) / duration, 1)
          const current = target * easeOut(progress)
          const display = isFloat ? current.toFixed(1) : Math.floor(current)
          el.textContent = String(display) + suffix
          if (progress < 1) {
            requestAnimationFrame(step)
          } else {
            el.textContent = (isFloat ? target.toFixed(1) : String(target)) + suffix
          }
        }
        requestAnimationFrame(step)
      }

      const obs = makeObserver(
        (el) => {
          animateCount(el as HTMLElement)
          obs.unobserve(el)
        },
        { threshold: 0.5 }
      )
      document
        .querySelectorAll<HTMLElement>('[data-count-display]')
        .forEach((el) => obs.observe(el))
    }

    initScrollFloat()
    initRuleLines()
    initCounters()

    // NOTE: initSplitText, initDecrypt, initFallingText are intentionally
    // removed — they mutated innerHTML on React-owned nodes, causing the
    // "removeChild: node is not a child" crash. Split-word spans are now
    // static JSX in page.tsx; eyebrow text is plain text.
  }, [])

  return null
}