'use client'

import { Fragment, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import type { FiveGenPedigreeResponse } from '@/types/FiveGenPedigree'
import FiveGenPedigreeTable from './FiveGenPedigreeTable'

type Props = {
  horseId: string
  displayName: string
}

export default function HorseNameWithPedigree({ horseId, displayName }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<FiveGenPedigreeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openedAtRef = useRef(0)

  useEffect(() => {
    if (!open || data) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/horse-five-gen?id=${encodeURIComponent(horseId)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
        return json as FiveGenPedigreeResponse
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, horseId, data])

  const openModal = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.button !== 0) return
    openedAtRef.current = Date.now()
    setOpen(true)
  }

  const closeModal = () => {
    if (Date.now() - openedAtRef.current < 400) return
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="5代血統表を見る"
        className="cursor-pointer font-bold text-inherit hover:text-primary-600 hover:underline"
      >
        {displayName}
      </button>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
                <Dialog.Panel className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
                    <div>
                      <Dialog.Title className="text-base font-semibold text-stone-900">
                        {displayName}
                      </Dialog.Title>
                      <p className="text-xs text-stone-500">5代血統表</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-md p-1 text-stone-400 hover:text-stone-600"
                    >
                      <span className="sr-only">閉じる</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    {loading && <p className="px-2 py-6 text-sm text-stone-500">血統表を組み立ててるよ…</p>}
                    {error && <p className="px-2 py-6 text-sm text-red-600">{error}</p>}
                    {data && <FiveGenPedigreeTable ancestryByPath={data.ancestryByPath} />}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
