import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Comments from '@/components/Comments'
import FamilyTreeView from '@/components/FamilyTreeView'
import FiveGenPedigreeTable, { hasKnownAncestor } from '@/components/FiveGenPedigreeTable'
import HorseFamilyTree from '@/components/HorseFamilyTree'
import HorseLink from '@/components/HorseLink'
import HorseMarkdown from '@/components/HorseMarkdown'
import RaceCareerSummary from '@/components/RaceCareerSummary'
import RaceResultsTable from '@/components/RaceResultsTable'
import StallionOffspringCard from '@/components/StallionOffspringCard'
import StallionProgeny from '@/components/StallionProgeny'
import siteMetadata from '@/data/siteMetadata'
import type { Horse } from '@/types/Horse'
import { sex as sexLabel } from '@/types/Horse'
import { buildFiveGenPedigree } from '@/lib/five-gen-pedigree'
import { loadFamilyArticle } from '@/lib/family-article'
import { loadHorseArticle } from '@/lib/horse-article'
import { horseHref, isReservedRootSlug } from '@/lib/horse-id'
import { hasGradeWin, hasRaceCareerInfo } from '@/lib/race-summary'
import { damLineOf, findHorseById, findOffspringBySireId, getHorsePageIndex } from '@/lib/traditional-family-loader'
import { formatSireDisplayName } from '@/lib/origin-country-index'

// 静的エクスポートでは generateStaticParams が返した id 以外は 404 にする
export const dynamicParams = false

export const generateStaticParams = async () => {
  const index = getHorsePageIndex()
  // 情報の薄い馬にもページは用意する（robots で index/noindex を出し分ける）。
  // 牝系ごとにまとめて生成すると、牝系JSONのキャッシュがページ間で効く。
  return Object.entries(index.horses)
    .filter(([id]) => !isReservedRootSlug(id))
    .sort(([, a], [, b]) => a.family.localeCompare(b.family))
    .map(([id]) => ({ id }))
}

function displayNameOf(horse: Horse): string {
  return horse.name || horse.pedigreeName || horse.id
}

/** Foaled は年のみなら文字列、月日まで判れば Date を保持している */
function formatFoaled(horse: Horse): string | null {
  const raw = horse.foaled?.value
  if (!raw) return null
  if (raw instanceof Date) {
    return `${raw.getFullYear()}年${raw.getMonth() + 1}月${raw.getDate()}日`
  }
  return /^\d{4}$/.test(raw) ? `${raw}年` : raw
}

function foaledYear(horse: Horse): string | null {
  const year = horse.foaled?.year
  return year && /^\d{4}$/.test(year) ? year : null
}

/** 「1985年生 牝 鹿毛」のような一行サマリ */
function subtitleOf(horse: Horse): string {
  const parts: string[] = []
  const year = foaledYear(horse)
  if (year) parts.push(`${year}年生`)
  parts.push(sexLabel[horse.sex])
  if (horse.color) parts.push(horse.color)
  return parts.join(' ')
}

function commentaryFor(horseId: string, isRoot: boolean) {
  const horseArticle = loadHorseArticle(horseId)
  if (horseArticle) return horseArticle
  if (!isRoot) return null
  const familyArticle = loadFamilyArticle(horseId)
  if (!familyArticle?.markdown) return null
  return {
    summary: familyArticle.summary,
    markdown: familyArticle.markdown,
    draft: familyArticle.draft,
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const found = findHorseById(params.id)
  if (!found) return {}

  const { horse, family, entry } = found
  const isRoot = horse.id === family.rootHorseId
  const name = displayNameOf(horse)
  const familyArticle = isRoot ? loadFamilyArticle(horse.id) : null
  const article = commentaryFor(horse.id, isRoot)
  const title = isRoot ? familyArticle?.title || `${family.pedigreeName}系` : name
  const description =
    article?.summary ||
    horse.summary ||
    familyArticle?.summary ||
    `${name}（${subtitleOf(horse)}）の血統・戦績・産駒。${family.pedigreeName}系。父${horse.sire || '不詳'}、母${horse.dam || '不詳'}。`
  const url = `${siteMetadata.siteUrl}${horseHref(params.id)}`

  return {
    title,
    description,
    // 情報の薄い馬はクロールバジェットを食うだけなので索引から外し、リンクだけ辿らせる。
    // index 側はルートレイアウトの robots 設定を継がせたいのでキー自体を置かない。
    ...(entry.tier === 'noindex' ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      siteName: siteMetadata.title,
      locale: 'ja_JP',
      type: 'article',
      url,
      images: [siteMetadata.socialBanner],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [siteMetadata.socialBanner],
    },
  }
}

function ProfileRows({
  horse,
  familyName,
  familyRootId,
}: {
  horse: Horse
  familyName: string
  familyRootId: string
}) {
  const rows: Array<{ label: string; value: ReactNode }> = []
  const nameLabel = horse.pedigreeName ? '競走名' : '馬名'

  if (horse.name) rows.push({ label: nameLabel, value: horse.name })
  if (horse.localName) rows.push({ label: `${nameLabel}（地方）`, value: horse.localName })
  if (horse.formerName) rows.push({ label: `${nameLabel}（旧）`, value: horse.formerName })
  if (horse.pedigreeName && horse.pedigreeName !== horse.name) {
    rows.push({ label: '血統名', value: horse.pedigreeName })
  }
  if (horse.formerPedigreeName) rows.push({ label: '血統名（旧）', value: horse.formerPedigreeName })
  if (horse.englishName) rows.push({ label: '欧字表記', value: horse.englishName })
  rows.push({ label: '性別', value: sexLabel[horse.sex] })
  if (horse.color) rows.push({ label: '毛色', value: horse.color })
  const foaled = formatFoaled(horse)
  if (foaled) rows.push({ label: '生年月日', value: foaled })
  if (horse.sire) {
    rows.push({
      label: '父',
      value: (
        <HorseLink
          name={horse.sire}
          horseId={horse.sireId}
          displayName={formatSireDisplayName(horse.sire, horse.sireId)}
        />
      ),
    })
  }
  if (horse.dam) rows.push({ label: '母', value: <HorseLink name={horse.dam} /> })
  if (horse.breeder) rows.push({ label: '生産者', value: horse.breeder })
  if (horse.foaledAt) rows.push({ label: '生産地', value: horse.foaledAt })
  if (horse.importedYear) rows.push({ label: '輸入年', value: horse.importedYear })
  if (horse.importedBy) rows.push({ label: '輸入者', value: horse.importedBy })
  if (horse.owner) rows.push({ label: '馬主', value: horse.owner })
  if (horse.trainer) rows.push({ label: '調教師', value: horse.trainer })
  if (horse.familyNumber) rows.push({ label: 'ファミリーナンバー', value: horse.familyNumber })
  if (horse.registration) rows.push({ label: '登録番号', value: horse.registration })
  rows.push({
    label: '牝系',
    value:
      horse.id === familyRootId ? (
        familyName
      ) : (
        <Link href={horseHref(familyRootId)} className="text-sky-700 hover:underline">
          {familyName}
        </Link>
      ),
  })

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-stone-200">
            <th className="w-36 bg-stone-50 px-3 py-1.5 text-left font-medium whitespace-nowrap text-stone-600">
              {row.label}
            </th>
            <td className="px-3 py-1.5">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function HorseRef({ horse, currentId }: { horse: Horse; currentId: string }) {
  const label = displayNameOf(horse)
  const born = foaledYear(horse)
  const year = born ? `（${born}）` : ''
  if (horse.id === currentId) {
    return (
      <span className="font-bold text-stone-900">
        {label}
        {year}
      </span>
    )
  }
  return (
    <Link href={horseHref(horse.id)} className="text-sky-700 hover:underline">
      {label}
      {year}
    </Link>
  )
}

/** 直接の産駒だけ残し、孫以降の枝を切る（元オブジェクトは改変しない） */
function withDirectOffspringOnly(root: Horse): Horse {
  return {
    ...root,
    children: (root.children || []).map((child) => ({
      ...child,
      children: [],
    })),
  }
}

export default async function Page({ params }: { params: { id: string } }) {
  const found = findHorseById(params.id)
  if (!found) return notFound()

  const { horse, family, entry } = found
  const isRoot = horse.id === family.rootHorseId
  const name = displayNameOf(horse)
  const familyArticle = isRoot ? loadFamilyArticle(horse.id) : null
  const familyTitle = familyArticle?.title || `${family.pedigreeName}系`
  const damLine = damLineOf(family, horse.id)
  const offspring = horse.children || []
  const sireOffspring = horse.sex === 'male' ? findOffspringBySireId(horse.id) : []
  const gradeWinnerCount = sireOffspring.filter((item) => hasGradeWin(item.horse.raceResults)).length
  const pedigree = await buildFiveGenPedigree(horse.id)
  const article = commentaryFor(horse.id, isRoot)
  const details = typeof horse.details === 'string' ? horse.details.trim() : ''
  const pageUrl = `${siteMetadata.siteUrl}${horseHref(horse.id)}`
  const summary = article?.summary || horse.summary || familyArticle?.summary
  const description =
    summary || `${name}（${subtitleOf(horse)}）の血統・戦績・産駒。${family.pedigreeName}系。`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: isRoot ? familyTitle : name,
    description,
    url: pageUrl,
    image: siteMetadata.socialBanner,
  }

  return (
    // data-horse-detail はモーダルが本文だけを抜き出すための目印。
    // 静的エクスポートでは API が使えないため、モーダルはこのページの HTML を取得して描画する。
    <div className="min-w-0 divide-y divide-stone-200" data-horse-detail={horse.id}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="space-y-2 pt-6 pb-6">
        <nav className="text-sm text-stone-500">
          <Link href="/" className="hover:underline">
            牝系一覧
          </Link>
          <span className="mx-1.5">/</span>
          {isRoot ? (
            <span>{family.pedigreeName}</span>
          ) : (
            <Link href={horseHref(family.rootHorseId)} className="hover:underline">
              {family.pedigreeName}
            </Link>
          )}
        </nav>
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          {name}
        </h1>
        <p className="text-stone-500">{subtitleOf(horse)}</p>
        {isRoot && <p className="text-stone-500">{familyTitle}</p>}
        {summary && <p className="text-stone-500">{summary}</p>}
      </header>

      <section className="py-6">
        <h2 className="mb-3 text-xl font-bold text-stone-900">基本情報</h2>
        <ProfileRows horse={horse} familyName={family.pedigreeName} familyRootId={family.rootHorseId} />
      </section>

      {pedigree && hasKnownAncestor(pedigree.ancestryByPath) && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900">5代血統表</h2>
          <FiveGenPedigreeTable ancestryByPath={pedigree.ancestryByPath} />
        </section>
      )}

      {hasRaceCareerInfo(horse.raceStats, horse.prizeMoney, horse.raceResults?.length ?? 0) && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900">競走成績</h2>
          <RaceCareerSummary raceStats={horse.raceStats} prizeMoney={horse.prizeMoney} />
          {horse.raceResults && horse.raceResults.length > 0 && (
            <>
              <h3 className="mb-3 text-lg font-bold text-stone-900">重賞戦績</h3>
              <RaceResultsTable results={horse.raceResults} />
            </>
          )}
        </section>
      )}

      {(details || article) && (
        // data-horse-modal-clip: モーダルでは冒頭だけ残して「続きを読む」へ誘導する
        <section id="article" className="prose dark:prose-invert max-w-none py-6" data-horse-modal-clip>
          <h2 className="text-xl font-bold text-stone-900">解説</h2>
          {article ? (
            <HorseMarkdown markdown={article.markdown} />
          ) : (
            details && <HorseMarkdown markdown={details} />
          )}
        </section>
      )}

      {damLine.length > 1 && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900">牝系内の位置</h2>
          <ol className="space-y-1 text-sm">
            {damLine.map((ancestor, depth) => (
              <li key={ancestor.id} style={{ paddingLeft: `${depth * 1.25}rem` }}>
                <span className="mr-1.5 text-stone-400">{depth === 0 ? '牝祖' : `${depth}代下`}</span>
                <HorseRef horse={ancestor} currentId={horse.id} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {sireOffspring.length > 0 && (
        // data-horse-modal-tease: モーダルでは一覧本体を落とし、個別ページへ誘導する
        <section
          id="sire-record"
          className="py-6"
          data-horse-modal-tease
          data-tease-title="主な種牡馬成績"
          data-tease-summary={`重賞勝ち馬 ${gradeWinnerCount}頭 / 登録産駒 ${sireOffspring.length}頭`}
          data-tease-href={`#sire-record`}
        >
          <StallionProgeny gradeWinnerCount={gradeWinnerCount} totalCount={sireOffspring.length}>
            {sireOffspring.map((item) => (
              <StallionOffspringCard
                key={item.horse.id}
                horse={item.horse}
                familyName={item.familyName}
                familyRootId={item.familyRootId}
              />
            ))}
          </StallionProgeny>
        </section>
      )}

      {offspring.length > 0 && (
        <section
          id="family-tree"
          className="min-w-0 py-6"
          data-horse-modal-tease
          data-tease-title="牝系図"
          data-tease-summary="産駒・子孫の系統図"
          data-tease-href="#family-tree"
        >
          <HorseFamilyTree
            fullTree={<FamilyTreeView horse={horse} />}
            directTree={<FamilyTreeView horse={withDirectOffspringOnly(horse)} />}
          />
        </section>
      )}

      {horse.citation && horse.citation.length > 0 && (
        <section className="py-6">
          <h2 className="mb-3 text-xl font-bold text-stone-900">参考文献</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-stone-600">
            {horse.citation.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>
      )}

      {/* モーダルは本文を生 HTML として差し込むだけなので、この節は取り除かれる。
          薄いページまでスレッドを量産しないよう、index 対象の馬だけ置く。 */}
      {entry.tier === 'index' && siteMetadata.comments?.provider && (
        <section className="py-6" data-horse-comments>
          <Comments slug={horse.id} />
        </section>
      )}
    </div>
  )
}
