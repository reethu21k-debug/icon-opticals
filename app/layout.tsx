import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Preloader from '@/components/Preloader'
import { baseMetadata } from '@/lib/seo/metadata'
import {
  organizationSchema,
  localBusinessSchema,
  websiteSchema,
} from '@/lib/seo/schema'
import { MediaPipePatch } from '@/components/try-on/MediaPipePatch'

// ── Fonts ──────────────────────────────────────────────────────────────────
// FIX: neither font was actually being loaded anywhere in the project.
// Tailwind's `font-sans` pointed at `var(--font-inter)`, which nothing ever
// set — so every page silently fell back to the OS's `system-ui` font
// (San Francisco on Mac, Segoe UI on Windows, Roboto on Android). Headings
// used a `Didot, "Bodoni MT", "Playfair Display", Times, serif` stack, but
// only Didot/Bodoni MT (Mac/Windows-only system fonts) or Times ever
// actually resolved — Playfair Display was never loaded either, and the
// Footer/homepage used a THIRD, different pairing ('DM Serif Display' /
// 'DM Sans') that also was never loaded. Net effect: font rendering varied
// by OS and even varied between pages on the same device.
//
// Fix: self-host both fonts via next/font (zero extra network round-trip,
// no layout shift) and expose them as CSS variables. tailwind.config.js and
// every inline fontFamily reference across the project now points at these
// same two variables, so there is exactly one serif and one sans family
// used everywhere.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = baseMetadata

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="color-scheme" content="light" />

        {/* Structured Data — injected on every page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema()),
          }}
        />
      </head>

      <body className="bg-white text-gray-900 antialiased">
        {/* MediaPipe WASM shim — hoisted to <head> by Next.js beforeInteractive */}
        <MediaPipePatch />
        <Preloader />
        <Navbar />

        <div className="pt-[104px]">
          {children}
        </div>

        <Footer />
      </body>
    </html>
  )
}