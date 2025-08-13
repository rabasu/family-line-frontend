import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const SCHOOL_BELL: Horse = {
  name: 'スクールベル',
  id: 'school_bell',
  foaled: new Foaled('1904'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: 'S.アイザックス（中倉保）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002364',
  children: [],
}

export default SCHOOL_BELL
