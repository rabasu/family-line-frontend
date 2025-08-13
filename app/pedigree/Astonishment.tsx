import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const ASTONISHMENT: Horse = {
  name: 'アストニシメント',
  id: 'astonishment',
  foaled: new Foaled('1902'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '小岩井農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002343',
  children: [],
}

export default ASTONISHMENT
