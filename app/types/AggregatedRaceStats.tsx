import { RaceCategoryStats } from '@/types/RaceCategoryStats'
import { RaceStats } from '@/types/RaceStats'

type AggregatedRaceStats = {
  total: RaceStats // 通算成績
  divisions: {
    type: 'central' | 'local' | 'abroad' // 中央 or 地方 or 海外
    stats: RaceCategoryStats
  }[]
}

export type { AggregatedRaceStats }
