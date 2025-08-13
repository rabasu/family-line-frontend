import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const BUXOM: Horse = {
  name: 'バツクソム',
  id: 'buxom',
  foaled: new Foaled('1919'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '東北牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023b8',
  children: [],
}

export default BUXOM
