import type { AggregatedRaceStats } from '@/types/AggregatedRaceStats'
import type { PrizeMoney } from '@/types/PrizeMoney'
import { formatPrizeMoneyDetailed, formatRaceStatsDetailed } from '@/lib/race-summary'

interface RaceCareerSummaryProps {
  raceStats?: AggregatedRaceStats
  prizeMoney?: PrizeMoney
}

const RaceCareerSummary = ({ raceStats, prizeMoney }: RaceCareerSummaryProps) => {
  const stats = formatRaceStatsDetailed(raceStats)
  const prize = formatPrizeMoneyDetailed(prizeMoney)
  if (!stats && !prize) return null

  const rows: Array<{ label: string; value: string }> = []
  if (stats) rows.push({ label: '通算成績', value: stats })
  if (prize) rows.push({ label: '獲得賞金', value: prize })

  return (
    <table className="info-table mb-6">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th className="w-36 bg-label px-3 py-1.5 text-left font-medium whitespace-nowrap text-label">
              {row.label}
            </th>
            <td className="px-3 py-1.5">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default RaceCareerSummary
