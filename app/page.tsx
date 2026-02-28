import { readFileSync } from 'fs'
import path from 'path'
import Main from './Main'
import type { TraditionalFamily } from '@/types/TraditionalFamily'

function loadTraditionalFamilies(): TraditionalFamily[] {
  const filePath = path.join(process.cwd(), 'data', 'pedigree', 'traditional-family-index.json')
  const content = readFileSync(filePath, 'utf8')
  const { families } = JSON.parse(content) as { families: TraditionalFamily[] }
  return families
}

export default async function Page() {
  const families = loadTraditionalFamilies()
  return <Main families={families} />
}
