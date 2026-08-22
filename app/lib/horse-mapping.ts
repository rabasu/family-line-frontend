/**
 * scraping/horse_mapping.json と horse_mapping_add.json の読み書き。
 */
import fs from 'fs/promises'
import path from 'path'

const SCRAPING_DIR = path.join(process.cwd(), 'scraping')
export const HORSE_MAPPING_PATH = path.join(SCRAPING_DIR, 'horse_mapping.json')
export const HORSE_MAPPING_ADD_PATH = path.join(
  SCRAPING_DIR,
  'horse_mapping_add.json'
)

export type HorseMappingRow = {
  name: string
  ahonoora_id: string
  netkeiba_id: string
  netkeiba_dam_id: string
  jbis_id: string
  bogus_id: string
  new_bogus_id: string
  dam_id?: string
}

function cell(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s.toLowerCase() === 'none' || s.toLowerCase() === 'nan' ? '' : s
}

export function normalizeMappingRow(item: Record<string, unknown>): HorseMappingRow | null {
  const name = cell(item.name)
  if (!name) return null
  const row: HorseMappingRow = {
    name,
    ahonoora_id: cell(item.ahonoora_id || item.ahonnora_id),
    netkeiba_id: cell(item.netkeiba_id),
    netkeiba_dam_id: cell(item.netkeiba_dam_id),
    jbis_id: cell(item.jbis_id),
    bogus_id: cell(item.bogus_id),
    new_bogus_id: cell(item.new_bogus_id),
  }
  const dam = cell(item.dam_id)
  if (dam) row.dam_id = dam
  return row
}

export function emptyMappingRow(): HorseMappingRow {
  return {
    name: '',
    ahonoora_id: '',
    netkeiba_id: '',
    netkeiba_dam_id: '',
    jbis_id: '',
    bogus_id: '',
    new_bogus_id: '',
    dam_id: '',
  }
}

async function readMappingList(filepath: string): Promise<HorseMappingRow[]> {
  try {
    const raw = JSON.parse(await fs.readFile(filepath, 'utf-8'))
    const list = Array.isArray(raw) ? raw : [raw]
    return list
      .map((x) =>
        x && typeof x === 'object'
          ? normalizeMappingRow(x as Record<string, unknown>)
          : null
      )
      .filter((x): x is HorseMappingRow => Boolean(x))
  } catch {
    return []
  }
}

function mergeMappings(
  existing: HorseMappingRow[],
  incoming: HorseMappingRow[]
): HorseMappingRow[] {
  const byName = new Map<string, HorseMappingRow>()
  const order: string[] = []
  for (const rec of [...existing, ...incoming]) {
    if (!rec.name) continue
    if (!byName.has(rec.name)) order.push(rec.name)
    byName.set(rec.name, rec)
  }
  return order.map((n) => byName.get(n)!).filter(Boolean)
}

async function writeMappingList(filepath: string, rows: HorseMappingRow[]) {
  const out = rows.map((r) => {
    const rec: Record<string, string> = {
      name: r.name,
      ahonoora_id: r.ahonoora_id || '',
      netkeiba_id: r.netkeiba_id || '',
      netkeiba_dam_id: r.netkeiba_dam_id || '',
      jbis_id: r.jbis_id || '',
      bogus_id: r.bogus_id || '',
      new_bogus_id: r.new_bogus_id || '',
    }
    if ((r.dam_id || '').trim()) rec.dam_id = r.dam_id!.trim()
    return rec
  })
  await fs.writeFile(
    filepath,
    JSON.stringify(out, null, 2) + '\n',
    'utf-8'
  )
}

export async function loadHorseMappingAdd(): Promise<HorseMappingRow[]> {
  return readMappingList(HORSE_MAPPING_ADD_PATH)
}

/**
 * 現在の add.json を horse_mapping.json にマージしてから、
 * incoming を add.json に書き出す。
 */
export async function rotateAndWriteMappingAdd(
  incoming: HorseMappingRow[]
): Promise<{ movedCount: number; addCount: number }> {
  const currentAdd = await readMappingList(HORSE_MAPPING_ADD_PATH)
  const master = await readMappingList(HORSE_MAPPING_PATH)
  const merged = mergeMappings(master, currentAdd)
  await writeMappingList(HORSE_MAPPING_PATH, merged)
  await writeMappingList(HORSE_MAPPING_ADD_PATH, incoming)
  return { movedCount: currentAdd.length, addCount: incoming.length }
}
