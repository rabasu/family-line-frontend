/**
 * 輸入馬 id → 生産国コード。
 * 馬レコードの breeder / foaledAt / importedYear から作る。
 * 種牡馬の breeder 補完は scripts/fill_sire_breeder.py が JSON に書く。
 */
import fs from 'fs'
import path from 'path'
import {
  extractTrailingCountryCode,
  formatNameWithOrigin,
  originCodeFromHorse,
  type HorseOriginFields,
} from '@/lib/origin-country'

const TRADITIONAL_DIR = path.join(process.cwd(), 'app', 'pedigree-traditional')
const SIRE_DIR = path.join(process.cwd(), 'app', 'pedigree-sires')

let originById: Map<string, string> | null = null

type JsonHorse = HorseOriginFields & {
  id?: string
}

function jsonFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((file) => file.endsWith('.json') && !file.includes('.backup'))
  } catch {
    return []
  }
}

function buildOriginIndex(): Map<string, string> {
  const index = new Map<string, string>()

  for (const file of jsonFiles(TRADITIONAL_DIR)) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(TRADITIONAL_DIR, file), 'utf-8')) as {
        horses?: JsonHorse[]
      }
      for (const horse of data.horses || []) {
        const id = (horse.id || '').trim()
        if (!id) continue
        const code = originCodeFromHorse(horse)
        if (code) index.set(id, code)
      }
    } catch {
      // skip broken file
    }
  }

  for (const file of jsonFiles(SIRE_DIR)) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(SIRE_DIR, file), 'utf-8')) as {
        metadata?: { subjectHorseId?: string }
        horse?: JsonHorse
      }
      const horse = data.horse
      const id = (horse?.id || data.metadata?.subjectHorseId || '').trim()
      if (!id || !horse) continue
      const code = originCodeFromHorse(horse)
      if (code) index.set(id, code)
    } catch {
      // skip
    }
  }

  return index
}

export function getOriginCodeByHorseId(id: string | undefined | null): string | undefined {
  const key = (id || '').trim()
  if (!key) return undefined
  if (!originById) originById = buildOriginIndex()
  return originById.get(key)
}

/** 牝系図・基本情報の父馬名。sire 文字列に国名が無くても id から補う */
export function formatSireDisplayName(sireName: string, sireId?: string | null): string {
  const raw = (sireName || '').trim()
  const code = getOriginCodeByHorseId(sireId) || extractTrailingCountryCode(raw)
  return formatNameWithOrigin(raw, code)
}
