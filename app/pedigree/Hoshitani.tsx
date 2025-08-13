import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const HOSHITANI: Horse = {
  name: '星谷',
  id: 'hoshitani',
  foaled: new Foaled('1925'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023a6',
  children: [],
}

export default HOSHITANI
