import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const EMILE: Horse = {
  name: 'エミール',
  id: 'emile',
  foaled: new Foaled('1925'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: 'ユートピア牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024ae',
  children: [],
}

export default EMILE
