'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'

const OPEN_EVENT = 'horse-modal:open'

type OpenDetail = { horseId: string; displayName: string }

/** 馬名リンクからモーダルを開く。レイアウトに置いた HorseDetailModal が受け取る */
export function openHorseModal(horseId: string, displayName: string) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: { horseId, displayName } }))
}

// 同じ馬を何度も開くのはよくあるので、取得済みの本文は保持しておく
const fragmentCache = new Map<string, string>()

/**
 * 個別ページの HTML から本文だけを取り出す。
 * 静的エクスポートでは API を置けないので、ページそのものをデータソースとして使っている。
 */
async function fetchHorseFragment(horseId: string): Promise<string> {
  const cached = fragmentCache.get(horseId)
  if (cached) return cached

  // Cloudflare は /horse/id → horse/id.html を返す。
  // 拡張子を要求する静的サーバ向けに .html も試す。
  const paths = [`/horse/${encodeURIComponent(horseId)}`, `/horse/${encodeURIComponent(horseId)}.html`]
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
      const url = `/horse/${encodeURIComponent(horseId)}`
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

  // 差し込んだ本文の中の馬リンクも、そのままモーダル内で辿れるようにする
  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const anchor = (e.target as HTMLElement).closest('a')
    const href = anchor?.getAttribute('href')
    if (!href?.startsWith('/horse/')) return
    e.preventDefault()
    openHorseModal(decodeURIComponent(href.slice('/horse/'.length)), anchor?.textContent?.trim() || '')
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
              <Dialog.Panel className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
                  <Dialog.Title className="text-base font-semibold text-stone-900">{title}</Dialog.Title>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/horse/${encodeURIComponent(horseId)}`}
                      className="text-xs text-sky-700 hover:underline"
                    >
                      ページを開く
                    </a>
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-md p-1 text-stone-400 hover:text-stone-600"
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
                  {loading && <p className="py-8 text-sm text-stone-500">読み込んでるよ…</p>}
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
