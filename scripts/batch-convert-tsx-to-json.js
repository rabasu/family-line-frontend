#!/usr/bin/env node

/**
 * 一括TSX→JSON変換スクリプト
 *
 * 使用方法:
 * node scripts/batch-convert-tsx-to-json.js
 */

const fs = require('fs')
const path = require('path')
const { convertTsxToJson } = require('./convert-tsx-to-json.js')

// 変換対象のディレクトリ
const PEDIGREE_DIR = 'app/pedigree'

// 除外するファイル
const EXCLUDE_FILES = ['index.tsx', 'HorseList.tsx']

// 既に変換済みのファイル
const ALREADY_CONVERTED = ['ScarletInk.json', 'RollYourOwn.json']

function getAllTsxFiles() {
  try {
    const files = fs.readdirSync(PEDIGREE_DIR)
    return files
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => !EXCLUDE_FILES.includes(file))
      .map((file) => path.join(PEDIGREE_DIR, file))
  } catch (error) {
    console.error(`ディレクトリ読み込みエラー: ${error.message}`)
    return []
  }
}

function getJsonFileName(tsxPath) {
  return tsxPath.replace('.tsx', '.json')
}

function isAlreadyConverted(tsxPath) {
  const jsonPath = getJsonFileName(tsxPath)
  const jsonFileName = path.basename(jsonPath)
  return ALREADY_CONVERTED.includes(jsonFileName) || fs.existsSync(jsonPath)
}

async function convertFile(tsxPath) {
  const jsonPath = getJsonFileName(tsxPath)
  const fileName = path.basename(tsxPath)

  try {
    console.log(`🔄 Converting ${fileName}...`)
    const jsonData = convertTsxToJson(tsxPath)

    // JSONファイルに書き込み
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8')

    console.log(`✅ ${fileName} → ${path.basename(jsonPath)} (${jsonData.horses.length} horses)`)
    return { success: true, fileName, horseCount: jsonData.horses.length }
  } catch (error) {
    console.error(`❌ ${fileName} conversion failed: ${error.message}`)
    return { success: false, fileName, error: error.message }
  }
}

async function main() {
  console.log('🚀 Starting batch TSX to JSON conversion...\n')

  const tsxFiles = getAllTsxFiles()
  console.log(`📁 Found ${tsxFiles.length} TSX files to process\n`)

  // 既に変換済みのファイルを除外
  const filesToConvert = tsxFiles.filter((file) => !isAlreadyConverted(file))
  const alreadyConverted = tsxFiles.filter((file) => isAlreadyConverted(file))

  console.log(`✅ Already converted: ${alreadyConverted.length} files`)
  console.log(`🔄 To convert: ${filesToConvert.length} files\n`)

  if (filesToConvert.length === 0) {
    console.log('🎉 All files are already converted!')
    return
  }

  // 変換結果を記録
  const results = {
    success: [],
    failed: [],
    totalHorses: 0,
  }

  // ファイルを順次変換
  for (let i = 0; i < filesToConvert.length; i++) {
    const file = filesToConvert[i]
    const result = await convertFile(file)

    if (result.success) {
      results.success.push(result)
      results.totalHorses += result.horseCount
    } else {
      results.failed.push(result)
    }

    // 進捗表示
    const progress = Math.round(((i + 1) / filesToConvert.length) * 100)
    console.log(`📊 Progress: ${i + 1}/${filesToConvert.length} (${progress}%)\n`)
  }

  // 結果サマリー
  console.log('🎯 Conversion Summary:')
  console.log(`✅ Successful: ${results.success.length} files`)
  console.log(`❌ Failed: ${results.failed.length} files`)
  console.log(`🐎 Total horses converted: ${results.totalHorses}`)

  if (results.failed.length > 0) {
    console.log('\n❌ Failed files:')
    results.failed.forEach((result) => {
      console.log(`  - ${result.fileName}: ${result.error}`)
    })
  }

  if (results.success.length > 0) {
    console.log('\n✅ Successfully converted files:')
    results.success.forEach((result) => {
      console.log(`  - ${result.fileName}: ${result.horseCount} horses`)
    })
  }

  console.log('\n🎉 Batch conversion completed!')
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Batch conversion failed:', error.message)
    process.exit(1)
  })
}

module.exports = { main, convertFile, getAllTsxFiles }
