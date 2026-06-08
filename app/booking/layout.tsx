// app/booking/layout.tsx
// Next.js reads metadata from layout files even when the page is a Client Component.
// This is the correct pattern for adding metadata to 'use client' pages.

import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { BUSINESS } from '@/lib/seo/constants'

export const metadata: Metadata = pageMetadata({
  title:       'Book a Free Eye Test — Icon Opticals Anantapur',
  description: `Book a free comprehensive eye test or frame fitting appointment at Icon Opticals, ${BUSINESS.address.city}. Choose your date, time & purpose online.`,
  path:        '/booking',
})

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}