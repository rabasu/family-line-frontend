import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const FINOLA: Horse = {
  name: 'フイノラ',
  id: 'finola',
  foaled: new Foaled('1926'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '社台牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023fb',
  children: [],
}

export default FINOLA
