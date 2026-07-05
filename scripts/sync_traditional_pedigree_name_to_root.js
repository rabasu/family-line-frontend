/**
 * 在来牝系（metadata.isTraditionalFamily === true）の pedigreeName を
 * 牝祖（rootHorseId に一致する馬）に揃える。
 * 牝祖に pedigreeName があればそれを、なければ name を用いる。
 * 既に metadata.pedigreeName がその値と一致するファイルは書き換えない。
 *
 * 使い方:
 *   node scripts/sync_traditional_pedigree_name_to_root.js
 *   node scripts/sync_traditional_pedigree_name_to_root.js --dry-run
 */

function preferredRootPedigreeLabel(root) {
  const pn = root.pedigreeName
  if (pn != null && String(pn).trim() !== '') return String(pn).trim()
  const n = root.name
  if (n != null && String(n).trim() !== '') return String(n).trim()
  return null
}

const fs = require('fs')
const path = require('path')

const pedigreeDir = path.join(__dirname, '../app/pedigree-traditional')
const dryRun = process.argv.includes('--dry-run')

const jsonFiles = fs.readdirSync(pedigreeDir).filter((f) => f.endsWith('.json') && !f.endsWith('.backup.json'))

const updated = []
const skippedSame = []
const skippedNonTraditional = []
const errors = []

for (const jsonFile of jsonFiles) {
  const jsonPath = path.join(pedigreeDir, jsonFile)
  let data
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    errors.push({ jsonFile, error: e.message })
    continue
  }

  const meta = data.metadata
  if (!meta) {
    errors.push({ jsonFile, error: 'missing metadata' })
    continue
  }

  if (meta.isTraditionalFamily !== true) {
    skippedNonTraditional.push(jsonFile)
    continue
  }

  const rootId = meta.rootHorseId
  if (!rootId) {
    errors.push({ jsonFile, error: 'missing rootHorseId' })
    continue
  }

  const root = data.horses?.find((h) => h.id === rootId)
  if (!root) {
    errors.push({ jsonFile, error: `root horse not found: ${rootId}` })
    continue
  }

  const target = preferredRootPedigreeLabel(root)
  if (target == null) {
    errors.push({ jsonFile, error: 'root horse has no pedigreeName or name' })
    continue
  }

  if (meta.pedigreeName === target) {
    skippedSame.push(jsonFile)
    continue
  }

  updated.push({
    jsonFile,
    from: meta.pedigreeName,
    to: target,
  })

  if (!dryRun) {
    meta.pedigreeName = target
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
  }
}

console.log(`対象ディレクトリ: ${pedigreeDir}`)
console.log(dryRun ? 'モード: --dry-run（書き込みなし）' : 'モード: 書き込み実行')
console.log('')
console.log(`更新: ${updated.length} 件`)
updated.forEach((u) => {
  console.log(`  ${u.jsonFile}: "${u.from}" → "${u.to}"`)
})
console.log('')
console.log(`スキップ（既に牝祖の表示名と一致）: ${skippedSame.length} 件`)
console.log(`スキップ（在来牝系でない）: ${skippedNonTraditional.length} 件`)

if (errors.length > 0) {
  console.log('')
  console.log(`エラー: ${errors.length} 件`)
  errors.forEach((e) => console.log(`  ${e.jsonFile}: ${e.error}`))
  process.exitCode = 1
}
