const siteMetadata = {
  title: '日本在来牝系大鑑',
  author: 'Rabasu',
  headerTitle: '日本在来牝系大鑑',
  description: '戦前から日本に根付く競走馬の牝系をまとめています。',
  language: 'ja-jp',
  theme: 'system', // system, dark or light
  // sitemap / canonical / OG の基準。公開前に実ドメインを NEXT_PUBLIC_SITE_URL へ入れる。
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
  siteLogo: '/static/images/logo.png',
  socialBanner: '/static/images/twitter-card.png',
  github: 'https://github.com/rabasu',
  x: 'https://twitter.com/_rabasu_',
  locale: 'ja-JP',
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId: process.env.NEXT_UMAMI_ID,
    },
  },
  comments: {
    provider: 'giscus',
    giscusConfig: {
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      mapping: 'pathname',
      reactions: '1',
      metadata: '0',
      theme: 'light',
      darkTheme: 'transparent_dark',
      themeURL: '',
      lang: 'ja',
    },
  },
}

module.exports = siteMetadata
