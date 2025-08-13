import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const PAPOOSE: Horse = {
  name: 'パプース',
  id: 'papoose',
  foaled: new Foaled('1928'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '小岩井農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002369',
  children: [],
}

export default PAPOOSE
