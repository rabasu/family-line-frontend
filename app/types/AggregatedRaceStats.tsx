import { RaceCategoryStats } from '@/types/RaceCategoryStats'
import { RaceStats } from '@/types/RaceStats'

type AggregatedRaceStats = {
  total: RaceStats // 通算成績
  divisions: {
    type: 'central' | 'local' | 'abroad' // 中央 or 地方 or 海外
    /** 中央・地方は平地/障害、海外は通算のみのことがある */
    stats: RaceCategoryStats | RaceStats
  }[]
}

export type { AggregatedRaceStats }
