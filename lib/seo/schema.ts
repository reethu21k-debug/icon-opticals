// lib/seo/schema.ts
// Production-ready JSON-LD structured data for iconopticals.in
import { SITE, BUSINESS } from './constants'

const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.state} ${BUSINESS.address.pincode}, India`

// ── Organization ─────────────────────────────────────────────────────────────
export function organizationSchema() {
  return {
    '@context':  'https://schema.org',
    '@type':     'Organization',
    '@id':       `${SITE.url}/#organization`,
    name:         BUSINESS.legalName,
    url:          SITE.url,
    logo: {
      '@type':       'ImageObject',
      url:           `${SITE.url}/logo.png`,
      width:         200,
      height:        60,
    },
    contactPoint: {
      '@type':           'ContactPoint',
      telephone:         BUSINESS.phone,
      contactType:       'customer service',
      availableLanguage: ['English', 'Telugu', 'Hindi'],
    },
    sameAs: [...BUSINESS.socialProfiles],
  }
}

// ── LocalBusiness ─────────────────────────────────────────────────────────────
export function localBusinessSchema() {
  return {
    '@context':       'https://schema.org',
    '@type':          ['LocalBusiness', 'Optician', 'Store'],
    '@id':            `${SITE.url}/#localbusiness`,
    name:             BUSINESS.legalName,
    alternateName:    BUSINESS.name,
    url:              SITE.url,
    telephone:        BUSINESS.phone,
    email:            BUSINESS.email,
    description:      SITE.description,
    foundingDate:     BUSINESS.founded,
    priceRange:       BUSINESS.priceRange,
    image:            `${SITE.url}/og-image.jpg`,
    logo:             `${SITE.url}/logo.png`,
    address: {
      '@type':           'PostalAddress',
      streetAddress:     BUSINESS.address.street,
      addressLocality:   BUSINESS.address.city,
      addressRegion:     BUSINESS.address.state,
      postalCode:        BUSINESS.address.pincode,
      addressCountry:    BUSINESS.address.country,
    },
    geo: {
      '@type':     'GeoCoordinates',
      latitude:    BUSINESS.geo.latitude,
      longitude:   BUSINESS.geo.longitude,
    },
    hasMap:           `https://maps.google.com/?q=${BUSINESS.geo.latitude},${BUSINESS.geo.longitude}`,
    openingHoursSpecification: BUSINESS.hours.map(h => ({
      '@type':        'OpeningHoursSpecification',
      dayOfWeek:      h.days.split(',').map(d => `https://schema.org/${expandDay(d)}`),
      opens:          h.open,
      closes:         h.close,
    })),
    currenciesAccepted: 'INR',
    paymentAccepted:    'Cash, Credit Card, Debit Card, UPI',
    areaServed: {
      '@type': 'City',
      name:    BUSINESS.address.city,
    },
    parentOrganization: {
      '@id': `${SITE.url}/#organization`,
    },
  }
}

// ── Website + SearchAction ────────────────────────────────────────────────────
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    '@id':      `${SITE.url}/#website`,
    url:         SITE.url,
    name:        SITE.name,
    description: SITE.shortDescription,
    publisher: {
      '@id': `${SITE.url}/#organization`,
    },
    potentialAction: {
      '@type':       'SearchAction',
      target: {
        '@type':    'EntryPoint',
        urlTemplate: `${SITE.url}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ── WebPage ───────────────────────────────────────────────────────────────────
export function webPageSchema(opts: {
  name:        string
  description: string
  url:         string
  breadcrumbs?: Array<{ name: string; url: string }>
}) {
  return {
    '@context':    'https://schema.org',
    '@type':       'WebPage',
    name:           opts.name,
    description:    opts.description,
    url:            opts.url,
    isPartOf:      { '@id': `${SITE.url}/#website` },
    publisher:     { '@id': `${SITE.url}/#organization` },
    ...(opts.breadcrumbs && {
      breadcrumb: breadcrumbSchema(opts.breadcrumbs),
    }),
  }
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context':   'https://schema.org',
    '@type':      'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type':   'ListItem',
      position:   index + 1,
      name:       item.name,
      item:       item.url,
    })),
  }
}

// ── Product ───────────────────────────────────────────────────────────────────
export function productSchema(product: {
  name:          string
  description?:  string | null
  brand?:        string | null
  slug:          string
  final_price:   number
  base_price:    number
  images?:       Array<{ url: string; is_primary?: boolean }> | null
  rating?:       number
  review_count?: number
  stock?:        number
  category?:     string
}) {
  const url       = `${SITE.url}/products/${product.slug}`
  const imageUrl  = product.images?.find(i => i.is_primary)?.url
                 ?? product.images?.[0]?.url
                 ?? `${SITE.url}/og-image.jpg`

  const availability = (product.stock ?? 1) > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock'

  return {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        product.name,
    description: product.description ?? `${product.name} by ${product.brand} — available at Icon Opticals, Anantapur.`,
    url,
    image:       imageUrl,
    sku:         product.slug,
    brand: {
      '@type': 'Brand',
      name:    product.brand ?? 'Icon Opticals',
    },
    offers: {
      '@type':        'Offer',
      url,
      price:           product.final_price,
      priceCurrency:  'INR',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability,
      seller: {
        '@type': 'Organization',
        name:    BUSINESS.legalName,
      },
      hasMerchantReturnPolicy: {
        '@type':                  'MerchantReturnPolicy',
        returnPolicyCategory:     'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays:       7,
        returnMethod:             'https://schema.org/ReturnInStore',
        returnFees:               'https://schema.org/FreeReturn',
      },
    },
    ...(product.rating && product.review_count && product.review_count > 0 && {
      aggregateRating: {
        '@type':       'AggregateRating',
        ratingValue:    product.rating.toFixed(1),
        reviewCount:    product.review_count,
        bestRating:    '5',
        worstRating:   '1',
      },
    }),
  }
}

// ── CollectionPage / ItemList ─────────────────────────────────────────────────
export function collectionPageSchema(opts: {
  name:        string
  description: string
  url:         string
  products:    Array<{ name: string; slug: string; final_price: number }>
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'CollectionPage',
    name:          opts.name,
    description:   opts.description,
    url:           opts.url,
    mainEntity: {
      '@type':          'ItemList',
      name:              opts.name,
      numberOfItems:     opts.products.length,
      itemListElement:   opts.products.slice(0, 20).map((p, i) => ({
        '@type':   'ListItem',
        position:   i + 1,
        url:        `${SITE.url}/products/${p.slug}`,
        name:       p.name,
      })),
    },
  }
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export function faqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context':    'https://schema.org',
    '@type':       'FAQPage',
    mainEntity:    faqs.map(faq => ({
      '@type':          'Question',
      name:              faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    faq.a,
      },
    })),
  }
}

// ── ContactPage ───────────────────────────────────────────────────────────────
export function contactPageSchema() {
  return {
    '@context':  'https://schema.org',
    '@type':     'ContactPage',
    name:        `Contact ${BUSINESS.name}`,
    url:         `${SITE.url}/store`,
    description: `Contact Icon Opticals in Anantapur for eyewear enquiries, eye test bookings, and store directions. Call ${BUSINESS.phoneDisplay} or visit us at ${FULL_ADDRESS}.`,
    mainEntity: {
      '@id': `${SITE.url}/#localbusiness`,
    },
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function expandDay(abbr: string): string {
  const map: Record<string, string> = {
    Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday',
    Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
  }
  return map[abbr] ?? abbr
}
