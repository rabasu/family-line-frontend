import RaceResult from '@/types/RaceResult'
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

/** 血統パス（s=父, d=母。例: ss=父父, sdds=父父母父） */
export type PedigreePath = string

/** 非在来種牡馬などの祖先埋め込みノード（独立馬レコードにはしない） */
export type PedigreePathNode = {
  name: string
  /** 在来牝系の独立馬レコードから合成したときだけ付く */
  id?: string
  foaled?: { year?: number; month?: number; day?: number }
  color?: string
  sex?: Sex
  breed?: Breed
  netkeibaId?: string
}

interface Horse {
  name?: string // 競走名 競走出走のない馬は血統名
  pedigreeName?: string // 血統名 書籍資料等から取得する
  formerName?: string // 改名前の競走名など
  localName?: string // 地方転出後の馬名
  formerPedigreeName?: string // 出生時の血統名など（繁殖入り時に使われなかったもの）
  linkName?: string // 競走名が重複する場合、馬名({生年YYYY})の形式で一意の値を設定する
  linkPedigreeName?: string // 血統名が重複する場合、血統名({生年YYYY})の形式で一意の値を設定する
  englishName?: string // 英語名
  /** 馬名の読み（カタカナ）。漢字馬名のソート・検索用。在来牝系データでは id のローマ字表記から付与する */
  furigana?: string
  id: string
  foaled: Foaled // 生年月日
  sex: Sex // 性別
  breed?: Breed // 品種
  breeder?: string // 生産者
  sire: string // 父
  dam: string // 母
  /** 父馬の内部 id（在来 JSON または pedigree-sires の subject）。牝祖は持たない */
  sireId?: string
  /** 父馬の netkeibaId。牝祖は持たない（ancestryByPath でカバー） */
  sireNetkeibaId?: string
  /** 母馬の netkeibaId */
  damNetkeibaId?: string
  /**
   * 祖先をパスキーで埋め込んだ辞書（主に非在来種牡馬の4代分）。
   * 例: ancestryByPath['sdds'] = 父父母父
   */
  ancestryByPath?: Partial<Record<PedigreePath, PedigreePathNode>>
  children?: Horse[] // 産駒
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
  netkeibaId?: string // Netkeiba ID
  ahonooraId?: string // Ahonoora(優駿達の蹄跡)ID
  jbisId?: string // JBIS ID
  bogusId?: string // Bogus(血統表検索) 旧サイト ID（p.bogus.jp）
  newBogusId?: string // Bogus(血統表検索) 新サイト ID（pedigree.bogus.jp）
  /** Pedigree Query (pedigreequery.com) の馬ID（URLパス） */
  pedigreeQueryId?: string
  /** All Breed Pedigree (allbreedpedigree.com) の馬ID（URLパス） */
  allBreedPedigreeId?: string
  source?: string // 出典・情報源
  // 牝祖用
  importedYear?: string // 輸入年
  importedBy?: string // 輸入者
  familyNumber?: string // 系統番号
  registration?: string // 馬匹血統登録書における登録番号
  comment?: string // コメント（注記・補足）。JSONキーは comment（旧 comments は loader で吸収）
}

export type { Horse }
