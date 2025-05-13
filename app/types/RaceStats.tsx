type RaceStats = {
  runs?: number // 出走数
  wins?: number // 勝利数
}

export type { RaceStats }

function RaceStats({ ...rest }: RaceStats) {
  const stats: RaceStats = { ...rest }
  return stats
}
