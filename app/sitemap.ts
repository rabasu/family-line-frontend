import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { listFamilyPageSlugs } from '@/lib/family-article'
import { getHorsePageIndex } from '@/lib/traditional-family-loader'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl

  const staticRoutes = ['', 'family', 'glossary', 'search'].map((route) => ({
    url: `${siteUrl}/${route}`,
  }))

  const familyRoutes = listFamilyPageSlugs().map((slug) => ({
    url: `${siteUrl}/family/${slug}`,
  }))

  const horseRoutes = Object.entries(getHorsePageIndex().horses)
    .filter(([, entry]) => entry.tier === 'index')
    .map(([id]) => ({
      url: `${siteUrl}/horse/${id}`,
    }))

  return [...staticRoutes, ...familyRoutes, ...horseRoutes]
}
