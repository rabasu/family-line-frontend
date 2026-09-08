/**
 * 牝系 MDX は解説文であり、日付付きブログ投稿ではない。
 * pubDate のない RSS を出さない（sitemap の lastModified と同じ判断）。
 */
export default function rss() {
  console.log('RSS skipped: family MDX has no post dates')
}
