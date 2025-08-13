import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const FIRST_STOP: Horse = {
  name: 'フアーストストツプ',
  id: 'first_stop',
  foaled: new Foaled('1925'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '千明賢治',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023c9',
  children: [],
}

export default FIRST_STOP
