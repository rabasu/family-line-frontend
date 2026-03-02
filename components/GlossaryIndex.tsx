'use client'

/**
 * 五十音の行頭文字（あ行、か行...）を返す
 */
function getIndexKey(yomi: string): string {
  const first = yomi[0]
  if (!first) return '他'
  if (/[あいうえお]/.test(first)) return 'あ'
  if (/[かきくけこ]/.test(first)) return 'か'
  if (/[さしすせそ]/.test(first)) return 'さ'
  if (/[たちつてと]/.test(first)) return 'た'
  if (/[なにぬねの]/.test(first)) return 'な'
  if (/[はひふへほ]/.test(first)) return 'は'
  if (/[まみむめも]/.test(first)) return 'ま'
  if (/[やゆよ]/.test(first)) return 'や'
  if (/[らりるれろ]/.test(first)) return 'ら'
  if (/[わをん]/.test(first)) return 'わ'
  if (/[0-9a-zA-Z]/.test(first)) return '他'
  return '他'
}

const INDEX_KEYS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', '他']

interface GlossaryIndexProps {
  /** 現在表示されている用語が属する頭文字の集合（検索で絞り込んだ場合に非表示のインデックスをグレーアウト可能） */
  activeKeys?: Set<string>
}

export default function GlossaryIndex({ activeKeys }: GlossaryIndexProps) {
  const handleClick = (key: string) => {
    const el = document.getElementById(`index-${key}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-wrap gap-1" role="navigation" aria-label="頭文字でジャンプ">
      {INDEX_KEYS.map((key) => {
        const isActive = !activeKeys || activeKeys.has(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleClick(key)}
            className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
              isActive ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}

export { getIndexKey }
