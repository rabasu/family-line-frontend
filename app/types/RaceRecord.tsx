import { Grade, GradeCode } from './Grade';

// 増やしすぎると情報量不足の際に困る
// 細かいデータは各馬のページで補完・調整すればよいので、あくまでざっくりレベル
interface RaceRecord {
  race: string, // レース名
  date: Date, // 日付
  grade: GradeCode, // 重賞格付け
  racecourse?: string, //競馬場
  distance?: string, // 距離(m)
  entry?: string, // 頭数
  result: number, // 順位
}

export default RaceRecord

function Records({ ...rest }: RaceRecord) {
  const record: RaceRecord = { ...rest }
  return record
}


