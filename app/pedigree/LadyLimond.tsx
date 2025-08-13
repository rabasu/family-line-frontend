import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const LADY_LIMOND: Horse = {
  name: 'レデイライモンド',
  id: 'lady_limond',
  foaled: new Foaled('1922'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '那須野牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023a3',
  children: [],
}

export default LADY_LIMOND
