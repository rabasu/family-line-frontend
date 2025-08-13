import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const LADY_ALLON: Horse = {
  name: 'レデイアロン',
  id: 'lady_allon',
  foaled: new Foaled('1929'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '大平牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002414',
  children: [],
}

export default LADY_ALLON
