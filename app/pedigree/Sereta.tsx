import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const SERETA: Horse = {
  name: 'セレタ',
  id: 'sereta',
  foaled: new Foaled('1923'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '羽田牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024aa',
  children: [],
}

export default SERETA
