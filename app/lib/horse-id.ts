/** 馬 id / 在来 JSON ファイル名の生成と衝突判定用 */

/** ルート直 `/{id}` と衝突する静的パス。馬 id にしてはいけない */
export const RESERVED_ROOT_SLUGS = new Set([
  'search',
  'glossary',
  'family',
  'horse',
  'tools',
  'api',
  'static',
  'sitemap',
  'robots',
  'about',
  'tags',
  'blog',
  'feed',
  'rss',
  'index',
  '404',
  '500',
])

export function isReservedRootSlug(id: string): boolean {
  return RESERVED_ROOT_SLUGS.has(id)
}

/** 馬の正規 URL。hash は `#article` でも `article` でも可 */
export function horseHref(id: string, hash = ''): string {
  const path = `/${encodeURIComponent(id)}`
  if (!hash) return path
  return `${path}${hash.startsWith('#') ? hash : `#${hash}`}`
}

export function ensureUnreserved(id: string): string {
  if (!id || !isReservedRootSlug(id)) return id
  return `${id}-horse`
}

export function slugifyId(src: string): string {
  return src
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function toFileStem(src: string, fallbackId = ''): string {
  const cleaned = src.trim().replace(/['’]/g, '')
  const parts = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!parts.length) {
    return filenameStemFromId(fallbackId) || fallbackId
  }
  return parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('')
}

/** kebab-case id → PascalCase ファイル名ステム（aloha-oe → AlohaOe） */
export function filenameStemFromId(id: string): string {
  const parts = (id || '').split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!parts.length) return ''
  return parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('')
}

export function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s)
}

export function proposeHorseId(options: {
  preferredId?: string
  englishName?: string
  name?: string
  pedigreeName?: string
}): string {
  const preferred = (options.preferredId || '').trim()
  if (preferred) return ensureUnreserved(slugifyId(preferred) || preferred)
  const en = (options.englishName || '').trim()
  if (en) return ensureUnreserved(slugifyId(en))
  const name = (options.name || '').trim()
  if (hasLatin(name)) return ensureUnreserved(slugifyId(name))
  const pedigreeName = (options.pedigreeName || '').trim()
  if (hasLatin(pedigreeName)) return ensureUnreserved(slugifyId(pedigreeName))
  return ''
}

export function proposeTraditionalFilename(options: {
  id: string
  englishName?: string
  name?: string
  pedigreeName?: string
}): string {
  const en = (options.englishName || '').trim()
  if (en && hasLatin(en)) return `${toFileStem(en, options.id)}.json`
  const name = (options.name || '').trim()
  if (name && hasLatin(name)) return `${toFileStem(name, options.id)}.json`
  const pedigreeName = (options.pedigreeName || '').trim()
  if (pedigreeName && hasLatin(pedigreeName)) {
    return `${toFileStem(pedigreeName, options.id)}.json`
  }
  const stem = filenameStemFromId(options.id)
  return `${stem || options.id}.json`
}
