'use client'

import { useEffect, useRef, useState } from 'react'
import siteMetadata from '@/data/siteMetadata'

export default function Comments({ slug }: { slug: string }) {
  const [loadComments, setLoadComments] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const config = siteMetadata.comments

  useEffect(() => {
    if (!loadComments || config?.provider !== 'giscus' || !containerRef.current) return
    const giscus = config.giscusConfig
    if (!giscus?.repo || !giscus.repositoryId) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-repo', giscus.repo)
    script.setAttribute('data-repo-id', giscus.repositoryId)
    script.setAttribute('data-category', giscus.category || '')
    script.setAttribute('data-category-id', giscus.categoryId || '')
    script.setAttribute('data-mapping', giscus.mapping || 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', giscus.reactions || '1')
    script.setAttribute('data-emit-metadata', giscus.metadata || '0')
    script.setAttribute('data-input-position', 'bottom')
    script.setAttribute('data-theme', giscus.theme || 'light')
    script.setAttribute('data-lang', giscus.lang || 'ja')
    script.setAttribute('data-term', slug)

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(script)
  }, [loadComments, slug, config])

  if (!config?.provider) return null

  if (!loadComments) {
    return (
      <button type="button" onClick={() => setLoadComments(true)}>
        コメントを読む
      </button>
    )
  }

  return <div ref={containerRef} className="giscus" />
}
