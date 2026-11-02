/**
 * 登録済み馬（pedigree-sires または在来）の四代を、血統表セルへ埋め込む形で返す。
 * 同じ id が両方にあるときは種牡馬ファイルを使う。
 */
import fs from 'fs/promises'
import path from 'path'
import { findCatalogEntryById } from '@/lib/sire-catalog'
import { loadTraditionalHorseRecord } from '@/lib/traditional-horse-lookup'

export type RegisteredPedigreeNode = {
  name?: string
  sex?: 'male' | 'female' | 'gelding'
  color?: string
  breed?: string
  foaledYear?: number | null
  netkeibaId?: string
  id?: string
}

export type RegisteredPedigree = {
  id: string
  name: string
  englishName: string
  filename: string
  store: 'sire' | 'traditional'
  subject: RegisteredPedigreeNode
  ancestryByPath: Record<string, RegisteredPedigreeNode>
}

function asSex(value: unknown): RegisteredPedigreeNode['sex'] | undefined {
  if (value === 'male' || value === 'female' || value === 'gelding') return value
  return undefined
}

function nodeFromRecord(raw: Record<string, unknown> | undefined): RegisteredPedigreeNode | null {
  if (!raw) return null
  const name = String(raw.name || '').trim()
  if (!name) return null
  const foaled = raw.foaled as { year?: number } | undefined
  const node: RegisteredPedigreeNode = { name }
  const sex = asSex(raw.sex)
  if (sex) node.sex = sex
  const color = String(raw.color || '').trim()
  if (color) node.color = color
  const breed = String(raw.breed || '').trim()
  if (breed) node.breed = breed
  if (foaled?.year != null && Number.isFinite(foaled.year)) {
    node.foaledYear = foaled.year
  }
  const netkeibaId = String(raw.netkeibaId || '').trim()
  if (netkeibaId) node.netkeibaId = netkeibaId
  const id = String(raw.id || '').trim()
  if (id) node.id = id
  return node
}

function shapeHorse(horse: Record<string, unknown>, store: 'sire' | 'traditional', filename: string): RegisteredPedigree | null {
  const subject = nodeFromRecord(horse)
  if (!subject) return null
  const id = String(horse.id || '').trim()
  if (!id) return null
  subject.id = id
  const ancestryByPath: Record<string, RegisteredPedigreeNode> = {}
  const rawAnc = horse.ancestryByPath as Record<string, Record<string, unknown>> | undefined
  for (const [ancPath, node] of Object.entries(rawAnc || {})) {
    if (!/^[sd]+$/.test(ancPath)) continue
    const shaped = nodeFromRecord(node)
    if (shaped) ancestryByPath[ancPath] = shaped
  }
  return {
    id,
    name: subject.name || id,
    englishName: String(horse.englishName || '').trim(),
    filename,
    store,
    subject,
    ancestryByPath,
  }
}

export async function loadRegisteredPedigree(id: string): Promise<RegisteredPedigree | null> {
  const key = (id || '').trim()
  if (!key) return null
  const catalog = await findCatalogEntryById(key)
  if (catalog?.store === 'sire') {
    const abs = path.join(process.cwd(), catalog.filepath)
    const data = JSON.parse(await fs.readFile(abs, 'utf-8'))
    const horse = (data?.horse || {}) as Record<string, unknown>
    return shapeHorse(horse, 'sire', catalog.filename)
  }
  const trad = await loadTraditionalHorseRecord(key)
  if (!trad) return null
  return shapeHorse(trad.horse, 'traditional', trad.hit.filename)
}
