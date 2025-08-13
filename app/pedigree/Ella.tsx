import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const ELLA: Horse = {
  name: 'エラ',
  id: 'ella',
  foaled: new Foaled('1901'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '奥羽種馬牧場',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a018455',
  children: [],
}

export default ELLA
