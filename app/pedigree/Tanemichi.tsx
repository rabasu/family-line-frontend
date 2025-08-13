import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const TANEMICHI: Horse = {
  name: '種道',
  id: 'tanemichi',
  foaled: new Foaled('1922'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a018fe9',
  children: [],
}

export default TANEMICHI
