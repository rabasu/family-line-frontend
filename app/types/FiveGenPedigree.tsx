import type { PedigreePathNode } from './Horse'

export const FIVE_GEN_DEPTH = 5

export type FiveGenPedigreeResponse = {
  id: string
  name: string
  pedigreeName?: string
  englishName?: string
  foaledYear?: number | null
  sex?: string
  color?: string
  ancestryByPath: Partial<Record<string, PedigreePathNode>>
}
