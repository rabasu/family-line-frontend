#!/usr/bin/env node

/**
 * generate-horse-link-map.js
 *
 * 全JSONファイルから馬名 → { link, family, name } のマッピングを生成
 * 出力: app/pedigree/horse-link-map.json
 */

const fs = require('fs')
const path = require('path')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree')
const OUTPUT_FILE = path.join(PEDIGREE_DIR, 'horse-link-map.json')

console.log('🔍 Scanning JSON files in:', PEDIGREE_DIR)

// JSONファイルを取得
const files = fs
  .readdirSync(PEDIGREE_DIR)
  .filter((file) => file.endsWith('.json') && !file.includes('.backup'))
  .filter((file) => file !== 'pedigree-metadata.json' && file !== 'horse-link-map.json')

console.log(`📁 Found ${files.length} JSON files`)

const horseLinkMap = {}
let totalHorses = 0
let totalEntries = 0
let errorCount = 0

/**
 * 馬データを再帰的に処理してマップに追加
 */
function processHorse(horse, family) {
  if (!horse || !horse.id) {
    return
  }

  totalHorses++

  // 競走名（name）のリンクを追加
  if (horse.name) {
    const key = horse.linkName || horse.name
    horseLinkMap[key] = {
      link: horse.id,
      family: family,
      name: horse.name,
    }
    totalEntries++
  }

  // 血統名（pedigreeName）のリンクを追加
  if (horse.pedigreeName) {
    const key = horse.linkPedigreeName || horse.pedigreeName
    horseLinkMap[key] = {
      link: horse.id,
      family: family,
      name: horse.pedigreeName,
    }
    totalEntries++
  }

  // 子馬を再帰的に処理
  if (horse.children && Array.isArray(horse.children)) {
    horse.children.forEach((child) => processHorse(child, family))
  }
}

let traditionalFamilyCount = 0

files.forEach((fileName, index) => {
  try {
    const filePath = path.join(PEDIGREE_DIR, fileName)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    if (data.metadata && data.metadata.rootHorseId && data.horses && Array.isArray(data.horses)) {
      // 在来牝系のみを処理対象とする
      if (data.metadata.isTraditionalFamily !== true) {
        return // 在来牝系でない場合はスキップ
      }

      const family = data.metadata.rootHorseId
      traditionalFamilyCount++

      // 全馬データを処理
      data.horses.forEach((horse) => processHorse(horse, family))

      if ((index + 1) % 100 === 0) {
        console.log(`✓ Processed ${index + 1}/${files.length} files... (${totalEntries} entries from ${traditionalFamilyCount} traditional families)`)
      }
    } else {
      console.warn(`⚠ Warning: ${fileName} has invalid structure`)
      errorCount++
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message)
    errorCount++
  }
})

// 結果を書き込み
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(horseLinkMap, null, 2), 'utf8')

console.log('\n✅ Generation complete!')
console.log(`📊 Traditional families processed: ${traditionalFamilyCount} / ${files.length}`)
console.log(`📊 Total horses processed: ${totalHorses}`)
console.log(`📊 Total link entries: ${totalEntries}`)
console.log(`❌ Errors: ${errorCount} files`)
console.log(`💾 Output: ${OUTPUT_FILE}`)
console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`)
