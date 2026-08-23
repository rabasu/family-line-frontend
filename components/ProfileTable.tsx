import { sex } from '@/types/Horse'
import { findHorseById } from 'app/lib/traditional-family-loader'

const ProfileTable = ({ horseId }: { horseId: string }) => {
  const found = findHorseById(horseId)

  if (!found) {
    return (
      <div className="w-2/5 overflow-x-auto">
        <p className="text-red-500">エラー: 馬が見つかりませんでした</p>
      </div>
    )
  }

  const horse = found.horse

  // 存在する属性のみを表に出力するための行データ
  const rows: Array<{ label: string; value: string }> = []

  if (horse.name) {
    rows.push({ label: '馬名', value: horse.name })
  }
  if (horse.pedigreeName) {
    rows.push({ label: '血統名', value: horse.pedigreeName })
  }
  if (horse.englishName) {
    rows.push({ label: '欧字表記', value: horse.englishName })
  }
  // 性別は必須なので常に表示
  rows.push({ label: '性別', value: sex[horse.sex] })
  if (horse.familyNumber) {
    rows.push({ label: 'ファミリーナンバー', value: horse.familyNumber })
  }
  if (horse.foaled?.year) {
    rows.push({ label: '生誕', value: horse.foaled.year.toString() })
  }
  if (horse.foaledAt) {
    rows.push({ label: '生産国', value: horse.foaledAt })
  }
  if (horse.importedYear) {
    rows.push({ label: '輸入', value: horse.importedYear })
  }
  if (horse.owner) {
    rows.push({ label: '主な所有者', value: horse.owner })
  }

  return (
    <div className="w-2/5 overflow-x-auto">
      <table className="table-fixed">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ProfileTable
