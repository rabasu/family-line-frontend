#!/usr/bin/env node

/**
 * generate-pedigree-metadata.js
 *
 * 在来牝系（isTraditionalFamily === true）のJSONファイルから rootHorseId → ファイル名 のマッピングを生成
 * 出力: app/pedigree/pedigree-metadata.json
 */

const fs = require('fs')
const path = require('path')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree')
const OUTPUT_FILE = path.join(PEDIGREE_DIR, 'pedigree-metadata.json')

console.log('🔍 Scanning JSON files in:', PEDIGREE_DIR)

// JSONファイルを取得
const files = fs
  .readdirSync(PEDIGREE_DIR)
  .filter((file) => file.endsWith('.json') && !file.includes('.backup'))
  .filter((file) => file !== 'pedigree-metadata.json' && file !== 'horse-link-map.json')

console.log(`📁 Found ${files.length} JSON files`)

const metadata = {}
let successCount = 0
let traditionalFamilyCount = 0
let errorCount = 0

files.forEach((fileName, index) => {
  try {
    const filePath = path.join(PEDIGREE_DIR, fileName)
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    if (data.metadata && data.metadata.rootHorseId) {
      // 在来牝系のみを処理対象とする
      if (data.metadata.isTraditionalFamily !== true) {
        return // 在来牝系でない場合はスキップ
      }

      const rootHorseId = data.metadata.rootHorseId
      metadata[rootHorseId] = fileName
      successCount++
      traditionalFamilyCount++

      if (traditionalFamilyCount % 50 === 0) {
        console.log(`✓ Processed ${index + 1}/${files.length} files... (${traditionalFamilyCount} traditional families)`)
      }
    } else {
      console.warn(`⚠ Warning: ${fileName} has no metadata.rootHorseId`)
      errorCount++
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message)
    errorCount++
  }
})

// 結果を書き込み
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2), 'utf8')

console.log('\n✅ Generation complete!')
console.log(`📊 Traditional families processed: ${traditionalFamilyCount} / ${files.length}`)
console.log(`📊 Successfully processed: ${successCount} files`)
console.log(`❌ Errors: ${errorCount} files`)
console.log(`💾 Output: ${OUTPUT_FILE}`)
console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)
