import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import {
  collectOffspringForSires,
  loadTraditionalRootIds,
  scanIncompleteSires,
  scanMissingSireGroups,
  scanRootFourGenNeeded,
  stripTrailingCountryParen,
} from '@/lib/sire-manual-missing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QUEUE_PATH = path.join(
  process.cwd(),
  'scraping',
  'output',
  'sire_manual_queue.json'
)
export type EditMode = 'sire' | 'missing_sire' | 'root'

type QueueItem = {
  child_id?: string
  child_name?: string
  child_netkeiba_id?: string
  sire_name?: string
  dam_name?: string
  filepath?: string
  reason?: string
  resolved?: boolean
  root_four_gen_needed?: boolean
  ancestry_present?: number
  ancestry_missing?: number
  ancestry_empty_nodes?: number
  skip_scrape_reason?: string
  related_children?: Array<{
    id: string
    name: string
    filename: string
    filepath: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
    netkeibaId?: string
  }>
  family_pages?: Array<{
    filename: string
    pedigreeName: string
    rootHorseId: string
    familyHref: string
  }>
  source?: 'queue_file' | 'traditional_scan' | 'sire_scan'
  related_children_total?: number
}

function isSirePath(filepath = ''): boolean {
  return filepath.replace(/\\/g, '/').includes('pedigree-sires/')
}

function classifyMode(item: QueueItem): EditMode | null {
  if (item.resolved) return null
  if (!item.child_id) return null

  if (
    item.root_four_gen_needed ||
    item.reason === 'root_incomplete_four_gen_pedigree'
  ) {
    return 'root'
  }

  if (item.reason === 'no_father_netkeiba_id') {
    return 'missing_sire'
  }

  if (
    item.reason === 'incomplete_four_gen_pedigree' &&
    isSirePath(item.filepath || '')
  ) {
    return 'sire'
  }

  return null
}

async function loadQueueFileItems(): Promise<QueueItem[]> {
  try {
    const raw = await fs.readFile(QUEUE_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return (data.items || []) as QueueItem[]
  } catch {
    return []
  }
}

/**
 * 非牝祖の none ケースを父馬名単位に集約。
 * ファイルキューの no_father も、牝祖でなければ足す。
 */
async function buildMissingSireItems(
  fileItems: QueueItem[],
  rootIds: Set<string>
): Promise<QueueItem[]> {
  const scanned = await scanMissingSireGroups()
  const bySire = new Map<string, QueueItem>()

  for (const group of scanned) {
    bySire.set(group.sireName, {
      child_id: group.primaryChildId,
      child_name: group.primaryChildName,
      child_netkeiba_id:
        group.relatedChildren.find((c) => c.id === group.primaryChildId)
          ?.netkeibaId || '',
      sire_name: group.sireName,
      filepath: group.primaryFilepath,
      reason: 'no_father_netkeiba_id',
      related_children: group.relatedChildren,
      family_pages: group.familyPages,
      source: 'traditional_scan',
    })
  }

  for (const item of fileItems) {
    if (item.resolved) continue
    if (item.reason !== 'no_father_netkeiba_id') continue
    if (item.root_four_gen_needed) continue
    const rawSireName = (item.sire_name || '').trim()
    if (!rawSireName || rawSireName === '不詳') continue
    const sireName = stripTrailingCountryParen(rawSireName) || rawSireName
    if (bySire.has(sireName)) continue
    // 牝祖本人なら父馬未登録に載せない
    if (rootIds.has(item.child_id || '')) continue
    bySire.set(sireName, {
      ...item,
      sire_name: sireName,
      related_children: item.related_children || [
        {
          id: item.child_id || '',
          name: item.child_name || '',
          filename: path.basename(item.filepath || ''),
          filepath: item.filepath || '',
          pedigreeName: '',
          rootHorseId: '',
          familyHref: '',
          netkeibaId: item.child_netkeiba_id,
        },
      ],
      family_pages: item.family_pages || [],
      source: 'queue_file',
    })
  }

  return Array.from(bySire.values()).sort((a, b) =>
    (a.sire_name || '').localeCompare(b.sire_name || '', 'ja')
  )
}

/**
 * 牝祖4代が必要な牝祖をスキャンし、ファイルキューの root 件とマージ。
 */
async function buildRootFourGenItems(
  fileItems: QueueItem[]
): Promise<QueueItem[]> {
  const scanned = await scanRootFourGenNeeded()
  const byRoot = new Map<string, QueueItem>()

  for (const item of scanned) {
    byRoot.set(item.rootHorseId, {
      child_id: item.rootHorseId,
      child_name: item.rootName,
      child_netkeiba_id: item.netkeibaId,
      sire_name: item.sireName,
      dam_name: item.damName,
      filepath: item.filepath,
      reason: 'root_incomplete_four_gen_pedigree',
      root_four_gen_needed: item.skipScrapeReason === 'no_father_netkeiba_id',
      ancestry_present: item.ancestryPresent,
      ancestry_missing: item.ancestryMissing,
      skip_scrape_reason: item.skipScrapeReason,
      family_pages: [
        {
          filename: item.filename,
          pedigreeName: item.pedigreeName,
          rootHorseId: item.rootHorseId,
          familyHref: item.familyHref,
        },
      ],
      related_children: [
        {
          id: item.rootHorseId,
          name: item.rootName,
          filename: item.filename,
          filepath: item.filepath,
          pedigreeName: item.pedigreeName,
          rootHorseId: item.rootHorseId,
          familyHref: item.familyHref,
          netkeibaId: item.netkeibaId,
        },
      ],
      source: 'traditional_scan',
    })
  }

  for (const item of fileItems) {
    if (item.resolved) continue
    const mode = classifyMode(item)
    if (mode !== 'root') continue
    const rootId = item.child_id || ''
    if (!rootId || byRoot.has(rootId)) continue
    byRoot.set(rootId, {
      ...item,
      family_pages: item.family_pages || [],
      related_children: item.related_children || [],
      source: 'queue_file',
    })
  }

  return Array.from(byRoot.values()).sort((a, b) =>
    (a.child_name || '').localeCompare(b.child_name || '', 'ja')
  )
}

/**
 * pedigree-sires の4代パス未完了をスキャンし、ファイルキューの sire 件とマージ。
 */
async function buildIncompleteSireItems(
  fileItems: QueueItem[]
): Promise<QueueItem[]> {
  const resolvedIds = new Set(
    fileItems
      .filter(
        (item) =>
          item.resolved &&
          item.reason === 'incomplete_four_gen_pedigree' &&
          item.child_id
      )
      .map((item) => item.child_id as string)
  )
  const scanned = await scanIncompleteSires()
  const byId = new Map<string, QueueItem>()

  for (const item of scanned) {
    if (resolvedIds.has(item.horseId)) continue
    byId.set(item.horseId, {
      child_id: item.horseId,
      child_name: item.name,
      child_netkeiba_id: item.netkeibaId,
      sire_name: item.sireName,
      dam_name: item.damName,
      filepath: item.filepath,
      reason: 'incomplete_four_gen_pedigree',
      ancestry_present: item.ancestryPresent,
      ancestry_missing: item.ancestryMissing,
      source: 'sire_scan',
    })
  }

  for (const item of fileItems) {
    if (item.resolved) continue
    if (classifyMode(item) !== 'sire') continue
    const id = item.child_id || ''
    if (!id || byId.has(id)) continue
    byId.set(id, {
      ...item,
      source: 'queue_file',
    })
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.child_name || '').localeCompare(b.child_name || '', 'ja')
  )
}

export async function GET(req: NextRequest) {
  try {
    const fileItems = await loadQueueFileItems()
    const { searchParams } = new URL(req.url)
    const includeResolved = searchParams.get('includeResolved') === '1'
    const modeParam = (searchParams.get('mode') || 'sire') as EditMode | 'all'
    const counts = { sire: 0, missing_sire: 0, root: 0 }

    const rootIds = await loadTraditionalRootIds()
    const rootItems = await buildRootFourGenItems(fileItems)
    const missingSireItems = await buildMissingSireItems(fileItems, rootIds)
    const sireItemsRaw = await buildIncompleteSireItems(fileItems)
    const offspringBySire = await collectOffspringForSires(
      sireItemsRaw.map((item) => ({
        horseId: item.child_id || '',
        netkeibaId: item.child_netkeiba_id || '',
        name: item.child_name || '',
      }))
    )
    const sireItems: QueueItem[] = []
    for (const item of sireItemsRaw) {
      const preview = offspringBySire.get(item.child_id || '')
      // 在来に牝祖以外の産駒が無い種牡馬はキュー対象外（牝祖の父は牝祖4代で保持）
      if (!preview || preview.nonRootTotal === 0) continue
      item.related_children = preview.children
      item.related_children_total = preview.nonRootTotal
      sireItems.push(item)
    }

    const combined: { item: QueueItem; mode: EditMode }[] = []

    for (const item of sireItems) {
      if (!includeResolved && item.resolved) continue
      counts.sire += 1
      combined.push({ item, mode: 'sire' })
    }
    for (const item of missingSireItems) {
      counts.missing_sire += 1
      combined.push({ item, mode: 'missing_sire' })
    }
    for (const item of rootItems) {
      counts.root += 1
      combined.push({ item, mode: 'root' })
    }

    const filtered =
      modeParam === 'all'
        ? combined
        : combined.filter((x) => x.mode === modeParam)

    return NextResponse.json({
      count: filtered.length,
      totalInQueue: fileItems.length,
      scannedMissingSireGroups: missingSireItems.length,
      scannedRootFourGen: rootItems.length,
      scannedIncompleteSires: sireItems.length,
      droppedIncompleteSires: sireItemsRaw.length - sireItems.length,
      counts,
      mode: modeParam,
      items: filtered.map(({ item, mode }, index) => ({
        index,
        mode,
        id: item.child_id,
        name: item.child_name,
        displayName:
          mode === 'missing_sire'
            ? item.sire_name || '(父馬名なし)'
            : item.child_name,
        netkeibaId: item.child_netkeiba_id,
        sireName: item.sire_name,
        damName: item.dam_name,
        filepath: item.filepath,
        reason: item.reason,
        rootFourGenNeeded: Boolean(item.root_four_gen_needed),
        ancestryPresent: item.ancestry_present,
        ancestryMissing: item.ancestry_missing,
        ancestryEmptyNodes: item.ancestry_empty_nodes,
        skipScrapeReason: item.skip_scrape_reason,
        relatedChildren: item.related_children || [],
        relatedChildrenTotal: item.related_children_total ?? (item.related_children || []).length,
        familyPages: item.family_pages || [],
        source: item.source,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
