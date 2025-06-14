import RaceResult from './RaceResult'
import { Award } from './Award'
import { Foaled } from './Foaled'
import { AggregatedRaceStats } from './AggregatedRaceStats'
import { PrizeMoney } from './PrizeMoney'
import { ReceivedAward } from './ReceivedAward'
import { Breed } from './Breed'
// 現役中に去勢した場合のみセン
// const Sex = {
//   MALE: '牡',
//   FEMALE: '牝',
//   GELDING: 'セン',
// } as const;

// export type Sex = typeof Sex[keyof typeof Sex];
// // 全てのtypeを配列として取得
// export const AllSex = Object.values(Sex);

export type Sex = 'male' | 'female' | 'gelding'

export const sex: { [key in Sex]: string } = {
  male: '牡',
  female: '牝',
  gelding: 'セン',
}

interface Horse {
  name?: string // 競走名 競走出走のない馬は血統名
  pedigreeName?: string // 血統名
  formerName?: string // 改名前の競走名など
  localName?: string // 地方転出後の馬名
  formerPedigreeName?: string // 出生時の血統名など（繁殖入り時に使われなかったもの）
  linkName?: string // 競走名が重複する場合に使用 一意の名前を設定する
  linkPedigreeName?: string // 血統名が重複する場合に使用 一意の名前を設定する
  id: string
  foaled: Foaled // 生年月日
  sex: Sex // 性別
  breed?: Breed // 品種
  breeder?: string // 生産者
  sire: string // 父
  dam: string // 母
  children?: Horse[] // 産駒
  link?: string // リンク 使うかは微妙
  color?: string // 毛色
  hasArticle?: boolean
  summary?: string // 見出し
  details?: JSX.Element | string // 詳細記事
  raceStats?: AggregatedRaceStats // 競走成績
  prizeMoney?: PrizeMoney // 賞金
  awards?: ReceivedAward[] // 受賞
  raceResults?: RaceResult[] // 重賞成績
  citation?: string[] // 参考文献
  // 以下は後々追加 一旦は不要
  retired?: string // 抹消日
  died?: string // 死亡日
  foaledAt?: string // 生産地
  owner?: string // 馬主
  trainer?: string // 調教師
  jockey?: string // 騎手
}

export type { Horse }
