import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const QUEEN: Horse = {
  name: 'クイーン',
  id: 'queen',
  foaled: new Foaled('1920'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '村下代吉→島田福栄？',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a00238f',
  children: [],
}

export default QUEEN
