import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const LEPIDA: Horse = {
  name: 'レピダ',
  id: 'lepida',
  foaled: new Foaled('1904'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '奥羽種馬牧場→下総御料牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002357',
  children: [],
}

export default LEPIDA
