import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const FAIR_PEGGY: Horse = {
  name: 'フエアペギー',
  id: 'fair_peggy',
  foaled: new Foaled('1902'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '小岩井農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002368',
  children: [],
}

export default FAIR_PEGGY
