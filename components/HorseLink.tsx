import HorseNameWithPedigree from './HorseNameWithPedigree'
import { findHorseLinkByName, getHorsePageIndex } from 'app/lib/traditional-family-loader'

interface LinkProps {
  name: string
  /** 在来牝系の馬 id。horse-page-index にあれば名前引きより優先 */
  horseId?: string
  /** 表示名。省略時はマップの name（従来どおり） */
  displayName?: string
  /** 同名馬の linkName（馬名(YYYY)）を試す */
  year?: number
  /** 見つからないときの開発警告を出さない */
  quiet?: boolean
}

/**
 * ビルド時に馬名を id へ解決し、HorseNameWithPedigree を出す。
 * 公開後は名前地図を引かない。解決できない馬名はリンクにしない。
 */
const HorseLink = ({ name, horseId, displayName, year, quiet }: LinkProps) => {
  const publishedId = horseId && getHorsePageIndex().horses[horseId] ? horseId : undefined
  const result = publishedId ? { link: publishedId, name } : findHorseLinkByName(name, { quiet, year })
  const label = displayName ?? result?.name ?? name

  if (!result) {
    return <span className="font-medium">{label}</span>
  }

  return <HorseNameWithPedigree horseId={result.link} displayName={label} tone="inline" />
}

export default HorseLink
