import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const ASTERIA: Horse = {
  name: 'アステリヤ',
  id: 'asteria',
  foaled: new Foaled('1926'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '土田農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002576',
  children: [],
}

export default ASTERIA
