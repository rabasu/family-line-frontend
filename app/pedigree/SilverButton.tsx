import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const SILVER_BUTTON: Horse = {
  name: 'シルバーバツトン',
  id: 'silver_button',
  foaled: new Foaled('1908'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '日高種馬牧場（→飯原農場）',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0024b3',
  children: [],
}

export default SILVER_BUTTON
