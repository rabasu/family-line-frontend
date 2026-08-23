const path = require('path')

/**
 * contentlayer は作業ディレクトリを決めるとき process.cwd() より環境変数 PWD を優先する
 * （@contentlayer2/core/dist/cwd.js: `process.env.PWD ?? process.cwd()`）。
 *
 * Git Bash や MSYS 系のシェルは PWD に `/c/Users/...` という POSIX 形式のパスを入れるため、
 * Windows では実在しないパスが作業ディレクトリとして採用されてしまう。
 * その状態だと contentlayer 内部の Effect-TS ストリームが結果を返さないまま
 * `while (!result)` ループを回し続け、CPU を 100% 使ったままビルドが永久に終わらない。
 * （エラーにならないので原因が非常に分かりにくい）
 *
 * PWD が実際の作業ディレクトリと食い違うときだけ取り除く。
 * Linux/macOS の CI では両者が一致するので、この関数は何もしない。
 */
function normalizeCwdEnv() {
  const pwd = process.env.PWD
  if (!pwd) return false

  if (path.resolve(pwd) === path.resolve(process.cwd())) return false

  delete process.env.PWD
  return true
}

module.exports = { normalizeCwdEnv }
