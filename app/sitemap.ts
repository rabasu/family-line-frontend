import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { listFamilyPageSlugs, loadFamilyArticle } from '@/lib/family-article'
import { loadHorseArticle } from '@/lib/horse-article'
import { getHorsePageIndex } from '@/lib/traditional-family-loader'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl
  const today = new Date().toISOString().split('T')[0]

  const staticRoutes = ['', 'family', 'glossary', 'search'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: today,
  }))

  const familyRoutes = listFamilyPageSlugs().map((slug) => {
    const article = loadFamilyArticle(slug)
    return {
      url: `${siteUrl}/family/${slug}`,
      lastModified: article?.lastmod || article?.date || today,
    }
  })

  const horseRoutes = Object.entries(getHorsePageIndex().horses)
    .filter(([, entry]) => entry.tier === 'index')
    .map(([id]) => {
      const article = loadHorseArticle(id)
      return {
        url: `${siteUrl}/horse/${id}`,
        lastModified: article?.lastmod || article?.date || today,
      }
    })

  return [...staticRoutes, ...familyRoutes, ...horseRoutes]
}
