import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const DIANA: Horse = {
  name: 'ダイアナ',
  id: 'diana',
  foaled: new Foaled('1919'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '菅井農場（S5）遠山村・中谷博治（S6〜10）→中川要次郎/米田弥平管理（S11〜14）→武岡敏夫（S15〜）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024ca',
  children: [],
}

export default DIANA
