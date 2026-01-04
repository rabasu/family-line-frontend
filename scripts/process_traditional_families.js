const fs = require('fs')
const path = require('path')

// pedigreeNameをスネークケースに変換する関数
function pedigreeNameToSnakeCase(pedigreeName) {
  if (!pedigreeName) return ''
  return pedigreeName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

// JSONファイル名からキー名を生成する関数（generateKeyNameと同じロジック）
function generateKeyName(fileName) {
  return fileName
    .replace('.json', '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

// familyList.tsxからimportedMaresのidリストを取得
const familyListPath = path.join(__dirname, '../app/data/familyList.tsx')
const familyListContent = fs.readFileSync(familyListPath, 'utf-8')

// importedMares配列からidを抽出
const importedMaresIds = []
const importedMaresMatch = familyListContent.match(/export const importedMares = \[([\s\S]*?)\]/)
if (importedMaresMatch) {
  const maresContent = importedMaresMatch[1]
  const idMatches = maresContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)
  for (const match of idMatches) {
    importedMaresIds.push(match[1])
  }
}

console.log(`Found ${importedMaresIds.length} imported mares in familyList.tsx`)

// pedigreeディレクトリ内のすべてのJSONファイルを取得
const pedigreeDir = path.join(__dirname, '../app/pedigree')
const jsonFiles = fs
  .readdirSync(pedigreeDir)
  .filter((file) => file.endsWith('.json'))
  .filter((file) => !file.endsWith('.backup.json'))

console.log(`Found ${jsonFiles.length} pedigree JSON files`)

// 既存のmdxファイルを確認
const familyDir = path.join(__dirname, '../data/family')
const existingMdxFiles = new Set()
if (fs.existsSync(familyDir)) {
  const mdxFiles = fs
    .readdirSync(familyDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace('.mdx', ''))
  mdxFiles.forEach((file) => existingMdxFiles.add(file))
  console.log(`Found ${existingMdxFiles.size} existing MDX files`)
}

const traditionalFamilies = []
const updatedFiles = []
const createdMdxFiles = []

// 各JSONファイルを処理
for (const jsonFile of jsonFiles) {
  const jsonPath = path.join(pedigreeDir, jsonFile)
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
  let pedigreeData

  try {
    pedigreeData = JSON.parse(jsonContent)
  } catch (error) {
    console.error(`Error parsing ${jsonFile}:`, error.message)
    continue
  }

  if (!pedigreeData.metadata || !pedigreeData.metadata.rootHorseId) {
    console.warn(`Skipping ${jsonFile}: missing metadata or rootHorseId`)
    continue
  }

  // 牝祖を取得
  const rootHorseId = pedigreeData.metadata.rootHorseId
  const rootHorse = pedigreeData.horses?.find((h) => h.id === rootHorseId)

  if (!rootHorse) {
    console.warn(`Skipping ${jsonFile}: root horse ${rootHorseId} not found`)
    continue
  }

  // 在来牝系かどうかを判定
  let isTraditional = false
  let reason = ''

  // (1) familyList.tsxに記載があるか
  const pedigreeName = pedigreeData.metadata.pedigreeName
  const normalizedId = pedigreeNameToSnakeCase(pedigreeName)
  if (importedMaresIds.includes(normalizedId)) {
    isTraditional = true
    reason = 'familyList.tsx'
  }

  // (2) importedYearが1944年以前
  if (!isTraditional && rootHorse.importedYear) {
    const importedYear = parseInt(rootHorse.importedYear)
    if (!isNaN(importedYear) && importedYear <= 1944) {
      isTraditional = true
      reason = `importedYear ${importedYear}`
    }
  }

  // (3) foaled.yearが1935年以前
  if (!isTraditional && rootHorse.foaled?.year) {
    const foaledYear = parseInt(rootHorse.foaled.year)
    if (!isNaN(foaledYear) && foaledYear <= 1935) {
      isTraditional = true
      reason = `foaled.year ${foaledYear}`
    }
  }

  if (isTraditional) {
    traditionalFamilies.push({
      jsonFile,
      pedigreeName: pedigreeName || jsonFile.replace('.json', ''),
      rootHorseId,
      rootHorseName: rootHorse.name || rootHorse.pedigreeName,
      reason,
    })

    // metadataにフラグを追加
    if (!pedigreeData.metadata.isTraditionalFamily) {
      pedigreeData.metadata.isTraditionalFamily = true

      // JSONファイルを更新
      const updatedJson = JSON.stringify(pedigreeData, null, 2)
      fs.writeFileSync(jsonPath, updatedJson, 'utf-8')
      updatedFiles.push(jsonFile)
    }

    // mdxファイルが存在しない場合は作成
    // rootHorseIdをMDXファイル名とFamilyTreeのname属性として使用
    const mdxFileName = rootHorseId

    if (!existingMdxFiles.has(mdxFileName)) {
      const mdxPath = path.join(familyDir, `${mdxFileName}.mdx`)

      // 牝系名を取得（日本語名を優先、なければ英語名）
      const displayName = rootHorse.name || rootHorse.pedigreeName || pedigreeName || mdxFileName

      // mdxファイルの内容を作成
      const mdxContent = `---
title: ${displayName}系
date: '${new Date().toISOString().split('T')[0]}'
tags: []
draft: false
summary: 
type: Family
---

## 概要

${rootHorse.importedYear ? `${rootHorse.importedYear}年に` : ''}輸入された基礎牝馬「**${displayName}**」を牝祖とするファミリーライン。

<ProfileTable horseId="${rootHorseId}" />

<FamilyTree name='${rootHorseId}' />
`

      fs.writeFileSync(mdxPath, mdxContent, 'utf-8')
      createdMdxFiles.push(mdxFileName)
      console.log(`Created MDX file: ${mdxFileName}.mdx`)
    }
  }
}

console.log('\n=== Summary ===')
console.log(`Traditional families found: ${traditionalFamilies.length}`)
console.log(`JSON files updated: ${updatedFiles.length}`)
console.log(`MDX files created: ${createdMdxFiles.length}`)

if (traditionalFamilies.length > 0) {
  console.log('\n=== Traditional Families ===')
  traditionalFamilies.forEach((f) => {
    console.log(`- ${f.pedigreeName} (${f.jsonFile}): ${f.reason}`)
  })
}

if (createdMdxFiles.length > 0) {
  console.log('\n=== Created MDX Files ===')
  createdMdxFiles.forEach((f) => {
    console.log(`- ${f}.mdx`)
  })
}
