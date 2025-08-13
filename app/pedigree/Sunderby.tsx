import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const SUNDERBY: Horse = {
  name: 'サンダービー',
  id: 'sunderby',
  foaled: new Foaled('1922'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '羽田牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024b9',
  children: [],
}

export default SUNDERBY
