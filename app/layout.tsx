import type { Metadata } from 'next'
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

export const metadata: Metadata = baseMetadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="color-scheme" content="light" />

        {/* MediaPipe WASM shim — must be before any other scripts */}
        <MediaPipePatch />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

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