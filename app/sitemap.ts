import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { horseHref, isReservedRootSlug } from '@/lib/horse-id'
import { getHorsePageIndex } from '@/lib/traditional-family-loader'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl

  const staticRoutes = ['', 'glossary', 'search'].map((route) => ({
    url: `${siteUrl}/${route}`,
  }))

  const horseRoutes = Object.entries(getHorsePageIndex().horses)
    .filter(([id, entry]) => entry.tier === 'index' && !isReservedRootSlug(id))
    .map(([id]) => ({
      url: `${siteUrl}${horseHref(id)}`,
    }))

  return [...staticRoutes, ...horseRoutes]
}
