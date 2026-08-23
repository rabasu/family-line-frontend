import { NextRequest, NextResponse } from 'next/server'
import { buildFiveGenPedigree } from '@/lib/five-gen-pedigree'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id') || ''
    if (!id.trim()) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
    }
    const result = await buildFiveGenPedigree(id)
    if (!result) {
      return NextResponse.json({ error: '馬が見つかりません' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
