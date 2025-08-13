import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const LESLIE_CARTER: Horse = {
  name: 'レスリーカーター',
  id: 'leslie_carter',
  foaled: new Foaled('1900'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '奥羽種馬牧場→十勝種馬牧場→野村治三郎',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a01800b',
  children: [],
}

export default LESLIE_CARTER
