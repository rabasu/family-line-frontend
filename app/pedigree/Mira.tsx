import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const MIRA: Horse = {
  name: 'ミラ',
  id: 'mira',
  foaled: new Foaled('1894'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '東京レース倶楽部→新冠御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a00241c',
  children: [],
}

export default MIRA
