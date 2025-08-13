import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const RHINE: Horse = {
  name: 'ライン',
  id: 'rhine',
  foaled: new Foaled('1900'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '小岩井農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a018482',
  children: [],
}

export default RHINE
