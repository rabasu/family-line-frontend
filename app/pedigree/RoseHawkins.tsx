import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const ROSE_HAWKINS: Horse = {
  name: 'ローズホーキンス',
  id: 'rose_hawkins',
  foaled: new Foaled('1922'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '古立直吉→函館・前川牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023a8',
  children: [],
}

export default ROSE_HAWKINS
