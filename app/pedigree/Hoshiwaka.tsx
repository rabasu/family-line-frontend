import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const HOSHIWAKA: Horse = {
  name: '星若',
  id: 'hoshiwaka',
  foaled: new Foaled('1924'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a00249d',
  children: [],
}

export default HOSHIWAKA
