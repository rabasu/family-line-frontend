#!/usr/bin/env node

/**
 * generate-horse-search-index.js
 *
 * 全JSONファイルから馬の横断検索用インデックスを生成
 * 出力: data/pedigree/horse-search-index.json
 */

const fs = require('fs')
const path = require('path')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree')
const OUTPUT_DIR = path.join(__dirname, '../data/pedigree')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'horse-search-index.json')

console.log('🔍 Scanning JSON files in:', PEDIGREE_DIR)

const files = fs
  .readdirSync(PEDIGREE_DIR)
  .filter((file) => file.endsWith('.json') && !file.includes('.backup'))
  .filter((file) => file !== 'pedigree-metadata.json' && file !== 'horse-link-map.json' && file !== 'traditional-family-index.json')

console.log(`📁 Found ${files.length} JSON files`)

// Grade の rank マップ（app/types/Grade.tsx から複製）
const gradeRanks = {
  jra_g1: 1,
  jra_g2: 2,
  jra_g3: 3,
  jra_ungraded: 4,
  nar_g1: 1,
  nar_jpn1: 1,
  nar_jpn2: 2,
  nar_jpn3: 3,
  local_grade: 7,
  local_old_big: 5,
  local_old_grade: 6,
  jra_jg1: 1,
  jra_jg2: 2,
  jra_jg3: 3,
  jra_big8: 5,
  jra_big10: 5,
  jra_grade: 6,
  jra_grandjump: 5,
  jra_jump: 6,
  national_big8: 5,
  national_grade: 6,
  national_grandjump: 5,
  national_jump: 6,
  jrs_big8: 5,
  jrs_grade: 6,
  jrs_grandjump: 5,
  jrs_jump: 6,
  empire_2mile: 5,
  empire_cup: 5,
  empire_derby: 5,
  empire_2m1f: 5,
  empire_grade: 6,
  empire_grandjump: 5,
  empire_jump: 6,
  empire_cs: 7,
  abroad_g1: 1,
  abroad_g2: 2,
  abroad_g3: 3,
}

function getGradeRank(gradeCode) {
  return gradeRanks[gradeCode] ?? 99
}

function isJusho(gradeCode) {
  return getGradeRank(gradeCode) <= 6
}

function isG1Grade(gradeCode) {
  const rank = getGradeRank(gradeCode)
  return rank === 1 || rank === 5
}

/**
 * raceResults の date を比較用の数値に変換
 */
function dateToNumber(date) {
  if (!date) return 0
  if (typeof date === 'string') {
    const d = new Date(date)
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
  }
  if (typeof date === 'object') {
    return (date.year ?? 0) * 10000 + (date.month ?? 0) * 100 + (date.day ?? 0)
  }
  return 0
}

/**
 * filterRecords 相当: 上位 number 件の主要レース成績を抽出
 * (HorseCard.tsx の filterRecords と同等ロジック)
 */
function filterRecords(records, number) {
  if (!records || records.length === 0) return []

  // 重賞勝利を抽出
  const wonGradeRaces = records.filter((r) => r.result === '1' && isJusho(r.grade))

  if (wonGradeRaces.length >= number) {
    return wonGradeRaces
      .sort((a, b) => {
        if (a.grade !== b.grade) return getGradeRank(a.grade) - getGradeRank(b.grade)
        return dateToNumber(a.date) - dateToNumber(b.date)
      })
      .slice(0, number)
  }

  // 重賞成績（着順→グレード→日付）
  const allGradeRaces = records
    .filter((r) => getGradeRank(r.grade) <= 6)
    .filter((r) => !isNaN(Number(r.result)))
    .sort((a, b) => {
      if (Number(a.result) !== Number(b.result)) return Number(a.result) - Number(b.result)
      if (a.grade !== b.grade) return getGradeRank(a.grade) - getGradeRank(b.grade)
      return dateToNumber(a.date) - dateToNumber(b.date)
    })
    .slice(0, number)

  if (allGradeRaces.length < number) {
    const rest = number - allGradeRaces.length
    const restRaces = records.filter((r) => r.result === '1' && getGradeRank(r.grade) > 6)
    return [...allGradeRaces, ...restRaces.slice(0, rest)]
  }

  return allGradeRaces
}

/**
 * 馬データから検索インデックスエントリを生成
 */
function buildEntry(horse, family, familyName) {
  if (!horse || !horse.id) return null

  const raceResults = horse.raceResults || []

  const hasGradePlaced = raceResults.some((r) => isJusho(r.grade) && ['1', '2', '3'].includes(r.result))
  const hasGradeWin = raceResults.some((r) => isJusho(r.grade) && r.result === '1')
  const hasG1Win = raceResults.some((r) => isG1Grade(r.grade) && r.result === '1')

  const topRaceResults = filterRecords(raceResults, 3)

  const entry = {
    id: horse.id,
    family,
    familyName,
    foaled: horse.foaled ?? {},
    sex: horse.sex ?? 'female',
    sire: horse.sire,
    dam: horse.dam,
    hasGradePlaced,
    hasGradeWin,
    hasG1Win,
    topRaceResults,
  }

  // 検索対象の名前フィールド（存在する場合のみ）
  if (horse.name) entry.name = horse.name
  if (horse.pedigreeName) entry.pedigreeName = horse.pedigreeName
  if (horse.formerName) entry.formerName = horse.formerName
  if (horse.localName) entry.localName = horse.localName
  if (horse.formerPedigreeName) entry.formerPedigreeName = horse.formerPedigreeName
  if (horse.linkName) entry.linkName = horse.linkName
  if (horse.linkPedigreeName) entry.linkPedigreeName = horse.linkPedigreeName
  if (horse.englishName) entry.englishName = horse.englishName
  if (horse.furigana) entry.furigana = horse.furigana

  // 表示用
  if (horse.raceStats) entry.raceStats = horse.raceStats
  if (horse.prizeMoney) entry.prizeMoney = horse.prizeMoney

  return entry
}

const searchIndex = []
let totalHorses = 0
let traditionalFamilyCount = 0
let errorCount = 0

files.forEach((fileName, index) => {
  try {
    const filePath = path.join(PEDIGREE_DIR, fileName)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    if (!data.metadata?.rootHorseId || !Array.isArray(data.horses)) return
    if (data.metadata.isTraditionalFamily !== true) return

    const family = data.metadata.rootHorseId
    const familyName = data.metadata.pedigreeName ?? ''
    traditionalFamilyCount++

    data.horses.forEach((horse) => {
      const entry = buildEntry(horse, family, familyName)
      if (entry) {
        searchIndex.push(entry)
        totalHorses++
      }
    })

    if ((index + 1) % 100 === 0) {
      console.log(`✓ Processed ${index + 1}/${files.length} files... (${totalHorses} horses from ${traditionalFamilyCount} families)`)
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message)
    errorCount++
  }
})

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(searchIndex), 'utf8')

console.log('\n✅ Generation complete!')
console.log(`📊 Traditional families processed: ${traditionalFamilyCount} / ${files.length}`)
console.log(`📊 Total horses: ${totalHorses}`)
console.log(`❌ Errors: ${errorCount} files`)
console.log(`💾 Output: ${OUTPUT_FILE}`)
console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`)
