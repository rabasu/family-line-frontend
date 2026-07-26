/**
 * data/family 配下の MDX frontmatter で draft: true の牝系 slug を収集する。
 * slug は contentlayer と同様に family/ 配下の相対パス（拡張子なし）。
 * 在来牝系 JSON の rootHorseId / traditional-family-index の slug と一致する想定。
 */

const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const FAMILY_MDX_DIR = path.join(__dirname, '../../data/family')

function walkMdxFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkMdxFiles(fullPath, files)
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * @returns {Set<string>} draft: true の牝系 slug 集合
 */
function getDraftFamilySlugs() {
  const drafts = new Set()
  const files = walkMdxFiles(FAMILY_MDX_DIR)

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(content)
      if (data.draft === true) {
        const rel = path.relative(FAMILY_MDX_DIR, filePath).replace(/\\/g, '/')
        const slug = rel.replace(/\.mdx$/, '')
        drafts.add(slug)
      }
    } catch (error) {
      console.warn(`⚠ Warning: failed to parse ${filePath}: ${error.message}`)
    }
  }

  return drafts
}

module.exports = { getDraftFamilySlugs, FAMILY_MDX_DIR }
