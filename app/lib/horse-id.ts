/** 馬 id / 在来 JSON ファイル名の生成と衝突判定用 */

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
  if (preferred) return slugifyId(preferred) || preferred
  const en = (options.englishName || '').trim()
  if (en) return slugifyId(en)
  const name = (options.name || '').trim()
  if (hasLatin(name)) return slugifyId(name)
  const pedigreeName = (options.pedigreeName || '').trim()
  if (hasLatin(pedigreeName)) return slugifyId(pedigreeName)
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
