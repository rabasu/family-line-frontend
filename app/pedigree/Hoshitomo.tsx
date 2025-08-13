import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const HOSHITOMO: Horse = {
  name: '星友',
  id: 'hoshitomo',
  foaled: new Foaled('1923'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024a1',
  children: [],
}

export default HOSHITOMO
