import fs from 'fs'
import path from 'path'
import rss from './rss.mjs'

/**
 * App Router の静的書き出しは各 URL に RSC ペイロード .txt を足す。
 * 遷移は <a> のフルロードなので、対応する .html がある .txt は公開しない。
 * robots.txt のように .html を持たないものは残す。
 */
function removeRscPayloads(dir) {
  if (!fs.existsSync(dir)) return 0
  let removed = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      removed += removeRscPayloads(full)
      continue
    }
    if (!entry.name.endsWith('.txt')) continue
    const html = full.slice(0, -4) + '.html'
    if (!fs.existsSync(html)) continue
    fs.unlinkSync(full)
    removed++
  }
  return removed
}

async function postbuild() {
  const removed = removeRscPayloads(path.join(process.cwd(), 'out'))
  console.log(`Removed ${removed} RSC payload .txt files from out/`)
  await rss()
}

postbuild()
