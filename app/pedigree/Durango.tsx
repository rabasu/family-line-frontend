import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const DURANGO: Horse = {
  name: 'デユランゴ',
  id: 'durango',
  foaled: new Foaled('1928'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '山内亮（S8〜S11）→S.アイザックス（中倉保）（S12〜）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a000509',
  children: [],
}

export default DURANGO
