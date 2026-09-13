#!/usr/bin/env node

/**
 * 静的エクスポート（out/）のローカル確認用サーバ。
 *
 * python -m http.server は /florries-cup を florries-cup.html に結び付けない。
 * Cloudflare Workers の静的アセットはデフォルトでその変換をするので、
 * 本番と同じ URL（拡張子なし）で確認できるようにしている。
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream')

const ROOT = path.resolve(__dirname, '../out')
const PORT = Number(process.env.PORT) || 3456

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
}

function safeJoin(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0])
  const resolved = path.resolve(ROOT, '.' + decoded)
  if (!resolved.startsWith(ROOT)) return null
  return resolved
}

function candidates(filePath) {
  const list = []
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) list.push(filePath)
  if (fs.existsSync(filePath + '.html')) list.push(filePath + '.html')
  if (fs.existsSync(filePath + '.txt')) list.push(filePath + '.txt')
  const asDir = path.join(filePath, 'index.html')
  if (fs.existsSync(asDir)) list.push(asDir)
  return list
}

const server = http.createServer((req, res) => {
  const filePath = safeJoin(req.url || '/')
  if (!filePath) {
    res.writeHead(400)
    res.end('bad path')
    return
  }

  const found = candidates(filePath)[0]
  if (!found) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404')
    return
  }

  const type = TYPES[path.extname(found)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  pipeline(fs.createReadStream(found), res, (err) => {
    if (err && !res.headersSent) {
      res.writeHead(500)
      res.end('error')
    }
  })
})

if (!fs.existsSync(ROOT)) {
  console.error('out/ が無いよ。先に npm run build してね')
  process.exit(1)
}

server.listen(PORT, () => {
  console.log(`静的プレビュー: http://127.0.0.1:${PORT}/`)
  console.log('Ctrl+C で止まるよ')
})
