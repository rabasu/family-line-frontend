import { Grade, GradeCode } from './Grade'

// 増やしすぎると情報量不足の際に困る
// 細かいデータは各馬のページで補完・調整すればよいので、あくまでざっくりレベル
interface RaceResult {
  race: string // レース名
  displayRace: string // 表示用レース名
  date: Date // 日付
  grade: GradeCode // 重賞格付け
  racecourse?: string //競馬場
  distance?: string // 距離(m)
  entry?: string // 頭数
  result: string // 順位 stringへ移行途中
}

export default RaceResult

function Records({ ...rest }: RaceResult) {
  const record: RaceResult = { ...rest }
  return record
}
