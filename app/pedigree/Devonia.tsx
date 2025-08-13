import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const DEVONIA: Horse = {
  name: 'デヴオーニア',
  id: 'devonia',
  foaled: new Foaled('1925'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '社台牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a00233b',
  children: [],
}

export default DEVONIA
