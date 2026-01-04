module.exports = {
  // 部分的にステージングされたファイルの処理を改善
  // 未ステージングの変更を一時的に保存してからlintを実行
  '*.(js|jsx|ts|tsx|json|css|md|mdx)': (filenames) => {
    return [`prettier --write ${filenames.join(' ')}`]
  },
  'app/**/*.(js|jsx|ts|tsx)': (filenames) => {
    return [`cross-env NODE_OPTIONS='--max-old-space-size=4096' eslint --fix --max-warnings 0 ${filenames.join(' ')}`]
  },
  'components/**/*.(js|jsx|ts|tsx)': (filenames) => {
    return [`cross-env NODE_OPTIONS='--max-old-space-size=4096' eslint --fix --max-warnings 0 ${filenames.join(' ')}`]
  },
  'layouts/**/*.(js|jsx|ts|tsx)': (filenames) => {
    return [`cross-env NODE_OPTIONS='--max-old-space-size=4096' eslint --fix --max-warnings 0 ${filenames.join(' ')}`]
  },
}
