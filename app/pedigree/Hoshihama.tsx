import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const HOSHIHAMA: Horse = {
  name: '星浜',
  id: 'hoshihama',
  foaled: new Foaled('1929'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024af',
  children: [],
}

export default HOSHIHAMA
