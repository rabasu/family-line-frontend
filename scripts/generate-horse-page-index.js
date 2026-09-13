#!/usr/bin/env node

/**
 * generate-horse-page-index.js
 *
 * 在来牝系の全馬について id → { file, family, name, year, sex, tier } を生成する。
 * /[id] の generateStaticParams と、サーバー側の馬データ検索に使う。
 *
 * 出力: data/pedigree/horse-page-index.json
 */

const fs = require('fs')
const path = require('path')
const { getDraftFamilySlugs } = require('./lib/draft-family-slugs')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree-traditional')
const HORSE_MDX_DIR = path.join(__dirname, '../data/horse')
const OUTPUT_DIR = path.join(__dirname, '../data/pedigree')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'horse-page-index.json')

/**
 * 検索エンジンにインデックスさせる価値がある馬かを判定する。
 *
 * 名前と生年しかない馬まで含めて2万枚規模の同型ページを公開すると、
 * scaled content abuse としてサイト全体の評価を落としうるため、
 * 独自の情報量を持つ馬だけを index 対象にする。
 * URL 自体は全馬に発行するので、この判定は後からいつでも変更できる。
 */
function isIndexable({ horse, isRoot, offspringCount, hasArticle }) {
  if (hasArticle) return true
  if (typeof horse.details === 'string' && horse.details.trim()) return true
  if (Array.isArray(horse.raceResults) && horse.raceResults.length > 0) return true
  if (isRoot) return true
  if (offspringCount >= 2) return true
  return false
}

function collectArticleSlugs() {
  const slugs = new Set()
  if (!fs.existsSync(HORSE_MDX_DIR)) return slugs
  for (const entry of fs.readdirSync(HORSE_MDX_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      slugs.add(entry.name.replace(/\.mdx$/, ''))
    }
  }
  return slugs
}

console.log('🔍 Scanning traditional pedigree JSON in:', PEDIGREE_DIR)

const files = fs.readdirSync(PEDIGREE_DIR).filter((file) => file.endsWith('.json') && !file.includes('.backup'))

const draftFamilySlugs = getDraftFamilySlugs()
const articleSlugs = collectArticleSlugs()

console.log(`📁 Found ${files.length} JSON files`)
console.log(`📝 Draft families to exclude: ${draftFamilySlugs.size}`)
console.log(`📄 Horse articles (data/horse/*.mdx): ${articleSlugs.size}`)

/** @type {Record<string, {file: string, family: string, name: string, year: number|null, sex: string, tier: 'index'|'noindex'}>} */
const horses = {}
const duplicateIds = []
let familyCount = 0
let skippedDraftCount = 0
let errorCount = 0

for (const fileName of files) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(path.join(PEDIGREE_DIR, fileName), 'utf8'))
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message)
    errorCount++
    continue
  }

  const rootHorseId = data?.metadata?.rootHorseId
  if (!rootHorseId || !Array.isArray(data.horses)) {
    console.warn(`⚠ Warning: ${fileName} has invalid structure`)
    errorCount++
    continue
  }
  if (data.metadata.isTraditionalFamily !== true) continue
  if (draftFamilySlugs.has(rootHorseId)) {
    skippedDraftCount++
    continue
  }

  familyCount++

  // 直仔の数を数える（damId が親子関係の正）
  const offspringCounts = new Map()
  for (const horse of data.horses) {
    if (!horse?.damId) continue
    offspringCounts.set(horse.damId, (offspringCounts.get(horse.damId) || 0) + 1)
  }

  const baseFile = fileName.replace(/\.json$/, '')

  for (const horse of data.horses) {
    const id = String(horse?.id || '').trim()
    if (!id) continue
    if (horses[id]) {
      duplicateIds.push({ id, kept: horses[id].file, ignored: baseFile })
      continue
    }

    horses[id] = {
      file: baseFile,
      family: rootHorseId,
      name: horse.name || horse.pedigreeName || id,
      year: horse.foaled?.year ?? null,
      sex: horse.sex || 'female',
      tier: isIndexable({
        horse,
        isRoot: id === rootHorseId,
        offspringCount: offspringCounts.get(id) || 0,
        hasArticle: articleSlugs.has(id),
      })
        ? 'index'
        : 'noindex',
    }
  }
}

const allIds = Object.keys(horses)
const indexableCount = allIds.filter((id) => horses[id].tier === 'index').length

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalHorses: allIds.length,
    indexableHorses: indexableCount,
    horses,
  }),
  'utf8'
)

console.log('\n✅ Generation complete!')
console.log(`📊 Traditional families processed: ${familyCount} / ${files.length}`)
console.log(`📝 Skipped draft families: ${skippedDraftCount}`)
console.log(`📊 Total horses: ${allIds.length}`)
console.log(`📊 Indexable (tier=index): ${indexableCount}`)
console.log(`📊 Noindex: ${allIds.length - indexableCount}`)
if (duplicateIds.length > 0) {
  console.log(`⚠ Duplicate ids skipped: ${duplicateIds.length}`)
  for (const dup of duplicateIds.slice(0, 10)) {
    console.log(`   ${dup.id}: kept ${dup.kept}, ignored ${dup.ignored}`)
  }
}
console.log(`❌ Errors: ${errorCount} files`)
console.log(`💾 Output: ${OUTPUT_FILE}`)
console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`)
