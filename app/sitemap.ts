import { MetadataRoute } from 'next'
import { allFamilies, allHorses } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'
import { getHorsePageIndex } from '@/lib/traditional-family-loader'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl
  const today = new Date().toISOString().split('T')[0]

  const staticRoutes = ['', 'family', 'glossary', 'tags', 'search', 'projects', 'about'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: today,
  }))

  const familyRoutes = allFamilies
    .filter((post) => !post.draft)
    .map((post) => ({
      url: `${siteUrl}/${post.path}`,
      lastModified: post.lastmod || post.date,
    }))

  // 解説記事のある馬は更新日を持つので優先的に使う
  const articleDates = new Map(allHorses.filter((post) => !post.draft).map((post) => [post.slug, post.lastmod || post.date]))

  // noindex の馬は sitemap にも載せない
  const horseRoutes = Object.entries(getHorsePageIndex().horses)
    .filter(([, entry]) => entry.tier === 'index')
    .map(([id]) => ({
      url: `${siteUrl}/horse/${id}`,
      lastModified: articleDates.get(id) || today,
    }))

  return [...staticRoutes, ...familyRoutes, ...horseRoutes]
}
