import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const HOSHIHATA: Horse = {
  name: '星旗',
  id: 'hoshihata',
  foaled: new Foaled('1924'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002454',
  children: [],
}

export default HOSHIHATA
