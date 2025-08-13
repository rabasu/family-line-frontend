import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const NINEVE: Horse = {
  name: 'ニネーブ',
  id: 'nineve',
  foaled: new Foaled('1906'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '奥羽種馬牧場',
  sire: '',
  dam: '',
  color: '',
  children: [],
}

export default NINEVE
