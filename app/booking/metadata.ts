// app/booking/metadata.ts
// This file exists because /booking/page.tsx is a Client Component ('use client')
// and cannot export metadata directly. Next.js resolves metadata from this file.
// Reference: https://nextjs.org/docs/app/building-your-application/optimizing/metadata

import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { BUSINESS } from '@/lib/seo/constants'

// eslint-disable-next-line import/prefer-default-export
export const metadata: Metadata = pageMetadata({
  title:       'Book a Free Eye Test — Icon Opticals Anantapur',
  description: `Book a free comprehensive eye test or frame fitting appointment at Icon Opticals, ${BUSINESS.address.city}. Choose your date, time & purpose online.`,
  path:        '/booking',
})