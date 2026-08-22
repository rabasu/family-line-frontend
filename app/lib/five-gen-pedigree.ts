/**
 * 馬の5代血統表を、両親の4代血統表から合成する。
 *
 * 4代 = 祖先4世代（s〜ssss）。両親の4代を s/d プレフィックスで結合すると
 * 子の祖先5世代（s〜sssss）になる。
 */
import fs from 'fs/promises'
import path from 'path'
import type { PedigreePathNode, Sex } from '@/types/Horse'
import type { Breed } from '@/types/Breed'
import type { FiveGenPedigreeResponse } from '@/types/FiveGenPedigree'
import { allAncestryPaths, sexFromPath } from '@/lib/sire-pedigree-paths'
import { findCatalogEntryById } from '@/lib/sire-catalog'
import { findTraditionalHorseById } from '@/lib/traditional-horse-lookup'

const FOUR_GEN_DEPTH = 4
const FOUR_GEN_PATHS = allAncestryPaths(FOUR_GEN_DEPTH)

export type FourGen = {
  subject: PedigreePathNode
  ancestryByPath: Partial<Record<string, PedigreePathNode>>
}

type RawHorse = {
  id?: string
  name?: string
  pedigreeName?: string
  englishName?: string
  sex?: string
  color?: string
  breed?: string
  foaled?: { year?: number; month?: number; day?: number }
  sire?: string
  dam?: string
  sireId?: string
  damId?: string
  netkeibaId?: string
  ancestryByPath?: Partial<Record<string, PedigreePathNode>>
}

type TradFile = {
  horses?: RawHorse[]
}

type SireFile = {
  horse?: RawHorse
}

function asSex(value: string | undefined, fallback: Sex): Sex {
  if (value === 'male' || value === 'female' || value === 'gelding') return value
  return fallback
}

function nodeFromRaw(horse: RawHorse, fallbackSex: Sex): PedigreePathNode {
  const name = (horse.name || horse.pedigreeName || horse.englishName || horse.id || '').trim()
  const node: PedigreePathNode = {
    name: name || '不詳',
    sex: asSex(horse.sex, fallbackSex),
  }
  if (horse.foaled?.year != null) node.foaled = { year: horse.foaled.year }
  if (horse.color) node.color = horse.color
  if (horse.breed) node.breed = horse.breed as Breed
  if (horse.netkeibaId) node.netkeibaId = horse.netkeibaId
  return node
}

function nameOnlyNode(name: string, sex: Sex): PedigreePathNode {
  const trimmed = (name || '').trim()
  return { name: trimmed || '不詳', sex }
}

function hasCompleteFourGen(ancestry: Partial<Record<string, PedigreePathNode>> | undefined): boolean {
  if (!ancestry) return false
  return FOUR_GEN_PATHS.every((p) => Object.prototype.hasOwnProperty.call(ancestry, p))
}

function hasAnyAncestry(ancestry: Partial<Record<string, PedigreePathNode>> | undefined): boolean {
  return !!ancestry && Object.keys(ancestry).length > 0
}

/** 両親の4代を結合して子の5代 ancestryByPath にする */
export function combineParentsFourGen(
  sire: FourGen | null,
  dam: FourGen | null
): Partial<Record<string, PedigreePathNode>> {
  return {
    ...(sire ? prefixFourGen('s', sire) : {}),
    ...(dam ? prefixFourGen('d', dam) : {}),
  }
}

export function prefixFourGen(
  prefix: 's' | 'd',
  four: FourGen
): Partial<Record<string, PedigreePathNode>> {
  const out: Partial<Record<string, PedigreePathNode>> = {
    [prefix]: four.subject,
  }
  for (const [path, node] of Object.entries(four.ancestryByPath || {})) {
    if (!path || path.length > FOUR_GEN_DEPTH || !node) continue
    out[`${prefix}${path}`] = node
  }
  return out
}

export function truncateAncestry(
  ancestry: Partial<Record<string, PedigreePathNode>>,
  depth: number
): Partial<Record<string, PedigreePathNode>> {
  const out: Partial<Record<string, PedigreePathNode>> = {}
  for (const [path, node] of Object.entries(ancestry)) {
    if (path.length <= depth && node) out[path] = node
  }
  return out
}

/**
 * 子の ancestryByPath から、prefix 側（父 or 母）の4代相当を取り出す。
 * 子が4代しかもたない場合、親側は3代までになる。
 */
export function fourGenFromChildBranch(
  ancestry: Partial<Record<string, PedigreePathNode>> | undefined,
  prefix: 's' | 'd'
): FourGen | null {
  const subject = ancestry?.[prefix]
  if (!subject?.name) return null
  const ancestryByPath: Partial<Record<string, PedigreePathNode>> = {}
  for (const [path, node] of Object.entries(ancestry || {})) {
    if (!node || !path.startsWith(prefix) || path.length <= 1) continue
    ancestryByPath[path.slice(1)] = node
  }
  return { subject, ancestryByPath }
}

function fourGenFromHorse(horse: RawHorse, fallbackSex: Sex): FourGen {
  return {
    subject: nodeFromRaw(horse, fallbackSex),
    ancestryByPath: horse.ancestryByPath || {},
  }
}

class PedigreeAssembler {
  private sireFileById = new Map<string, RawHorse | null>()
  private tradFileByAbs = new Map<string, TradFile>()
  private tradHorseById = new Map<string, RawHorse | null>()
  private fourGenCache = new Map<string, FourGen | null>()
  private visiting = new Set<string>()

  async buildFiveGen(horseId: string): Promise<FiveGenPedigreeResponse | null> {
    const horse = await this.loadTraditionalHorse(horseId)
    if (!horse) return null

    const sireFour = await this.resolveParentFourGen(horse, 's')
    const damFour = await this.resolveParentFourGen(horse, 'd')
    const ancestryByPath = combineParentsFourGen(sireFour, damFour)

    return {
      id: horse.id || horseId,
      name: horse.name || horse.pedigreeName || horseId,
      pedigreeName: horse.pedigreeName,
      englishName: horse.englishName,
      foaledYear: horse.foaled?.year ?? null,
      sex: horse.sex,
      color: horse.color,
      ancestryByPath,
    }
  }

  private async resolveParentFourGen(horse: RawHorse, side: 's' | 'd'): Promise<FourGen | null> {
    const parentId = side === 's' ? horse.sireId : horse.damId
    if (parentId) {
      const loaded = await this.getFourGen(parentId)
      if (loaded) return loaded
    }
    const fromOwn = fourGenFromChildBranch(horse.ancestryByPath, side)
    if (fromOwn) return fromOwn
    const parentName = side === 's' ? horse.sire : horse.dam
    if (parentName) {
      return { subject: nameOnlyNode(parentName, sexFromPath(side)), ancestryByPath: {} }
    }
    return null
  }

  async getFourGen(id: string): Promise<FourGen | null> {
    const key = (id || '').trim()
    if (!key) return null
    if (this.fourGenCache.has(key)) return this.fourGenCache.get(key) ?? null
    if (this.visiting.has(key)) return null
    this.visiting.add(key)
    try {
      const result = await this.computeFourGen(key)
      this.fourGenCache.set(key, result)
      return result
    } finally {
      this.visiting.delete(key)
    }
  }

  private async computeFourGen(id: string): Promise<FourGen | null> {
    const sireHorse = await this.loadSireHorse(id)
    if (sireHorse && hasCompleteFourGen(sireHorse.ancestryByPath)) {
      return fourGenFromHorse(sireHorse, 'male')
    }

    const tradHorse = await this.loadTraditionalHorse(id)
    if (tradHorse && hasCompleteFourGen(tradHorse.ancestryByPath)) {
      return fourGenFromHorse(tradHorse, asSex(tradHorse.sex, 'female'))
    }

    if (tradHorse) {
      const sireFour = tradHorse.sireId ? await this.getFourGen(tradHorse.sireId) : null
      const damFour = tradHorse.damId ? await this.getFourGen(tradHorse.damId) : null
      const combined = combineParentsFourGen(sireFour, damFour)
      const truncated = truncateAncestry(combined, FOUR_GEN_DEPTH)
      if (Object.keys(truncated).length > 0) {
        const stored = tradHorse.ancestryByPath || {}
        return {
          subject: nodeFromRaw(tradHorse, asSex(tradHorse.sex, 'female')),
          ancestryByPath: { ...stored, ...truncated },
        }
      }
    }

    if (sireHorse && hasAnyAncestry(sireHorse.ancestryByPath)) {
      return fourGenFromHorse(sireHorse, 'male')
    }
    if (tradHorse && hasAnyAncestry(tradHorse.ancestryByPath)) {
      return fourGenFromHorse(tradHorse, asSex(tradHorse.sex, 'female'))
    }
    if (sireHorse) return fourGenFromHorse(sireHorse, 'male')
    if (tradHorse) return fourGenFromHorse(tradHorse, asSex(tradHorse.sex, 'female'))
    return null
  }

  private async loadSireHorse(id: string): Promise<RawHorse | null> {
    if (this.sireFileById.has(id)) return this.sireFileById.get(id) ?? null
    const entry = await findCatalogEntryById(id)
    if (!entry || entry.store !== 'sire') {
      this.sireFileById.set(id, null)
      return null
    }
    try {
      const abs = path.join(process.cwd(), entry.filepath)
      const data = JSON.parse(await fs.readFile(abs, 'utf-8')) as SireFile
      const horse = data?.horse || null
      this.sireFileById.set(id, horse)
      return horse
    } catch {
      this.sireFileById.set(id, null)
      return null
    }
  }

  private async loadTraditionalHorse(id: string): Promise<RawHorse | null> {
    if (this.tradHorseById.has(id)) return this.tradHorseById.get(id) ?? null
    const hit = await findTraditionalHorseById(id)
    if (!hit) {
      this.tradHorseById.set(id, null)
      return null
    }
    const abs = path.join(process.cwd(), hit.filepath)
    let file = this.tradFileByAbs.get(abs)
    if (!file) {
      try {
        file = JSON.parse(await fs.readFile(abs, 'utf-8')) as TradFile
        this.tradFileByAbs.set(abs, file)
      } catch {
        this.tradHorseById.set(id, null)
        return null
      }
    }
    for (const horse of file.horses || []) {
      const hid = (horse.id || '').trim()
      if (hid && !this.tradHorseById.has(hid)) this.tradHorseById.set(hid, horse)
    }
    const found = this.tradHorseById.get(id) ?? null
    if (!this.tradHorseById.has(id)) this.tradHorseById.set(id, found)
    return found
  }
}

export async function buildFiveGenPedigree(horseId: string): Promise<FiveGenPedigreeResponse | null> {
  const id = (horseId || '').trim()
  if (!id) return null
  const assembler = new PedigreeAssembler()
  return assembler.buildFiveGen(id)
}
