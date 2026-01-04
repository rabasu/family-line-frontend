import 'css/prism.css'
import 'katex/dist/katex.css'

import { components } from '@/components/MDXComponents'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { coreContent } from 'pliny/utils/contentlayer'
import { allHorses } from 'contentlayer/generated'
import type { Horse } from 'contentlayer/generated'
import PostSimple from '@/layouts/PostSimple'
import PostLayout from '@/layouts/PostLayout'
import PostBanner from '@/layouts/PostBanner'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

const defaultLayout = 'PostLayout'
const layouts = {
  PostSimple,
  PostLayout,
  PostBanner,
}

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata | undefined> {
  const slug = decodeURI(params.slug.join('/'))
  const post = allHorses.find((p) => p.slug === slug)

  if (!post) {
    return
  }

  // メモリ節約のため、最小限のメタデータのみ生成
  return {
    title: post.title,
    description: post.summary,
  }
}

export const generateStaticParams = async () => {
  // 静的生成を無効化（メモリ不足を回避）
  // 代わりに各ページはリクエスト時に動的に生成される
  return []

  // 元のコード（メモリ不足のため無効化）
  // const paths = allHorses.map((p) => ({ slug: p.slug.split('/') }))
  // return paths
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = decodeURI(params.slug.join('/'))
  const post = allHorses.find((p) => p.slug === slug)

  if (!post) {
    return notFound()
  }

  // メモリ節約のため、最小限の処理のみ
  const mainContent = coreContent(post)
  const Layout = layouts[post.layout || defaultLayout]

  return (
    <Layout content={mainContent} authorDetails={[]} next={undefined} prev={undefined}>
      <MDXLayoutRenderer code={post.body.code} components={components} toc={post.toc} />
    </Layout>
  )
}
