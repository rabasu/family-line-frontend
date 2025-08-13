import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const QUICK_LUNCH: Horse = {
  name: 'クヰツクランチ',
  id: 'quick_lunch',
  foaled: new Foaled('1922'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: 'アラブ牧場（S5〜6）→黄金育成牧場（S7〜9）→社台牧場（S10〜）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024bf',
  children: [],
}

export default QUICK_LUNCH
