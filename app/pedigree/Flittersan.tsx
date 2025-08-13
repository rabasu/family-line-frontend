import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const FLITTERSAN: Horse = {
  name: 'フリツターサン',
  id: 'flittersan',
  foaled: new Foaled('1923'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: 'アラブ牧場→黄金育成牧場→ベルエーヤ牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a00235c',
  children: [],
}

export default FLITTERSAN
