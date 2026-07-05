#!/usr/bin/env node

/**
 * set-traditional-family-horse-furigana.js
 *
 * 在来牝系（metadata.isTraditionalFamily === true）の app/pedigree/*.json のみ対象。
 * 馬の name（なければ pedigreeName）に漢字が含まれる場合、furigana（全角カタカナ）を
 * Horse オブジェクトに書き込む。
 *
 * 変換方針:
 * - id を小文字化し末尾の「-YYYY」を除きハイフンを除去したあと、a-z のみなら
 *   wanakana で id 由来のフリガナを生成（従来どおり）。
 * - 上記で id が使えない場合（算用数字が混ざる等）は、馬名（primaryNameLabel）から
 *   直接フリガナを組み立てる。カタカナ・ひらがなはそのまま／ひらがなはカタカナ化、
 *   漢数字は読みにマッピング。マッピングできない漢字が含まれる場合はスキップ（手動追記）。
 *
 * id の扱い（id 由来のとき）:
 * - 小文字化のうえ、末尾の「-YYYY」（生年による切り分け想定）を削除
 * - 残りのハイフンは除去してローマ字を連結（例: hida-kogane → hidakogane）
 * - 上記後に a-z のみからなる文字列でない id（例: kitami-2, dai1-nagy-2）は
 *   id 由来の変換は行わず、馬名から生成する。
 *
 * 用法:
 *   node scripts/set-traditional-family-horse-furigana.js
 *   node scripts/set-traditional-family-horse-furigana.js --dry-run
 *   node scripts/set-traditional-family-horse-furigana.js --verbose   # スキップ理由を1件ずつ表示
 *
 * 依存: devDependency の wanakana（ローマ字→かな）
 */

const fs = require('fs')
const path = require('path')
const { toHiragana, toKatakana } = require('wanakana')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree-traditional')

const HAS_KANJI = /\p{Script=Han}/u

const dryRun = process.argv.includes('--dry-run')
const verbose = process.argv.includes('--verbose')

/** 第N（N=1..20 程度）— 長い語を先にマッチさせる */
const DAI_ORDINAL_READINGS = [
  ['第拾四', 'ダイジュウシ'],
  ['第弐', 'ダイニ'],
  ['第参', 'ダイサン'],
  ['第貮', 'ダイニ'],
  ['第十一', 'ダイジュウイチ'],
  ['第十二', 'ダイジュウニ'],
  ['第十三', 'ダイジュウサン'],
  ['第十四', 'ダイジュウシ'],
  ['第十五', 'ダイジュウゴ'],
  ['第十六', 'ダイジュウロク'],
  ['第十七', 'ダイジュウシチ'],
  ['第十八', 'ダイジュウハチ'],
  ['第十九', 'ダイジュウキュウ'],
  ['第二十', 'ダイニジュウ'],
  ['第一', 'ダイイチ'],
  ['第二', 'ダイニ'],
  ['第三', 'ダイサン'],
  ['第四', 'ダイヨン'],
  ['第五', 'ダイゴ'],
  ['第六', 'ダイロク'],
  ['第七', 'ダイシチ'],
  ['第八', 'ダイハチ'],
  ['第九', 'ダイキュウ'],
  ['第十', 'ダイジュウ'],
]

const HAN_NUMERAL_SINGLE = {
  '\u3007': 'ゼロ',
  〇: 'ゼロ',
  一: 'イチ',
  二: 'ニ',
  弐: 'ニ',
  貮: 'ニ',
  三: 'サン',
  参: 'サン',
  四: 'シ',
  五: 'ゴ',
  六: 'ロク',
  七: 'シチ',
  八: 'ハチ',
  九: 'キュウ',
  十: 'ジュウ',
  百: 'ヒャク',
  千: 'セン',
  万: 'マン',
}

const COMPOUNDS_LONGEST_FIRST = [...DAI_ORDINAL_READINGS].sort((a, b) => b[0].length - a[0].length)

function romajiTokenFromId(id) {
  let s = String(id).toLowerCase().trim()
  s = s.replace(/-\d{4}$/, '')
  s = s.replace(/-/g, '')
  s = s.replace(/^_+/, '')
  if (!/^[a-z]+$/.test(s)) return null
  return s
}

function idToFurigana(id) {
  const romaji = romajiTokenFromId(id)
  if (!romaji) return null
  return toKatakana(toHiragana(romaji))
}

function primaryNameLabel(horse) {
  if (horse.pedigreeName != null && String(horse.pedigreeName).length > 0) {
    return String(horse.pedigreeName)
  }
  if (horse.name != null && String(horse.name).length > 0) return String(horse.name)
  return ''
}

function isHiraganaCodePoint(cp) {
  return cp >= 0x3041 && cp <= 0x3096
}

function isKatakanaCodePoint(cp) {
  return (cp >= 0x30a1 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff)
}

function isHanCodePoint(cp) {
  return cp === 0x3007 || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff)
}

function isIgnorableInLabel(cp, ch) {
  if (ch === ' ' || ch === '\u3000') return true
  if (ch === '・' || ch === '－' || ch === '—' || ch === '-') return true
  if (ch === '(' || ch === ')' || ch === '（' || ch === '）') return true
  return false
}

/**
 * id 由来が使えないとき、馬名からフリガナを組み立てる。
 * 未対応の漢字が1文字でもあれば null。
 */
function labelToFuriganaFromKanjiMix(label) {
  const s = String(label).normalize('NFKC')
  let out = ''
  let i = 0
  while (i < s.length) {
    const rest = s.slice(i)

    let compoundHit = false
    for (const [seq, reading] of COMPOUNDS_LONGEST_FIRST) {
      if (rest.startsWith(seq)) {
        out += reading
        i += seq.length
        compoundHit = true
        break
      }
    }
    if (compoundHit) continue

    const cp0 = rest.codePointAt(0)
    const len = cp0 > 0xffff ? 2 : 1
    const ch = String.fromCodePoint(cp0)

    if (isHiraganaCodePoint(cp0)) {
      out += toKatakana(ch)
      i += len
      continue
    }
    if (isKatakanaCodePoint(cp0)) {
      out += ch
      i += len
      continue
    }
    if (isHanCodePoint(cp0)) {
      const r = HAN_NUMERAL_SINGLE[ch]
      if (r) {
        out += r
        i += len
        continue
      }
      return null
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i
      while (j < s.length) {
        const c = s[j]
        if (!/[a-zA-Z]/.test(c)) break
        j++
      }
      const segment = s.slice(i, j).toLowerCase()
      out += toKatakana(toHiragana(segment))
      i = j
      continue
    }
    if (isIgnorableInLabel(cp0, ch)) {
      i += len
      continue
    }
    return null
  }
  return out
}

function furiganaForHorse(horse, label) {
  const fromId = idToFurigana(horse.id)
  if (fromId != null) return { value: fromId, source: 'id' }
  const fromName = labelToFuriganaFromKanjiMix(label)
  if (fromName != null) return { value: fromName, source: 'name' }
  return { value: null, source: 'none' }
}

const stats = {
  files: 0,
  horsesKanji: 0,
  set: 0,
  setFromId: 0,
  setFromName: 0,
  unchanged: 0,
  skippedUnmappedName: 0,
  errors: 0,
}

const files = fs
  .readdirSync(PEDIGREE_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !f.includes('.backup'))

for (const fileName of files) {
  const filePath = path.join(PEDIGREE_DIR, fileName)
  let data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    console.error(`[parse error] ${fileName}: ${e.message}`)
    stats.errors++
    continue
  }

  if (!data.metadata?.rootHorseId || !Array.isArray(data.horses)) continue
  if (data.metadata.isTraditionalFamily !== true) continue

  stats.files++
  let fileTouched = false

  for (const horse of data.horses) {
    if (!horse?.id) continue
    const label = primaryNameLabel(horse)
    if (!label || !HAS_KANJI.test(label)) continue

    stats.horsesKanji++

    const { value: next, source } = furiganaForHorse(horse, label)
    if (next == null) {
      stats.skippedUnmappedName++
      if (verbose) {
        console.warn(`[skip: cannot derive furigana] ${fileName} id=${horse.id} label=${JSON.stringify(label)}`)
      }
      continue
    }

    if (horse.furigana === next) {
      stats.unchanged++
      continue
    }

    stats.set++
    if (source === 'id') stats.setFromId++
    else if (source === 'name') stats.setFromName++

    fileTouched = true
    if (!dryRun) horse.furigana = next
  }

  if (!dryRun && fileTouched) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }
}

console.log('\n--- set-traditional-family-horse-furigana ---')
console.log(`traditional family files scanned: ${stats.files}`)
console.log(`horses with kanji in name/pedigreeName: ${stats.horsesKanji}`)
console.log(`furigana set/updated: ${stats.set}${dryRun ? ' (dry-run; not written)' : ''}`)
console.log(`  from id: ${stats.setFromId}`)
console.log(`  from name (id unusable): ${stats.setFromName}`)
console.log(`already had same furigana: ${stats.unchanged}`)
console.log(`skipped (unmapped kanji / unsupported chars in name path): ${stats.skippedUnmappedName}`)
if (stats.skippedUnmappedName > 0 && !verbose) {
  console.log('  (use --verbose to print each skipped horse)')
}
console.log(`errors: ${stats.errors}`)
