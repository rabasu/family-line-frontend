import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const MERALBI: Horse = {
  name: 'マラルビ',
  id: 'meralbi',
  foaled: new Foaled('1921'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '本間牧場→本巣長平（→川上忠雄）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002406',
  children: [],
}

export default MERALBI
