import { RaceStats } from '@/types/RaceStats'

type RaceCategoryStats = {
  flat: RaceStats // 平地競走
  jump: RaceStats // 障害競走
}

export type { RaceCategoryStats }
