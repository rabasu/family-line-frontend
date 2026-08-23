#!/usr/bin/env node

/**
 * contentlayer の CLI を、作業ディレクトリの環境変数を正規化してから起動する。
 * 詳細は scripts/lib/normalize-cwd-env.js のコメントを参照。
 */

const path = require('path')
const { spawn } = require('child_process')
const { normalizeCwdEnv } = require('./lib/normalize-cwd-env')

if (normalizeCwdEnv()) {
  console.log('PWD が作業ディレクトリと食い違っていたため取り除きました（contentlayer のハング対策）')
}

const cli = path.join(__dirname, '..', 'node_modules', 'contentlayer2', 'bin', 'cli.cjs')
const child = spawn(process.execPath, [cli, 'build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
