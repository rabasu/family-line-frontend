import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const BONNY_NANCY: Horse = {
  name: 'ボニーナンシー',
  id: 'bonny_nancy',
  foaled: new Foaled('1903'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '小岩井農場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a018367',
  children: [],
}

export default BONNY_NANCY
