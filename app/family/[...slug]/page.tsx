import type { Metadata } from 'next'
import FamilyDetailPage, { familyPageMetadata } from '../FamilyDetailPage'
import { listFamilyPageSlugs } from '@/lib/family-article'

export const dynamicParams = false

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata | undefined> {
  const slug = decodeURI(params.slug.join('/'))
  return familyPageMetadata(slug)
}

export const generateStaticParams = async () => {
  return listFamilyPageSlugs().map((slug) => ({ slug: slug.split('/') }))
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = decodeURI(params.slug.join('/'))
  return <FamilyDetailPage slug={slug} />
}
