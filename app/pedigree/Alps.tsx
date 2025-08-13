import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const ALPS: Horse = {
  name: 'アルプス',
  id: 'alps',
  foaled: new Foaled('1919'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '東京競馬倶楽部輸入→高橋勝造',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a0023b2',
  children: [],
}

export default ALPS
