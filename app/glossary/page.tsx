import { loadGlossaryTerms } from '../lib/glossary-loader'
import GlossaryMain from './GlossaryMain'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '用語集' })

export default function GlossaryPage() {
  const terms = loadGlossaryTerms()
  return <GlossaryMain terms={terms} />
}
