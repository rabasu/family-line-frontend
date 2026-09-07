'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BloodTableEditor, { type CellFetchSite } from './BloodTableEditor'
import SubjectFields from './SubjectFields'
import HorseMappingScrapePanel from './HorseMappingScrapePanel'
import { emptySubject, type EditorSubject, type RaceResultInput } from './subject'
import {
  PedigreePathNodeInput,
  allAncestryPaths,
  emptyNodeInput,
  nodeFromJson,
  pathLabelJa,
  shiftFetchedAncestryToBranch,
} from '@/lib/sire-pedigree-paths'
import type { Breed } from '@/types/Breed'

function subjectHasIdSource(s: EditorSubject) {
  return Boolean(
    s.id.trim() ||
      s.englishName.trim() ||
      s.name.trim() ||
      s.pedigreeName.trim()
  )
}

type QueueMode = 'sire' | 'missing_sire' | 'root'
type CreateMode = 'new_family' | 'new_horse' | 'new_horse_scrape' | 'edit_horse'
type EditMode = QueueMode | CreateMode

function isQueueMode(mode: EditMode): mode is QueueMode {
  return mode === 'sire' || mode === 'missing_sire' || mode === 'root'
}

type RelatedChild = {
  id: string
  name: string
  filename: string
  filepath: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
  netkeibaId?: string
}

type FamilyPageRef = {
  filename: string
  pedigreeName: string
  rootHorseId: string
  familyHref: string
}

type CatalogEntry = {
  id: string
  name: string
  englishName?: string
  pedigreeName?: string
  foaledYear?: number | null
  netkeibaId?: string
  store: 'sire' | 'traditional'
  filename: string
}

type TradHorseHit = {
  id: string
  name: string
  englishName?: string
  horsePedigreeName?: string
  sex?: string
  foaledYear?: number | null
  netkeibaId?: string
  sire?: string
  dam?: string
  filename: string
  filepath: string
  pedigreeName: string
  familyHref: string
  store?: 'traditional' | 'sire'
}

type QueueItem = {
  index: number
  mode: EditMode
  id: string
  name: string
  displayName?: string
  netkeibaId?: string
  sireName?: string
  damName?: string
  filepath?: string
  reason?: string
  rootFourGenNeeded?: boolean
  ancestryPresent?: number
  ancestryMissing?: number
  relatedChildren?: RelatedChild[]
  relatedChildrenTotal?: number
  familyPages?: FamilyPageRef[]
  skipScrapeReason?: string
  missingBreeder?: boolean
}

type PedigreePayload = {
  mode: EditMode
  filepath: string | null
  filename: string | null
  isNew?: boolean
  childId?: string
  childName?: string
  familyHref?: string
  pedigreeName?: string
  data: {
    metadata?: Record<string, unknown>
    horse?: {
      id: string
      name?: string
      englishName?: string
      color?: string
      breed?: Breed
      breeder?: string
      importedYear?: string
      registration?: string
      owner?: string
      foaled?: { year?: number }
      netkeibaId?: string
      pedigreeQueryId?: string
      allBreedPedigreeId?: string
      sire?: string
      dam?: string
      source?: string
      comments?: string
      comment?: string
      ancestryByPath?: Record<
        string,
        {
          name?: string
          foaled?: { year?: number }
          color?: string
          sex?: 'male' | 'female' | 'gelding'
          breed?: Breed
          netkeibaId?: string
        }
      >
    }
  }
}

const UNKNOWN = '不詳'

function isBlank(v?: string | null): boolean {
  return !(v || '').trim()
}

function isBlankName(v?: string | null): boolean {
  const t = (v || '').trim()
  return !t || t === UNKNOWN
}

function recordedParentNames(
  horse?: { sire?: string; dam?: string },
  fallback?: { sire?: string; dam?: string }
): { sire: string; dam: string } {
  const sire = (horse?.sire || fallback?.sire || '').trim()
  const dam = (horse?.dam || fallback?.dam || '').trim()
  return {
    sire: isBlankName(sire) ? '' : sire,
    dam: isBlankName(dam) ? '' : dam,
  }
}

/** 取得結果を既存入力へマージ（入力済みは維持） */
function mergeFetchedAncestry(
  current: Record<string, PedigreePathNodeInput>,
  fetched: Record<
    string,
    {
      name?: string
      sex?: 'male' | 'female' | 'gelding'
      color?: string
      breed?: string
      foaledYear?: number | null
    }
  >,
  options?: {
    /** 馬名があるのに breed が空のとき埋める（例: pedigreequery → サラ） */
    defaultBreedWhenNamed?: Breed
  }
): Record<string, PedigreePathNodeInput> {
  const next = { ...current }
  for (const path of allAncestryPaths(4)) {
    const cur = next[path] || nodeFromJson(path)
    const src = fetched[path]
    if (!src) {
      next[path] = cur
      continue
    }
    const merged: PedigreePathNodeInput = { ...cur }
    if (isBlankName(cur.name) && src.name) merged.name = src.name
    if (isBlank(cur.color) && src.color) merged.color = src.color
    if (isBlank(cur.breed) && src.breed) {
      merged.breed = src.breed as Breed
    }
    if (
      options?.defaultBreedWhenNamed &&
      isBlank(merged.breed) &&
      !isBlankName(merged.name)
    ) {
      merged.breed = options.defaultBreedWhenNamed
    }
    if (isBlank(cur.foaledYear) && src.foaledYear != null) {
      merged.foaledYear = String(src.foaledYear)
    }
    if (!cur.sex && src.sex) merged.sex = src.sex
    next[path] = merged
  }
  return next
}

type FetchSite = CellFetchSite
type FetchKey = FetchSite | `${FetchSite}-${string}`

function cellPathFromFetchKey(key: FetchKey | null): string | null {
  if (!key) return null
  if (key.startsWith('pedigreequery-')) return key.slice('pedigreequery-'.length)
  if (key.startsWith('allbreed-')) return key.slice('allbreed-'.length)
  return null
}

const MODE_META: Record<
  EditMode,
  { label: string; title: string; help: string }
> = {
  sire: {
    label: '種牡馬不完全',
    title: '種牡馬4代血統 人力補正',
    help: '4代が欠けているか、生産者（産地）が空で、在来に産駒がいる種牡馬。',
  },
  missing_sire: {
    label: '父馬未登録',
    title: '父馬4代血統 手動登録',
    help: 'sireNetkeibaId=none の父馬。',
  },
  root: {
    label: '牝祖4代',
    title: '在来牝祖4代血統 人力補正',
    help: '4代が欠けている在来牝祖。',
  },
  new_family: {
    label: '新規牝系',
    title: '新規在来牝系の作成',
    help: '在来牝系 JSON と MDX を新規作成。',
  },
  new_horse: {
    label: '新規馬（母登録済）',
    title: '新規馬の追加（母馬は在来登録済み）',
    help: '母が在来登録済みの産駒を追加。',
  },
  edit_horse: {
    label: '既存馬編集',
    title: '既存馬の編集（コメント・競走成績）',
    help: '在来牝系の登録済み馬を検索して、コメントや重賞成績などを更新する。4代血統は触らない。',
  },
  new_horse_scrape: {
    label: '新規馬（netkeiba）',
    title: '新規馬の追加（母馬未登録・netkeiba あり）',
    help: 'horse_mapping_add.json からスクレイピング。',
  },
}

function raceResultsFromHorse(raw: unknown): RaceResultInput[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const r = (item || {}) as Record<string, unknown>
    const date = (r.date || {}) as Record<string, unknown>
    return {
      race: String(r.race || ''),
      displayRace: String(r.displayRace || ''),
      year: date.year != null ? String(date.year) : '',
      month: date.month != null ? String(date.month) : '',
      day: date.day != null ? String(date.day) : '',
      grade: String(r.grade || ''),
      racecourse: String(r.racecourse || ''),
      distance: String(r.distance || ''),
      entry: String(r.entry || ''),
      favorite: String(r.favorite || ''),
      result: String(r.result || ''),
    }
  })
}

function subjectFromHorse(
  horse: Record<string, unknown>,
  fallbackName = ''
): EditorSubject {
  const foaled = (horse.foaled || {}) as {
    year?: number
    month?: number
    day?: number
  }
  const stats = horse.raceStats as
    | { total?: { runs?: number | null; wins?: number | null } }
    | undefined
  const base = emptySubject()
  return {
    ...base,
    name: String(horse.name || fallbackName || ''),
    englishName: String(horse.englishName || ''),
    pedigreeName: String(horse.pedigreeName || ''),
    formerName: String(horse.formerName || ''),
    localName: String(horse.localName || ''),
    formerPedigreeName: String(horse.formerPedigreeName || ''),
    color: String(horse.color || ''),
    breed: (horse.breed as Breed | undefined) || '',
    breeder: String(horse.breeder || ''),
    importedYear: String(horse.importedYear || ''),
    importedBy: String(horse.importedBy || ''),
    familyNumber: String(horse.familyNumber || ''),
    registration: String(horse.registration || ''),
    owner: String(horse.owner || ''),
    foaledYear: foaled.year != null ? String(foaled.year) : '',
    foaledMonth: foaled.month != null ? String(foaled.month) : '',
    foaledDay: foaled.day != null ? String(foaled.day) : '',
    netkeibaId: String(horse.netkeibaId || ''),
    pedigreeQueryId: String(horse.pedigreeQueryId || ''),
    allBreedPedigreeId: String(horse.allBreedPedigreeId || ''),
    id: String(horse.id || ''),
    sex: (horse.sex as EditorSubject['sex']) || '',
    source: String(horse.source || ''),
    comment: String(horse.comment || horse.comments || ''),
    raceStatsRuns:
      stats?.total?.runs != null ? String(stats.total.runs) : '',
    raceStatsWins:
      stats?.total?.wins != null ? String(stats.total.wins) : '',
    raceResults: raceResultsFromHorse(horse.raceResults),
  }
}

function buildInputFromHorse(
  ancestryByPath?: PedigreePayload['data']['horse'] extends undefined
    ? never
    : NonNullable<PedigreePayload['data']['horse']>['ancestryByPath'],
  knownParents?: { sire?: string; dam?: string }
): Record<string, PedigreePathNodeInput> {
  const input: Record<string, PedigreePathNodeInput> = {}
  for (const path of allAncestryPaths(4)) {
    input[path] = nodeFromJson(path, ancestryByPath?.[path])
  }
  const sire = (knownParents?.sire || '').trim()
  const dam = (knownParents?.dam || '').trim()
  if (sire && isBlankName(input.s?.name)) {
    input.s = { ...(input.s || emptyNodeInput('s')), name: sire }
  }
  if (dam && isBlankName(input.d?.name)) {
    input.d = { ...(input.d || emptyNodeInput('d')), name: dam }
  }
  return input
}

export default function SirePedigreeEditor() {
  const [mode, setMode] = useState<EditMode>('sire')
  const [counts, setCounts] = useState({ sire: 0, missing_sire: 0, root: 0 })
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState<FetchKey | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [payload, setPayload] = useState<PedigreePayload | null>(null)
  const [ancestryInput, setAncestryInput] = useState<
    Record<string, PedigreePathNodeInput>
  >({})
  const [subject, setSubject] = useState<EditorSubject>(emptySubject)
  const [idConflict, setIdConflict] = useState('')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogSuggestions, setCatalogSuggestions] = useState<CatalogEntry[]>(
    []
  )
  const [catalogResults, setCatalogResults] = useState<CatalogEntry[]>([])
  const [catalogSearching, setCatalogSearching] = useState(false)
  const [linkingExisting, setLinkingExisting] = useState(false)
  const [netkeibaOnlyId, setNetkeibaOnlyId] = useState('')
  const [settingNetkeibaOnly, setSettingNetkeibaOnly] = useState(false)
  const [tradDamQuery, setTradDamQuery] = useState('')
  const [tradSireQuery, setTradSireQuery] = useState('')
  const [tradDamHits, setTradDamHits] = useState<TradHorseHit[]>([])
  const [tradSireHits, setTradSireHits] = useState<TradHorseHit[]>([])
  const [tradDam, setTradDam] = useState<TradHorseHit | null>(null)
  const [tradSire, setTradSire] = useState<TradHorseHit | null>(null)
  const [tradSearching, setTradSearching] = useState<'dam' | 'sire' | null>(
    null
  )
  const [savingTraditional, setSavingTraditional] = useState(false)
  const [externalSireName, setExternalSireName] = useState('')
  const [externalSireNetkeibaId, setExternalSireNetkeibaId] = useState('')
  const [editQuery, setEditQuery] = useState('')
  const [editHits, setEditHits] = useState<TradHorseHit[]>([])
  const [editSearching, setEditSearching] = useState(false)
  const [editTarget, setEditTarget] = useState<TradHorseHit | null>(null)

  const current = isQueueMode(mode) ? queue[cursor] || null : null
  const meta = MODE_META[mode]
  const modeRef = useRef(mode)
  modeRef.current = mode
  const editSearchGen = useRef(0)

  const loadQueue = useCallback(async (nextMode: EditMode) => {
    if (!isQueueMode(nextMode)) {
      setLoading(false)
      setQueue([])
      setCursor(0)
      setPayload(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/tools/sire-manual-queue?mode=${encodeURIComponent(nextMode)}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'queue load failed')
      setCounts(json.counts || { sire: 0, missing_sire: 0, root: 0 })
      setQueue(json.items || [])
      setCursor(0)
      setPayload(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTarget = useCallback(
    async (item: QueueItem) => {
      setError('')
      setStatus('')
      setPayload(null)
      setTradDam(null)
      setTradSire(null)
      setTradDamHits([])
      setTradSireHits([])
      setTradDamQuery('')
      setTradSireQuery('')
      setExternalSireName('')
      setExternalSireNetkeibaId('')
      try {
        const params = new URLSearchParams({
          id: item.id,
          mode: item.mode,
        })
        if (item.filepath) params.set('filepath', item.filepath)
        if (item.sireName) params.set('sireName', item.sireName)
        const res = await fetch(`/api/tools/sire-pedigree?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'load failed')
        if (!isQueueMode(modeRef.current) || modeRef.current !== item.mode) {
          return
        }
        setPayload(json)
        const horse = json.data?.horse || {}
        setAncestryInput(
          buildInputFromHorse(horse.ancestryByPath, {
            sire: horse.sire,
            dam: horse.dam,
          })
        )
        setSubject(
          subjectFromHorse(horse, item.mode === 'missing_sire' ? item.sireName || '' : '')
        )
        setExternalSireName(horse.sire || '')
        setExternalSireNetkeibaId(horse.sireNetkeibaId || '')
      } catch (e) {
        if (!isQueueMode(modeRef.current)) return
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    []
  )

  useEffect(() => {
    loadQueue(mode)
  }, [mode, loadQueue])

  useEffect(() => {
    if (isQueueMode(mode)) return
    setSubject({
      ...emptySubject(),
      sex: mode === 'new_family' ? 'female' : '',
    })
    setAncestryInput(buildInputFromHorse())
    setPayload(null)
    setTradDam(null)
    setTradSire(null)
    setTradDamHits([])
    setTradSireHits([])
    setTradDamQuery('')
    setTradSireQuery('')
    setExternalSireName('')
    setExternalSireNetkeibaId('')
    setEditQuery('')
    setEditHits([])
    setEditTarget(null)
    setIdConflict('')
    setError('')
    setStatus('')
  }, [mode])

  useEffect(() => {
    if (!isQueueMode(mode) || !current?.id) return
    loadTarget(current)
  }, [mode, current?.id, current?.mode, loadTarget])

  useEffect(() => {
    if (mode !== 'missing_sire' || !current?.sireName) {
      setCatalogSuggestions([])
      setCatalogResults([])
      setCatalogQuery('')
      setNetkeibaOnlyId('')
      return
    }
    setCatalogQuery(current.sireName)
    setNetkeibaOnlyId('')
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/tools/sire-catalog?hint=${encodeURIComponent(current.sireName || '')}&q=${encodeURIComponent(current.sireName || '')}&limit=12`
        )
        const json = await res.json()
        if (!res.ok || cancelled) return
        setCatalogSuggestions(json.suggestions || [])
        setCatalogResults(json.items || [])
      } catch {
        if (!cancelled) {
          setCatalogSuggestions([])
          setCatalogResults([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, current?.id, current?.sireName])

  const searchTraditionalHorse = async (role: 'dam' | 'sire') => {
    const q = (role === 'dam' ? tradDamQuery : tradSireQuery).trim()
    if (!q) return
    setTradSearching(role)
    setError('')
    try {
      const params = new URLSearchParams({ q, limit: '20' })
      if (role === 'sire') params.set('includeSires', '1')
      const res = await fetch(`/api/tools/traditional-horse?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'traditional search failed')
      const items = (json.items || []) as TradHorseHit[]
      if (role === 'dam') setTradDamHits(items)
      else setTradSireHits(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTradSearching(null)
    }
  }

  const saveToTraditional = async () => {
    const sireName = (tradSire?.name || externalSireName).trim()
    if (!current?.id || !tradDam || !sireName) return
    const horseId = subject.id || current.id
    const sireFilename =
      payload?.filename ||
      (current.filepath || '').replace(/\\/g, '/').split('/').pop() ||
      ''
    const proceed = window.confirm(
      `id「${horseId}」を ${tradDam.filename} に書くと、` +
        `種牡馬JSON（${sireFilename || 'pedigree-sires'}）と牝系JSONで同じ id が重複します。\n\n` +
        `在来牝系への保存を続行しますか？`
    )
    if (!proceed) return
    const deleteSireFile = window.confirm(
      `元の種牡馬ファイル ${sireFilename || horseId + '.json'} を削除しますか？\n\n` +
        `OK: 削除する（在来側だけ残す）\n` +
        `キャンセル: 種牡馬ファイルは残す`
    )
    setSavingTraditional(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          mode: 'sire',
          saveToTraditional: true,
          traditionalDamId: tradDam.id,
          traditionalSireId: tradSire?.id || '',
          traditionalSireName: sireName,
          traditionalSireNetkeibaId: (
            tradSire?.netkeibaId ||
            externalSireNetkeibaId
          ).trim(),
          subject,
          markResolved: true,
          deleteSireFile,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'traditional save failed')
      const sireNote = json.sireId
        ? `父 ${json.sireName}（id=${json.sireId}）`
        : `父 ${json.sireName}` +
          (json.sireNetkeibaId
            ? ` / sireNetkeibaId=${json.sireNetkeibaId}`
            : ' / sireIdなし（collect 待ち）')
      setStatus(
        `在来牝系に${json.created ? '追加' : '更新'}しました（${json.filename} / ${sireNote} / 母 ${json.damName}）。` +
          (json.sireFileDeleted
            ? ` 種牡馬ファイル ${json.sireFileDeleted} は削除しました。`
            : ' 種牡馬ファイルは残しています。') +
          ' 種牡馬キューからは外しています。'
      )
      setQueue((prev) => {
        const nextQueue = prev.filter((q) => q.id !== current.id)
        setCursor((c) => Math.min(c, Math.max(0, nextQueue.length - 1)))
        return nextQueue
      })
      setCounts((c) => ({
        ...c,
        sire: Math.max(0, (c.sire || 0) - 1),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingTraditional(false)
    }
  }

  const searchCatalog = async () => {
    const q = catalogQuery.trim()
    if (!q) return
    setCatalogSearching(true)
    setError('')
    try {
      const res = await fetch(
        `/api/tools/sire-catalog?q=${encodeURIComponent(q)}&hint=${encodeURIComponent(current?.sireName || q)}&limit=30`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'catalog search failed')
      setCatalogResults(json.items || [])
      setCatalogSuggestions(json.suggestions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCatalogSearching(false)
    }
  }

  const removeCurrentFromMissingQueue = () => {
    if (!current) return
    setQueue((prev) => {
      const nextQueue = prev.filter((q) => {
        if (current.sireName && q.mode === 'missing_sire') {
          return q.sireName !== current.sireName
        }
        return q.id !== current.id
      })
      setCursor((c) => Math.min(c, Math.max(0, nextQueue.length - 1)))
      return nextQueue
    })
    setCounts((c) => ({
      ...c,
      missing_sire: Math.max(0, (c.missing_sire || 0) - 1),
    }))
  }

  const linkExistingSire = async (entry: CatalogEntry) => {
    if (!current?.id) return
    setLinkingExisting(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          mode: 'missing_sire',
          linkExistingSireId: entry.id,
          relatedChildIds: (current.relatedChildren || [])
            .map((c) => c.id)
            .filter(Boolean),
          queueSireName: current.sireName || '',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'link failed')
      setStatus(
        `登録済み種牡馬に紐づけました（${entry.name} / id=${entry.id}` +
          (json.linkedCount != null ? ` / 子 ${json.linkedCount}頭` : '') +
          '）。新規ファイルは作っていません。'
      )
      removeCurrentFromMissingQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLinkingExisting(false)
    }
  }

  const applyNetkeibaIdOnly = async () => {
    if (!current?.id) return
    const nk = netkeibaOnlyId.trim()
    if (!nk) {
      setError('netkeibaId を入力してください')
      return
    }
    setSettingNetkeibaOnly(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          mode: 'missing_sire',
          setSireNetkeibaIdOnly: nk,
          relatedChildIds: (current.relatedChildren || [])
            .map((c) => c.id)
            .filter(Boolean),
          queueSireName: current.sireName || '',
          subject: { name: subject.name || current.sireName || '' },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'set netkeibaId failed')
      setStatus(
        `産駒の sireNetkeibaId を設定しました（${nk}` +
          (json.linkedCount != null ? ` / ${json.linkedCount}頭` : '') +
          '）。種牡馬ファイルは作っていません。あとで collect_sire_pedigrees が4代取得します。'
      )
      setNetkeibaOnlyId('')
      removeCurrentFromMissingQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSettingNetkeibaOnly(false)
    }
  }

  const progressLabel = useMemo(() => {
    if (!queue.length) return '対象なし'
    return `${cursor + 1} / ${queue.length}`
  }, [cursor, queue.length])

  const filledCount = useMemo(() => {
    return Object.values(ancestryInput).filter((n) => (n.name || '').trim()).length
  }, [ancestryInput])

  const recordedParents = useMemo(
    () =>
      recordedParentNames(payload?.data?.horse, {
        sire: current?.mode === 'root' ? current.sireName : '',
        dam: current?.damName,
      }),
    [
      payload?.data?.horse,
      current?.mode,
      current?.sireName,
      current?.damName,
    ]
  )

  const fetchFromPedigreeOnline = async (
    site: FetchSite,
    options?: { branch?: string; id?: string }
  ) => {
    const branch = options?.branch
    const id = (
      options?.id ||
      (site === 'pedigreequery'
        ? subject.pedigreeQueryId
        : subject.allBreedPedigreeId)
    ).trim()
    if (!id) {
      const who = branch ? `${pathLabelJa(branch)}の` : ''
      setError(
        site === 'pedigreequery'
          ? `${who}pedigreeQueryId を入力してください`
          : `${who}allBreedPedigreeId を入力してください`
      )
      return
    }
    const fetchKey: FetchKey = branch ? `${site}-${branch}` : site
    setFetching(fetchKey)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/pedigree-online-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, id }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(
          json.error ||
            json.detail ||
            `取得失敗 (${site})` +
              (json.attempts
                ? `: ${JSON.stringify(json.attempts)}`
                : '')
        )
      }

      const fetched = (json.ancestryByPath || {}) as Record<
        string,
        {
          name?: string
          sex?: 'male' | 'female' | 'gelding'
          color?: string
          breed?: string
          foaledYear?: number | null
        }
      >
      const toMerge = branch
        ? shiftFetchedAncestryToBranch(branch, json.subject || {}, fetched)
        : fetched
      setAncestryInput((prev) =>
        mergeFetchedAncestry(prev, toMerge, {
          defaultBreedWhenNamed:
            site === 'pedigreequery' ? 'サラ' : undefined,
        })
      )

      if (!branch) {
        const sub = json.subject || {}
        setSubject((prev) => {
          const next = { ...prev }
          if (isBlank(prev.englishName) && sub.englishName) {
            next.englishName = sub.englishName
          }
          if (isBlank(prev.color) && sub.color) next.color = sub.color
          if (isBlank(prev.breed) && sub.breed) next.breed = sub.breed as Breed
          if (isBlank(prev.foaledYear) && sub.foaledYear != null) {
            next.foaledYear = String(sub.foaledYear)
          }
          if (site === 'pedigreequery') next.pedigreeQueryId = json.id || id
          if (site === 'allbreed') next.allBreedPedigreeId = json.id || id
          return next
        })
      }

      const side = branch ? pathLabelJa(branch) : '本人'
      const subjectName = (
        json.subject?.englishName ||
        json.subject?.name ||
        ''
      ).trim()
      setStatus(
        `${side}を取得完了（` +
          (subjectName ? `${subjectName} / ` : '') +
          `${json.fetchSource} / ${Object.keys(toMerge).length} paths）。` +
          (branch
            ? 'ページ本人をそのマスに載せ、より遠い世代だけ空欄を埋めました。他の枝は触っていません。'
            : '入力済み項目は維持し、空欄のみ埋めました。') +
          '内容を確認して保存してください。'
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setFetching(null)
    }
  }

  const save = async (goNext: boolean, draft = false) => {
    if (!current?.id) return
    if (
      !draft &&
      current.mode === 'sire' &&
      current.reason === 'missing_breeder' &&
      !subject.breeder.trim()
    ) {
      setError('生産者（産地）が空です。国名や牧場名を入れてから保存して。')
      return
    }
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: current.id,
          mode: current.mode,
          filepath: current.filepath,
          ancestryInput,
          subject,
          draft,
          markResolved: !draft,
          relatedChildIds:
            current.mode === 'missing_sire'
              ? (current.relatedChildren || []).map((c) => c.id).filter(Boolean)
              : undefined,
          queueSireName:
            current.mode === 'missing_sire' ? current.sireName || '' : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      const extras: string[] = []
      if (json.sireId) extras.push(`sireId=${json.sireId}`)
      if (json.linkedCount != null) {
        extras.push(`子へ sireId 書戻し ${json.linkedCount}頭`)
      } else if (json.childLinked) {
        extras.push('子へ sireId 書戻し済')
      }
      if (draft) {
        setStatus(
          `一時保存しました（${json.filename} / ${json.ancestryCount} paths）。` +
            '空欄はそのまま残し、キューからも外していません。'
        )
        return
      }
      const breederOnly = current.reason === 'missing_breeder'
      setStatus(
        breederOnly
          ? `保存しました（${json.filename} / 生産者 ${subject.breeder.trim()}）。`
          : `保存しました（${json.filename} / ${json.ancestryCount} paths` +
            (extras.length ? ` / ${extras.join(' / ')}` : '') +
            '）。空欄は「不詳」で埋め済み。'
      )
      setQueue((prev) => {
        const stillNeedBreeder =
          Boolean(
            current.missingBreeder || current.reason === 'missing_breeder'
          ) && !subject.breeder.trim()
        if (stillNeedBreeder) {
          if (goNext) {
            setCursor((c) => Math.min(c + 1, Math.max(0, prev.length - 1)))
          }
          return prev
        }
        const nextQueue = prev.filter((q) => {
          if (
            current.mode === 'missing_sire' &&
            current.sireName &&
            q.mode === 'missing_sire'
          ) {
            return q.sireName !== current.sireName
          }
          return q.id !== current.id
        })
        if (goNext) {
          setCursor((c) => Math.min(c, Math.max(0, nextQueue.length - 1)))
        }
        return nextQueue
      })
      setCounts((c) => ({
        ...c,
        [mode]: Math.max(0, (c[mode] || 0) - 1),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (mode !== 'new_family' && mode !== 'new_horse') {
      setIdConflict('')
      return
    }
    if (!subjectHasIdSource(subject)) {
      setIdConflict('')
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          checkId: subject.id,
          englishName: subject.englishName,
          name: subject.name,
          pedigreeName: subject.pedigreeName,
        })
        const res = await fetch(`/api/tools/traditional-horse?${params}`)
        const json = await res.json()
        if (cancelled || !res.ok) return
        if (json.taken) {
          const bits: string[] = []
          if (json.idTaken) bits.push(`id「${json.horseId}」は ${json.existingIdFile}`)
          if (mode === 'new_family' && json.filenameTaken) {
            bits.push(`ファイル名「${json.existingFilename || json.filename}」`)
          }
          if (json.idTaken || (mode === 'new_family' && json.filenameTaken)) {
            setIdConflict(`${bits.join(' / ')} と重複。id を変更してください。`)
          } else {
            setIdConflict('')
          }
        } else {
          setIdConflict('')
        }
      } catch {
        if (!cancelled) setIdConflict('')
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [mode, subject.id, subject.englishName, subject.name, subject.pedigreeName])

  const saveNewFamily = async (draft = false) => {
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subject.id.trim() || 'new',
          mode: 'new_family',
          ancestryInput,
          subject: { ...subject, sex: 'female' },
          draft,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      setStatus(
        `在来牝系を作成しました（${json.filename} / id=${json.horseId}` +
          (json.mdxCreated ? ' / MDX 作成' : '') +
          (json.familyHref ? ` / ${json.familyHref}` : '') +
          '）。牝系ページは dev 再起動後に確実に出ます。'
      )
      setSubject((prev) => ({ ...prev, id: json.horseId || prev.id }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const saveNewHorse = async () => {
    const sireName = (tradSire?.name || externalSireName).trim()
    if (!tradDam || !sireName) {
      setError('母馬と父馬（検索または馬名）が必要です')
      return
    }
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: subject.id.trim() || 'new',
          mode: 'new_horse',
          subject,
          traditionalDamId: tradDam.id,
          traditionalSireId: tradSire?.id || '',
          traditionalSireName: sireName,
          traditionalSireNetkeibaId: (
            tradSire?.netkeibaId ||
            externalSireNetkeibaId
          ).trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      const sireNote = json.sireId
        ? `父 ${json.sireName}（id=${json.sireId}）`
        : `父 ${json.sireName}` +
          (json.sireNetkeibaId
            ? ` / sireNetkeibaId=${json.sireNetkeibaId}`
            : ' / sireIdなし（collect 待ち）')
      setStatus(
        `在来牝系に追加しました（${json.filename} / id=${json.horseId} / ${sireNote} / 母 ${json.damName}）。`
      )
      setSubject((prev) => ({ ...prev, id: json.horseId || prev.id }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const searchEditHorse = async () => {
    const q = editQuery.trim()
    if (!q) return
    const gen = ++editSearchGen.current
    setEditSearching(true)
    setError('')
    try {
      const params = new URLSearchParams({ q, limit: '20' })
      const res = await fetch(`/api/tools/traditional-horse?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'traditional search failed')
      if (gen !== editSearchGen.current || modeRef.current !== 'edit_horse') {
        return
      }
      setEditHits((json.items || []) as TradHorseHit[])
    } catch (e) {
      if (gen !== editSearchGen.current) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (gen === editSearchGen.current) setEditSearching(false)
    }
  }

  const loadEditHorse = async (hit: TradHorseHit) => {
    setError('')
    editSearchGen.current += 1
    setEditHits([])
    setEditSearching(false)
    try {
      const params = new URLSearchParams({
        id: hit.id,
        mode: 'edit_horse',
      })
      const res = await fetch(`/api/tools/sire-pedigree?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'load failed')
      if (modeRef.current !== 'edit_horse') return
      setPayload(json)
      const horse = json.data?.horse || {}
      setSubject(subjectFromHorse(horse))
      setEditTarget({
        ...hit,
        familyHref: json.familyHref || hit.familyHref,
        pedigreeName: json.pedigreeName || hit.pedigreeName,
        filename: json.filename || hit.filename,
        filepath: json.filepath || hit.filepath,
      })
      setEditHits([])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const saveEditHorse = async () => {
    const horseId = (subject.id || editTarget?.id || '').trim()
    if (!horseId) {
      setError('編集対象の馬を選んでください')
      return
    }
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const res = await fetch('/api/tools/sire-pedigree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: horseId,
          mode: 'edit_horse',
          subject,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'save failed')
      setStatus(
        `更新しました（${json.filename} / id=${json.horseId}` +
          (json.familyHref ? ` / ${json.familyHref}` : '') +
          '）。'
      )
      if (editTarget) {
        await loadEditHorse(editTarget)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const showEditor =
    mode === 'new_family' ||
    mode === 'new_horse' ||
    mode === 'edit_horse' ||
    (isQueueMode(mode) && Boolean(current))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 text-stone-900">
      <header className="mb-6 border-b border-stone-300 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-stone-600">{meta.help}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(MODE_META) as EditMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={
                m === mode
                  ? 'rounded bg-stone-900 px-3 py-1.5 text-sm text-white'
                  : 'rounded border border-stone-400 px-3 py-1.5 text-sm hover:bg-stone-100'
              }
              onClick={() => setMode(m)}
            >
              {MODE_META[m].label}
              {isQueueMode(m) ? (
                <span className="ml-1 font-mono text-xs opacity-80">
                  ({counts[m] ?? 0})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {isQueueMode(mode) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded bg-stone-800 px-2 py-1 font-mono text-white">
            {progressLabel}
          </span>
          <button
            type="button"
            className="rounded border border-stone-400 px-3 py-1 hover:bg-stone-100"
            onClick={() => loadQueue(mode)}
          >
            キュー再読込
          </button>
          <button
            type="button"
            className="rounded border border-stone-400 px-3 py-1 disabled:opacity-40"
            disabled={cursor <= 0}
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
          >
            ← 前へ
          </button>
          <button
            type="button"
            className="rounded border border-stone-400 px-3 py-1 disabled:opacity-40"
            disabled={cursor >= queue.length - 1}
            onClick={() => setCursor((c) => Math.min(queue.length - 1, c + 1))}
          >
            次へ →
          </button>
        </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {status && (
        <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {status}
        </div>
      )}

      {mode === 'new_horse_scrape' ? (
        <HorseMappingScrapePanel />
      ) : loading && isQueueMode(mode) ? (
        <p className="text-stone-600">キューを読み込み中…</p>
      ) : isQueueMode(mode) && !current ? (
        <p className="text-stone-600">このタブの残作業はありません。</p>
      ) : showEditor ? (
        <>
          <section className="mb-4 rounded border border-stone-300 bg-stone-50 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-stone-200 pb-3">
              <div className="min-w-0">
                <div className="text-xs text-stone-500">
                  対象（{MODE_META[(current?.mode || mode)].label}）
                </div>
                <div className="text-lg font-medium">
                  {current
                    ? current.displayName || current.name
                    : mode === 'edit_horse'
                      ? editTarget?.name || '編集する馬を検索'
                      : subject.name || '新規入力'}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-600">
                  {current?.mode === 'missing_sire' && current.sireName ? (
                    <span className="text-amber-800">
                      父馬名: {current.sireName}（sireNetkeibaId=none）
                    </span>
                  ) : null}
                  {(current && current.mode !== 'missing_sire') ||
                  (mode === 'edit_horse' && editTarget && subject.id) ? (
                    <span className="font-mono">
                      id: {current?.id || subject.id}
                    </span>
                  ) : null}
                  {(current?.netkeibaId && current.mode !== 'missing_sire') ||
                  (mode === 'edit_horse' &&
                    editTarget &&
                    subject.netkeibaId) ? (
                    <a
                      className="text-sky-700 underline"
                      href={`https://db.netkeiba.com/horse/ped/${current?.netkeibaId || subject.netkeibaId}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      netkeiba 血統
                    </a>
                  ) : null}
                  {(mode !== 'edit_horse' || editTarget) &&
                  (recordedParents.sire || recordedParents.dam) ? (
                    <span>
                      {recordedParents.sire ? <>父: {recordedParents.sire}</> : null}
                      {recordedParents.sire && recordedParents.dam ? (
                        <span className="mx-1.5 text-stone-400">/</span>
                      ) : null}
                      {recordedParents.dam ? <>母: {recordedParents.dam}</> : null}
                    </span>
                  ) : null}
                  {mode === 'edit_horse' &&
                  editTarget &&
                  (payload?.filename || editTarget?.filename) ? (
                    <span className="font-mono">
                      {payload?.filename || editTarget?.filename}
                    </span>
                  ) : null}
                  {mode === 'edit_horse' &&
                  editTarget &&
                  (payload?.familyHref || editTarget?.familyHref) ? (
                    <a
                      className="text-sky-700 underline"
                      href={payload?.familyHref || editTarget?.familyHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      牝系ページ
                    </a>
                  ) : null}
                </div>
                {current ? (
                  <div className="mt-1 text-[11px] text-stone-500">
                    reason: {current.reason || '?'}
                    {current.missingBreeder ||
                    current.reason === 'missing_breeder'
                      ? ' / 生産者なし'
                      : ''}{' '}
                    / 欠け: {current.ancestryMissing ?? '?'} / 既存:{' '}
                    {current.ancestryPresent ?? '?'} / 入力済み名: {filledCount}/30
                    {payload?.isNew ? ' / 新規作成' : ''}
                  </div>
                ) : idConflict ? (
                  <div className="mt-1 text-xs text-red-700">{idConflict}</div>
                ) : null}
              </div>
              {current?.mode === 'sire' && (
                <div className="min-w-0 max-w-xl flex-1 text-xs">
                  <div className="text-stone-500">
                    産駒
                    {(current.relatedChildrenTotal || 0) > 0
                      ? (current.relatedChildrenTotal || 0) >
                        (current.relatedChildren || []).length
                        ? `（${current.relatedChildren?.length}/${current.relatedChildrenTotal}）`
                        : `（${current.relatedChildrenTotal}頭）`
                      : ''}
                  </div>
                  {(current.relatedChildren || []).length === 0 ? (
                    <div className="mt-0.5 text-stone-400">
                      在来データに産駒なし
                    </div>
                  ) : (
                    <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-stone-800">
                      {(current.relatedChildren || []).map((c) => (
                        <li key={`${c.filename}:${c.id}`}>
                          <span className="font-medium">{c.name}</span>
                          {c.netkeibaId ? (
                            <a
                              className="ml-1 text-sky-700 underline"
                              href={`https://db.netkeiba.com/horse/${c.netkeibaId}/`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              nk
                            </a>
                          ) : null}
                          {c.familyHref ? (
                            <a
                              className="ml-1 text-stone-500 underline"
                              href={c.familyHref}
                              target="_blank"
                              rel="noreferrer"
                              title={c.filename}
                            >
                              牝系
                            </a>
                          ) : null}
                        </li>
                      ))}
                      {(current.relatedChildrenTotal || 0) >
                      (current.relatedChildren || []).length ? (
                        <li className="text-stone-400">
                          ほか{' '}
                          {(current.relatedChildrenTotal || 0) -
                            (current.relatedChildren || []).length}
                          頭
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {mode === 'edit_horse' && (
              <div className="mb-3 rounded border border-sky-200 bg-sky-50/80 px-3 py-2">
                <div className="text-xs font-medium text-sky-900">
                  編集する馬を検索
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm"
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchEditHorse()
                      }
                    }}
                    placeholder="馬名 / 血統名 / 英名 / id / netkeibaId"
                  />
                  <button
                    type="button"
                    className="rounded border border-stone-400 bg-white px-2 py-1 text-xs disabled:opacity-50"
                    disabled={editSearching || !editQuery.trim()}
                    onClick={() => searchEditHorse()}
                  >
                    {editSearching ? '検索中…' : '検索'}
                  </button>
                </div>
                {!payload && (
                  <p className="mt-2 text-xs text-stone-600">
                    馬を選ぶと、コメントと重賞成績を編集できる。
                  </p>
                )}
                {editHits.length > 0 && (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {editHits.map((hit) => (
                      <li key={`edit:${hit.filename}:${hit.id}`}>
                        <button
                          type="button"
                          className={
                            editTarget?.id === hit.id
                              ? 'w-full rounded border border-sky-400 bg-sky-100 px-2 py-1 text-left'
                              : 'w-full rounded border border-sky-100 bg-white px-2 py-1 text-left hover:bg-sky-100'
                          }
                          onClick={() => {
                            setStatus('')
                            loadEditHorse(hit)
                          }}
                        >
                          <span className="font-medium">{hit.name}</span>
                          {hit.englishName ? (
                            <span className="ml-2 text-xs text-stone-500">
                              {hit.englishName}
                            </span>
                          ) : null}
                          {hit.horsePedigreeName &&
                          hit.horsePedigreeName !== hit.name &&
                          hit.horsePedigreeName !== hit.englishName ? (
                            <span className="ml-2 text-xs text-stone-500">
                              {hit.horsePedigreeName}
                            </span>
                          ) : null}
                          <span className="ml-2 font-mono text-[11px] text-stone-500">
                            {hit.id}
                            {hit.foaledYear != null ? ` / ${hit.foaledYear}` : ''}
                            {hit.sex ? ` / ${hit.sex}` : ''}
                            {' / '}
                            {hit.filename}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {(mode !== 'edit_horse' || Boolean(editTarget)) && (
            <SubjectFields
              subject={subject}
              onChange={setSubject}
              fetching={fetching}
              onFetch={(site) => fetchFromPedigreeOnline(site)}
              nameLabel={
                current?.mode === 'missing_sire'
                  ? '父馬名'
                  : mode === 'new_family'
                    ? '牝祖名'
                    : '馬名'
              }
              idEditable={
                current?.mode === 'missing_sire' ||
                mode === 'new_family' ||
                mode === 'new_horse'
              }
              idWarning={idConflict}
              showSex={
                mode === 'new_horse' || mode === 'edit_horse'
                  ? 'select'
                  : mode === 'new_family'
                    ? 'female'
                    : current?.mode === 'missing_sire' || current?.mode === 'sire'
                      ? 'male'
                      : 'hidden'
              }
              extrasDefaultOpen={
                mode === 'new_family' ||
                mode === 'new_horse' ||
                mode === 'edit_horse'
              }
              breederRequired={
                current?.mode === 'sire' &&
                (current.missingBreeder || current.reason === 'missing_breeder')
              }
            />
            )}
          </section>

          {(current?.mode === 'sire' || mode === 'new_horse') && (
            <section className="mb-4 rounded border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm">
              <div className="text-xs font-medium text-violet-900">
                {mode === 'new_horse' ? '両親' : '在来牝系へ保存'}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-stone-500">母馬*</div>
                  {tradDam ? (
                    <div className="mt-1 rounded border border-violet-200 bg-white px-2 py-1.5">
                      <div className="font-medium">
                        {tradDam.name}
                        {tradDam.englishName ? (
                          <span className="ml-2 text-xs font-normal text-stone-500">
                            {tradDam.englishName}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-mono text-[11px] text-stone-500">
                        id={tradDam.id}
                        {tradDam.foaledYear != null
                          ? ` / ${tradDam.foaledYear}`
                          : ''}
                        {' / '}
                        {tradDam.filename}
                      </div>
                      {tradDam.familyHref ? (
                        <a
                          className="text-xs text-sky-700 underline"
                          href={tradDam.familyHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          牝系ページ
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="ml-2 text-xs text-stone-500 underline"
                        onClick={() => setTradDam(null)}
                      >
                        選び直す
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
                          value={tradDamQuery}
                          onChange={(e) => setTradDamQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              searchTraditionalHorse('dam')
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="rounded border border-stone-400 bg-white px-2 py-1 text-xs disabled:opacity-50"
                          disabled={
                            tradSearching === 'dam' || !tradDamQuery.trim()
                          }
                          onClick={() => searchTraditionalHorse('dam')}
                        >
                          {tradSearching === 'dam' ? '検索中…' : '検索'}
                        </button>
                      </div>
                      {tradDamHits.length > 0 && (
                        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                          {tradDamHits.map((hit) => (
                            <li key={`dam:${hit.filename}:${hit.id}`}>
                              <button
                                type="button"
                                className="w-full rounded border border-violet-100 bg-white px-2 py-1 text-left hover:bg-violet-100"
                                onClick={() => setTradDam(hit)}
                              >
                                <span className="font-medium">{hit.name}</span>
                                {hit.horsePedigreeName &&
                                hit.horsePedigreeName !== hit.name ? (
                                  <span className="ml-2 text-xs text-stone-500">
                                    {hit.horsePedigreeName}
                                  </span>
                                ) : null}
                                <span className="ml-2 font-mono text-[11px] text-stone-500">
                                  {hit.id}
                                  {hit.foaledYear != null
                                    ? ` / ${hit.foaledYear}`
                                    : ''}
                                  {' / '}
                                  {hit.filename}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <div className="text-xs text-stone-500">父馬*</div>
                  {tradSire ? (
                    <div className="mt-1 rounded border border-violet-200 bg-white px-2 py-1.5">
                      <div className="font-medium">
                        {tradSire.name}
                        <span className="ml-2 text-xs font-normal text-violet-800">
                          {tradSire.store === 'sire'
                            ? '種牡馬JSON'
                            : '在来 id あり'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-stone-500">
                        id={tradSire.id}
                        {tradSire.netkeibaId
                          ? ` / nk=${tradSire.netkeibaId}`
                          : ''}
                        {' / '}
                        {tradSire.filename}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-stone-500 underline"
                        onClick={() => setTradSire(null)}
                      >
                        紐づけを外す（馬名+IDだけにする）
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="mt-1 block">
                        <span className="text-[11px] text-stone-500">
                          父馬名
                        </span>
                        <input
                          className="w-full rounded border border-stone-300 px-2 py-1"
                          value={externalSireName}
                          onChange={(e) => setExternalSireName(e.target.value)}
                        />
                      </label>
                      <label className="mt-1 block">
                        <span className="text-[11px] text-stone-500">
                          sireNetkeibaId
                        </span>
                        <input
                          className="w-full rounded border border-stone-300 px-2 py-1 font-mono text-sm"
                          value={externalSireNetkeibaId}
                          onChange={(e) =>
                            setExternalSireNetkeibaId(e.target.value)
                          }
                        />
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
                          value={tradSireQuery}
                          onChange={(e) => setTradSireQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              searchTraditionalHorse('sire')
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="rounded border border-stone-400 bg-white px-2 py-1 text-xs disabled:opacity-50"
                          disabled={
                            tradSearching === 'sire' || !tradSireQuery.trim()
                          }
                          onClick={() => searchTraditionalHorse('sire')}
                        >
                          {tradSearching === 'sire' ? '検索中…' : '検索'}
                        </button>
                      </div>
                      {tradSireHits.length > 0 && (
                        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                          {tradSireHits.map((hit) => (
                            <li key={`sire:${hit.store || 'traditional'}:${hit.filename}:${hit.id}`}>
                              <button
                                type="button"
                                className="w-full rounded border border-violet-100 bg-white px-2 py-1 text-left hover:bg-violet-100"
                                onClick={() => {
                                  setTradSire(hit)
                                  setExternalSireName(hit.name)
                                  setExternalSireNetkeibaId(hit.netkeibaId || '')
                                }}
                              >
                                <span className="font-medium">{hit.name}</span>
                                {hit.horsePedigreeName &&
                                hit.horsePedigreeName !== hit.name ? (
                                  <span className="ml-2 text-xs text-stone-500">
                                    {hit.horsePedigreeName}
                                  </span>
                                ) : null}
                                <span className="ml-1 text-[11px] text-violet-800">
                                  {hit.store === 'sire' ? '種牡馬' : '在来'}
                                </span>
                                <span className="ml-2 font-mono text-[11px] text-stone-500">
                                  {hit.id}
                                  {hit.netkeibaId
                                    ? ` / ${hit.netkeibaId}`
                                    : ''}
                                  {' / '}
                                  {hit.filename}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="mt-3 rounded bg-violet-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={
                  savingTraditional ||
                  saving ||
                  !tradDam ||
                  !(tradSire || externalSireName.trim()) ||
                  !subjectHasIdSource(subject) ||
                  (mode === 'new_horse' && !subject.sex) ||
                  Boolean(idConflict)
                }
                onClick={() =>
                  mode === 'new_horse' ? saveNewHorse() : saveToTraditional()
                }
              >
                {savingTraditional || (saving && mode === 'new_horse')
                  ? '保存中…'
                  : mode === 'new_horse'
                    ? '在来牝系に追加'
                    : '在来牝系に保存（母の牝系へ）'}
              </button>
            </section>
          )}

          {current?.mode === 'missing_sire' && (
            <section className="mb-4 rounded border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm">
              <div className="text-xs font-medium text-emerald-900">
                netkeiba登録済み
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className="min-w-[12rem] flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
                  value={netkeibaOnlyId}
                  onChange={(e) => setNetkeibaOnlyId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyNetkeibaIdOnly()
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded bg-emerald-800 px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={
                    settingNetkeibaOnly ||
                    linkingExisting ||
                    saving ||
                    !netkeibaOnlyId.trim()
                  }
                  onClick={() => applyNetkeibaIdOnly()}
                >
                  {settingNetkeibaOnly
                    ? '設定中…'
                    : 'netkeiba登録済みとして設定'}
                </button>
              </div>
            </section>
          )}

          {current?.mode === 'missing_sire' && (
            <section className="mb-4 rounded border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm">
              <div className="text-xs font-medium text-sky-900">
                登録済み種牡馬
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className="min-w-[12rem] flex-1 rounded border border-stone-300 px-2 py-1"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      searchCatalog()
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded border border-stone-400 bg-white px-3 py-1 disabled:opacity-50"
                  disabled={catalogSearching || !catalogQuery.trim()}
                  onClick={() => searchCatalog()}
                >
                  {catalogSearching ? '検索中…' : '検索'}
                </button>
              </div>
              {(catalogSuggestions.length > 0 || catalogResults.length > 0) && (
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {(catalogSuggestions.length
                    ? catalogSuggestions
                    : catalogResults
                  ).map((entry) => (
                    <li
                      key={`${entry.store}:${entry.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-sky-100 bg-white px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900">
                          {entry.name}
                          {entry.englishName ? (
                            <span className="ml-2 text-xs font-normal text-stone-500">
                              {entry.englishName}
                            </span>
                          ) : null}
                          {entry.pedigreeName &&
                          entry.pedigreeName !== entry.name &&
                          entry.pedigreeName !== entry.englishName ? (
                            <span className="ml-2 text-xs font-normal text-stone-500">
                              {entry.pedigreeName}
                            </span>
                          ) : null}
                        </div>
                        <div className="font-mono text-[11px] text-stone-500">
                          id={entry.id}
                          {entry.foaledYear != null
                            ? ` / ${entry.foaledYear}`
                            : ''}
                          {entry.netkeibaId
                            ? ` / nk=${entry.netkeibaId}`
                            : ''}
                          {' / '}
                          {entry.store === 'sire' ? 'pedigree-sires' : '在来'}
                          {' / '}
                          {entry.filename}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded bg-sky-800 px-2.5 py-1 text-xs text-white disabled:opacity-50"
                        disabled={linkingExisting || saving}
                        onClick={() => linkExistingSire(entry)}
                      >
                        {linkingExisting ? '紐づけ中…' : 'この種牡馬に紐づける'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {catalogSuggestions.length > 0 &&
                catalogResults.length > catalogSuggestions.length && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-sky-800 underline"
                    onClick={() => setCatalogSuggestions([])}
                  >
                    検索結果をすべて表示（{catalogResults.length}）
                  </button>
                )}
            </section>
          )}

          {(current?.mode === 'missing_sire' || current?.mode === 'root') &&
            ((current.relatedChildren?.length || 0) > 0 ||
              (current.familyPages?.length || 0) > 0) && (
              <section className="mb-4 rounded border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm">
                {current?.mode === 'missing_sire' &&
                  (current.relatedChildren?.length || 0) > 0 && (
                    <>
                      <div className="text-xs font-medium text-amber-900">
                        関連（この種牡馬が父になっている馬）
                      </div>
                      <ul className="mt-1 space-y-0.5 text-stone-800">
                        {(current.relatedChildren || []).map((c) => (
                          <li key={`${c.filename}:${c.id}`}>
                            <span className="font-medium">{c.name}</span>
                            <span className="text-stone-600">の父馬</span>
                            <span className="ml-1 font-mono text-xs text-stone-500">
                              ({c.filename})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                {current?.mode === 'root' && (
                  <div className="text-xs font-medium text-amber-900">
                    対象牝祖の4代血統（父はここに含める・種牡馬単独登録しない）
                    {current.skipScrapeReason ? (
                      <span className="ml-2 font-mono text-[10px] font-normal text-stone-500">
                        ({current.skipScrapeReason})
                      </span>
                    ) : null}
                  </div>
                )}
                {(current.familyPages?.length || 0) > 0 && (
                  <>
                    <div
                      className={
                        current?.mode === 'missing_sire'
                          ? 'mt-2 text-xs font-medium text-amber-900'
                          : 'mt-1 text-xs font-medium text-amber-900'
                      }
                    >
                      牝系ページ（新タブ）
                    </div>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {(current.familyPages || []).map((p) =>
                        p.familyHref ? (
                          <li key={`${p.filename}:${p.rootHorseId}`}>
                            <a
                              className="inline-flex items-center rounded border border-amber-300 bg-white px-2 py-0.5 text-sky-800 underline-offset-2 hover:bg-amber-100 hover:underline"
                              href={p.familyHref}
                              target="_blank"
                              rel="noreferrer"
                              title={p.filename}
                            >
                              {p.pedigreeName || p.rootHorseId}
                              <span className="ml-1 font-mono text-[10px] text-stone-500">
                                {p.filename}
                              </span>
                            </a>
                          </li>
                        ) : (
                          <li
                            key={`${p.filename}:nofamily`}
                            className="font-mono text-xs text-stone-600"
                          >
                            {p.filename}
                          </li>
                        )
                      )}
                    </ul>
                  </>
                )}
              </section>
            )}

          {payload?.filename && mode !== 'edit_horse' && (
            <p className="mb-2 font-mono text-xs text-stone-500">
              {payload.filename}
            </p>
          )}
          {payload?.isNew && (
            <p className="mb-2 text-xs text-amber-800">
              既存の pedigree-sires に同名なし → 保存時に新規ファイル作成
            </p>
          )}

          {mode !== 'new_horse' && mode !== 'edit_horse' && (
          <BloodTableEditor
            key={`${mode}:${current?.id ?? 'new'}:${cursor}`}
            value={ancestryInput}
            onChange={setAncestryInput}
            onFetchCell={(path, site, id) =>
              fetchFromPedigreeOnline(site, { branch: path, id })
            }
            fetchingPath={cellPathFromFetchKey(fetching)}
            fetchDisabled={!!fetching}
          />
          )}

          <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 border-t border-stone-300 bg-white/95 py-3 backdrop-blur">
            {mode === 'new_family' ? (
              <>
                <button
                  type="button"
                  disabled={saving || Boolean(idConflict) || !subjectHasIdSource(subject)}
                  className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => saveNewFamily(false)}
                >
                  {saving ? '保存中…' : '在来牝系JSONを作成'}
                </button>
                <button
                  type="button"
                  disabled={saving || !subjectHasIdSource(subject)}
                  className="rounded border border-amber-500 bg-amber-50 px-4 py-2 text-sm text-amber-950 disabled:opacity-50"
                  onClick={() => saveNewFamily(true)}
                >
                  一時保存（不詳で埋めない）
                </button>
              </>
            ) : mode === 'new_horse' ? (
              <button
                type="button"
                disabled={
                  saving ||
                  Boolean(idConflict) ||
                  !tradDam ||
                  !(tradSire || externalSireName.trim()) ||
                  !subjectHasIdSource(subject) ||
                  !subject.sex
                }
                className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => saveNewHorse()}
              >
                {saving ? '保存中…' : '在来牝系に追加'}
              </button>
            ) : mode === 'edit_horse' ? (
              <>
                <button
                  type="button"
                  disabled={saving || !payload || !subject.id}
                  className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => saveEditHorse()}
                >
                  {saving ? '保存中…' : '更新を保存'}
                </button>
                <button
                  type="button"
                  disabled={saving || !editTarget}
                  className="rounded border border-stone-400 px-4 py-2 text-sm disabled:opacity-50"
                  onClick={() => {
                    if (editTarget) loadEditHorse(editTarget)
                  }}
                >
                  再読込（破棄）
                </button>
              </>
            ) : (
              <>
            <button
              type="button"
              disabled={saving}
              className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => save(true)}
            >
              {saving ? '保存中…' : '保存して次へ'}
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded border border-stone-400 px-4 py-2 text-sm disabled:opacity-50"
              onClick={() => save(false)}
            >
              保存のみ
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded border border-amber-500 bg-amber-50 px-4 py-2 text-sm text-amber-950 disabled:opacity-50"
              onClick={() => save(false, true)}
              title="空欄は埋めず、キューにも残したまま保存します"
            >
              一時保存
            </button>
            <button
              type="button"
              className="rounded border border-stone-400 px-4 py-2 text-sm"
              onClick={() => {
                if (!current) return
                loadTarget(current)
              }}
            >
              再読込（破棄）
            </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
