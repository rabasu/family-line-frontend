import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const CANADIAN_GIRL: Horse = {
  name: 'カナデアンガール',
  id: 'canadian_girl',
  foaled: new Foaled('1923'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '千葉牧場→下河辺牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024b4',
  children: [],
}

export default CANADIAN_GIRL
