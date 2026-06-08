import type { Metadata } from 'next'
import { createServerClientInstance } from '@/lib/supabase'
import StoreList from '@/components/StoreList'
import type { Store } from '@/types'
import { SITE, BUSINESS } from '@/lib/seo/constants'
import { localBusinessSchema, contactPageSchema, breadcrumbSchema } from '@/lib/seo/schema'
import { pageMetadata } from '@/lib/seo/metadata'

export const revalidate = 0

export const metadata: Metadata = pageMetadata({
  title:       'Our Store — Icon Opticals Anantapur | Visit Us',
  description: `Visit Icon Opticals at ${BUSINESS.address.street}, ${BUSINESS.address.city}. Free eye test, top brands — Ray-Ban, Titan & more. Call ${BUSINESS.phoneDisplay}.`,
  path:        '/store',
})

async function getStores(): Promise<Store[]> {
  try {
    const supabase = await createServerClientInstance()
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('city')

    if (error) {
      console.error('Stores fetch error:', error.message)
      return []
    }

    return (data || []) as Store[]
  } catch (e) {
    console.error('Stores exception:', e)
    return []
  }
}

export default async function StorePage() {
  const stores = await getStores()

  const breadcrumbs = [
    { name: 'Home',       url: SITE.url },
    { name: 'Our Store',  url: `${SITE.url}/store` },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(breadcrumbs)) }}
      />

      <StoreList stores={stores} />
    </>
  )
}