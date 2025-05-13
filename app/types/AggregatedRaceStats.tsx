import { RaceCategoryStats } from './RaceCategoryStats'
import { RaceStats } from './RaceStats'

type AggregatedRaceStats = {
  total: RaceStats // 通算成績
  divisions: {
    type: 'central' | 'local' // 中央 or 地方
    stats: RaceCategoryStats
  }[]
}

export type { AggregatedRaceStats }
