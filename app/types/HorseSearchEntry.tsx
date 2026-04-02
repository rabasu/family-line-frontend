import { Sex } from '@/types/Horse'
import { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import { PrizeMoney } from '@/types/PrizeMoney'
import { GradeCode } from '@/types/Grade'

export interface RaceResultJSON {
  race: string
  displayRace: string
  date: string | { year: number; month: number; day: number }
  grade: GradeCode
  racecourse?: string
  distance?: string
  entry?: string
  favorite?: string
  result: string
}

export interface HorseSearchEntry {
  id: string
  family: string
  familyName: string
  foaled: { year?: number; month?: number; day?: number }
  sex: Sex
  sire?: string
  dam?: string
  name?: string
  pedigreeName?: string
  formerName?: string
  localName?: string
  formerPedigreeName?: string
  linkName?: string
  linkPedigreeName?: string
  englishName?: string
  /** 馬名の読み（カタカナ）。ソートキーとして使用 */
  furigana?: string
  raceStats?: AggregatedRaceStats
  prizeMoney?: PrizeMoney
  hasGradePlaced: boolean
  hasGradeWin: boolean
  hasG1Win: boolean
  topRaceResults: RaceResultJSON[]
}
