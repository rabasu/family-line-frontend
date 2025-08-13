import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const SHIUICHI: Horse = {
  name: 'シウイチ',
  id: 'shiuichi',
  foaled: new Foaled('1919'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '飯原農場→浜口伊平',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a01d8d6',
  children: [],
}

export default SHIUICHI
