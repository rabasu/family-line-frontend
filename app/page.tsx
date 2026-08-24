import Main from './Main'
import { loadTraditionalFamilyIndex } from '@/lib/traditional-family-index'

export default async function Page() {
  const families = loadTraditionalFamilyIndex()
  return <Main families={families} />
}
