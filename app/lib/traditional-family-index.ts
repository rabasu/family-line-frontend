import { readFileSync } from 'fs'
import path from 'path'
import type { TraditionalFamily } from '@/types/TraditionalFamily'

export function loadTraditionalFamilyIndex(): TraditionalFamily[] {
  const filePath = path.join(process.cwd(), 'data', 'pedigree', 'traditional-family-index.json')
  const { families } = JSON.parse(readFileSync(filePath, 'utf8')) as { families: TraditionalFamily[] }
  return families
}
