#!/usr/bin/env node

/**
 * generate-traditional-family-index.js
 *
 * pedigree-metadata.json と各 pedigree JSON から在来牝系一覧用のインデックスを生成
 * 出力: data/pedigree/traditional-family-index.json
 */

const fs = require('fs')
const path = require('path')

const PEDIGREE_DIR = path.join(__dirname, '../app/pedigree')
const DATA_PEDIGREE_DIR = path.join(__dirname, '../data/pedigree')
const METADATA_FILE = path.join(DATA_PEDIGREE_DIR, 'pedigree-metadata.json')
const OUTPUT_FILE = path.join(DATA_PEDIGREE_DIR, 'traditional-family-index.json')

console.log('🔍 Reading pedigree-metadata.json...')

if (!fs.existsSync(METADATA_FILE)) {
  console.error('❌ pedigree-metadata.json not found. Run generate-pedigree-metadata.js first.')
  process.exit(1)
}

const pedigreeMetadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'))
const slugs = Object.keys(pedigreeMetadata)
console.log(`📁 Found ${slugs.length} traditional families`)

const families = []
let errorCount = 0

slugs.forEach((slug, index) => {
  try {
    const fileName = pedigreeMetadata[slug]
    const filePath = path.join(PEDIGREE_DIR, fileName)

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Warning: ${fileName} not found for slug ${slug}`)
      errorCount++
      return
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    const rootHorseId = data.metadata?.rootHorseId || slug
    const rootHorse = data.horses?.find((h) => h.id === rootHorseId)

    if (!rootHorse) {
      console.warn(`⚠ Warning: root horse ${rootHorseId} not found in ${fileName}`)
      errorCount++
      return
    }

    const foaled = rootHorse.foaled?.year != null ? String(rootHorse.foaled.year) : ''
    const breeder = rootHorse.breeder ?? ''
    const importedYear = rootHorse.importedYear ?? ''
    const owner = rootHorse.owner ?? ''
    const breed = rootHorse.breed ?? ''

    families.push({
      slug,
      name: rootHorse.name ?? '',
      foaled,
      breeder,
      importedYear,
      owner,
      breed,
    })

    if ((index + 1) % 50 === 0) {
      console.log(`✓ Processed ${index + 1}/${slugs.length}...`)
    }
  } catch (error) {
    console.error(`❌ Error processing ${slug}:`, error.message)
    errorCount++
  }
})

// 馬名順（五十音）でソート
families.sort((a, b) => {
  const nameA = a.name || ''
  const nameB = b.name || ''
  return nameA.localeCompare(nameB, 'ja')
})

const output = { families }
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8')

console.log('\n✅ Generation complete!')
console.log(`📊 Families in index: ${families.length}`)
console.log(`❌ Errors: ${errorCount}`)
console.log(`💾 Output: ${OUTPUT_FILE}`)
console.log(`📦 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)
