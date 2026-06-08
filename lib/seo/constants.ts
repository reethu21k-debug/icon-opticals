// lib/seo/constants.ts
// Single source of truth for all SEO constants — iconopticals.in

export const SITE = {
  url:         'https://iconopticals.in',
  name:        'Icon Opticals',
  legalName:   'Icon Vision Care & Opticals',
  tagline:     'Premium Eyewear in Anantapur',
  description:
    'Icon Opticals is Anantapur\'s premier eyewear store offering eyeglasses, sunglasses, contact lenses, computer glasses and free eye tests. Trusted brands — Ray-Ban, Titan, Tommy Hilfiger & more.',
  shortDescription:
    'Buy eyeglasses, sunglasses & contact lenses at Icon Opticals, Anantapur. Free eye test at store.',
  locale:      'en_IN',
  language:    'en',
  themeColor:  '#0f172a',
  bgColor:     '#ffffff',
} as const

export const BUSINESS = {
  name:          'Icon Opticals',
  legalName:     'Icon Vision Care & Opticals',
  phone:         '+919676227094',
  phoneDisplay:  '+91 96762 27094',
  email:         'support@iconopticals.in',
  address: {
    street:   'Main Bazaar Road',
    city:     'Anantapur',
    state:    'Andhra Pradesh',
    stateCode:'AP',
    pincode:  '515001',
    country:  'IN',
  },
  geo: {
    latitude:  14.6819,
    longitude: 77.5999,
  },
  hours: [
    { days: 'Mo,Tu,We,Th,Fr', open: '10:00', close: '20:00' },
    { days: 'Sa',              open: '10:00', close: '20:00' },
    { days: 'Su',              open: '11:00', close: '18:00' },
  ],
  founded:       '2012',
  priceRange:    '₹₹',
  socialProfiles: [
    'https://www.instagram.com/iconopticals',
    'https://www.facebook.com/iconopticals',
  ],
} as const

export const CATEGORIES = [
  { slug: 'eyeglasses',       label: 'Eyeglasses',        description: 'Prescription eyeglasses, spectacle frames for men, women & kids in Anantapur.' },
  { slug: 'sunglasses',       label: 'Sunglasses',        description: 'Polarized & UV400 sunglasses. Premium brands at Icon Opticals, Anantapur.' },
  { slug: 'computer-glasses', label: 'Computer Glasses',  description: 'Blue-light blocking computer glasses to protect your eyes from screen strain.' },
  { slug: 'contact-lenses',   label: 'Contact Lenses',   description: 'Daily, monthly & yearly contact lenses. Buy contact lenses online in Anantapur.' },
  { slug: 'progressive',      label: 'Progressive Lenses',description: 'Premium progressive & bifocal lenses for clear vision at all distances.' },
] as const

export const BRANDS = [
  'Ray-Ban', 'Titan', 'Tommy Hilfiger', 'Fastrack',
  'French Connection', 'Scott', 'IDEE', 'Voyage',
] as const

export const OG_IMAGE     = `${SITE.url}/og-image.jpg`
export const TWITTER_IMAGE = `${SITE.url}/twitter-image.jpg`
