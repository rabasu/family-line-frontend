'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { horseHref, isReservedRootSlug } from '@/lib/horse-id'

const OPEN_EVENT = 'horse-modal:open'

/** 解説をモーダルに残すおおよその文字数（超えたらクリップ） */
const ARTICLE_CLIP_CHARS = 480
/** クリップ時に残す段落数の上限 */
const ARTICLE_CLIP_PARAS = 2

type OpenDetail = { horseId: string; displayName: string }

/** 馬名リンクからモーダルを開く。レイアウトに置いた HorseDetailModal が受け取る */
export function openHorseModal(horseId: string, displayName: string) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: { horseId, displayName } }))
}

// 同じ馬を何度も開くのはよくあるので、取得済みの本文は保持しておく
const fragmentCache = new Map<string, string>()

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fullPageHref(horseId: string, hash = ''): string {
  return horseHref(horseId, hash)
}

function parseHorseHref(href: string): string | null {
  const path = href.split(/[?#]/)[0]
  const match = path.match(/^\/([^/]+)$/)
  if (!match) return null
  const id = decodeURIComponent(match[1] || '')
  if (!id || isReservedRootSlug(id)) return null
  return id
}

/** インタラクティブ／巨大な節を、見出し＋要約＋個別ページ誘導に差し替える */
function replaceTeaseSections(detail: Element, horseId: string) {
  detail.querySelectorAll('[data-horse-modal-tease]').forEach((section) => {
    const title = section.getAttribute('data-tease-title') || section.querySelector('h2')?.textContent?.trim() || '詳細'
    const summary = section.getAttribute('data-tease-summary') || ''
    const hash = section.getAttribute('data-tease-href') || ''
    const replacement = detail.ownerDocument.createElement('section')
    replacement.className = 'py-6'
    replacement.innerHTML = `
      <h2 class="mb-2 text-xl font-bold text-heading">${escapeHtml(title)}</h2>
      ${summary ? `<p class="mb-3 text-sm text-muted">${escapeHtml(summary)}</p>` : ''}
      <a href="${fullPageHref(horseId, hash)}" data-full-page class="link-inline text-sm font-medium">個別ページで見る</a>
    `
    section.replaceWith(replacement)
  })
}

/** 長文解説は冒頭だけ残し、「続きを読む」で個別ページへ */
function clipArticleSections(detail: Element, horseId: string) {
  detail.querySelectorAll('[data-horse-modal-clip]').forEach((section) => {
    const blocks = [...section.children].filter((el) => el.tagName !== 'H2')
    if (blocks.length === 0) return

    let keptChars = 0
    const keep: Element[] = []
    for (const block of blocks) {
      if (keep.length >= ARTICLE_CLIP_PARAS && keptChars >= ARTICLE_CLIP_CHARS) break
      keep.push(block)
      keptChars += (block.textContent || '').trim().length
      if (keptChars >= ARTICLE_CLIP_CHARS) break
    }

    // 全部残せたならクリップ不要（CTA も出さない）
    if (keep.length >= blocks.length) return

    const keepSet = new Set(keep)
    for (const block of blocks) {
      if (!keepSet.has(block)) block.remove()
    }

    const cta = detail.ownerDocument.createElement('p')
    cta.className = 'mt-4 not-prose'
    cta.innerHTML = `<a href="${fullPageHref(horseId, '#article')}" data-full-page class="link-inline text-sm font-medium">続きを読む</a>`
    section.appendChild(cta)
  })
}

/**
 * 個別ページの HTML から本文だけを取り出す。
 * 静的エクスポートでは API を置けないので、ページそのものをデータソースとして使っている。
 */
async function fetchHorseFragment(horseId: string): Promise<string> {
  const cached = fragmentCache.get(horseId)
  if (cached) return cached

  // Cloudflare は /id → id.html を返す。
  // 拡張子を要求する静的サーバ向けに .html も試す。
  const encoded = encodeURIComponent(horseId)
  const paths = [`/${encoded}`, `/${encoded}.html`]
  let res: Response | null = null
  for (const path of paths) {
    const attempt = await fetch(path)
    if (attempt.ok) {
      res = attempt
      break
    }
  }
  if (!res) throw new Error('この馬のページが見つからなかったよ')

  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const detail = doc.querySelector('[data-horse-detail]')
  if (!detail) throw new Error('ページの中身を読み取れなかったよ')

  // ページに埋め込まれた RSC ペイロードなどを持ち込まない。
  // コメント欄は生 HTML では動かないので落とす（個別ページで読んでもらう）
  detail.querySelectorAll('script,link,style,[data-horse-comments]').forEach((node) => node.remove())

  // チェックボックス付きの巨大節はティーザーに。長文解説は冒頭だけ。
  replaceTeaseSections(detail, horseId)
  clipArticleSections(detail, horseId)

  const html = detail.innerHTML
  fragmentCache.set(horseId, html)
  return html
}

export default function HorseDetailModal() {
  const [open, setOpen] = useState(false)
  const [horseId, setHorseId] = useState('')
  const [title, setTitle] = useState('')
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // モーダルを開くときに履歴を1つだけ積む。閉じる時にそれを戻す
  const pushedRef = useRef(false)
  const requestRef = useRef(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (id: string, displayName: string) => {
    const token = ++requestRef.current
    setHorseId(id)
    setTitle(displayName)
    setError(null)
    setHtml(null)
    setLoading(true)
    try {
      const fragment = await fetchHorseFragment(id)
      if (requestRef.current === token) setHtml(fragment)
    } catch (e) {
      if (requestRef.current === token) setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (requestRef.current === token) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const { horseId, displayName } = (event as CustomEvent<OpenDetail>).detail
      const url = horseHref(horseId)
      if (pushedRef.current) {
        // モーダル内での馬移動。履歴は増やさず、戻るで必ず元のページに帰れるようにする
        history.replaceState({ horseModal: horseId }, '', url)
      } else {
        history.pushState({ horseModal: horseId }, '', url)
        pushedRef.current = true
      }
      setOpen(true)
      void load(horseId, displayName)
    }

    const onPopState = (event: PopStateEvent) => {
      if ((event.state as { horseModal?: string } | null)?.horseModal) return
      pushedRef.current = false
      setOpen(false)
    }

    window.addEventListener(OPEN_EVENT, onOpen)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen)
      window.removeEventListener('popstate', onPopState)
    }
  }, [load])

  const close = useCallback(() => {
    if (pushedRef.current) {
      // popstate 側で setOpen(false) される
      history.back()
    } else {
      setOpen(false)
    }
  }, [])

  // 差し込んだ本文の中の馬リンクも、そのままモーダル内で辿れるようにする。
  // data-full-page は個別ページ誘導。pushState 済みの同一 URL だと hash だけでは遷移しないので強制する。
  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href) return

    if (anchor.hasAttribute('data-full-page')) {
      e.preventDefault()
      // モーダルは pushState で既に /id にいることが多い。
      // 同パス + hash だとドキュメント遷移が起きないので、必要なら reload する。
      const url = new URL(href, window.location.origin)
      if (window.location.pathname === url.pathname) {
        window.location.replace(url.href)
        window.location.reload()
      } else {
        window.location.assign(url.href)
      }
      return
    }

    const id = parseHorseHref(href)
    if (!id) return
    e.preventDefault()
    openHorseModal(id, anchor.textContent?.trim() || '')
    bodyRef.current?.scrollTo({ top: 0 })
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <Dialog.Panel className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-950">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-theme px-4 py-3">
                  <Dialog.Title className="text-base font-semibold text-heading">{title}</Dialog.Title>
                  <div className="flex items-center gap-3">
                    <a
                      href={horseHref(horseId)}
                      className="link-inline text-xs"
                    >
                      ページを開く
                    </a>
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-md p-1 text-subtle hover:text-label"
                    >
                      <span className="sr-only">閉じる</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* 差し込んだ本文内の <a> へのイベント委譲。Enter でも click は発火するのでキーボード操作も届く */}
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div ref={bodyRef} className="flex-1 overflow-auto px-4" onClick={onBodyClick}>
                  {loading && <p className="py-8 text-sm text-muted">読み込んでるよ…</p>}
                  {error && <p className="py-8 text-sm text-red-600">{error}</p>}
                  {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
