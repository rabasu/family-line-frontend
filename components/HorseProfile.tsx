import HorseList from "@/pedigree/HorseList";
import { HorseData } from "@/types/HorseData";

const HorseProfile = ({ name }) => {
  const data: HorseData = HorseList[name];
  const horse = data.horse;
  return (
    <div className="w-2/5 overflow-x-auto">
      <table className="table-fixed">
        <tbody>
          <tr>
            <th>馬名</th>
            <td>{horse.name}</td>
          </tr>
          {horse.pedigree_name && (
            <tr>
              <th>血統名</th>
              <td>{horse.pedigree_name}</td>
            </tr>
          )}
          <tr>
            <th>性別</th>
            <td>{horse.sex}</td>
          </tr>
          <tr>
            <th>生誕</th>
            <td>{horse.foaled}</td>
          </tr>
          <tr>
            <th>生産国</th>
            <td>{country}</td>
          </tr>
          <tr>
            <th>輸入</th>
            <td>{imported}</td>
          </tr>
          <tr>
            <th>主な所有者</th>
            <td>{owner}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default HorseProfile
