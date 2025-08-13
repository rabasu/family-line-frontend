import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const STARDUST: Horse = {
  name: 'スターダスト',
  id: 'stardust',
  foaled: new Foaled('1927'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '（田中元彦？）→ベルエーヤ牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002385',
  children: [],
}

export default STARDUST
