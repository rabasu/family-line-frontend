import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const OSHIMA: Horse = {
  name: 'オシマ',
  id: 'oshima',
  foaled: new Foaled('1919'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '本間牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023b0',
  children: [],
}

export default OSHIMA
