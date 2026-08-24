import { genPageMetadata } from 'app/seo'
import Main from '../Main'
import { loadTraditionalFamilyIndex } from '@/lib/traditional-family-index'

export const metadata = genPageMetadata({ title: '牝系一覧' })

/** 旧ブログ一覧 URL。トップと同じディレクトリを出す */
export default async function FamilyIndexPage() {
  const families = loadTraditionalFamilyIndex()
  return <Main families={families} />
}
