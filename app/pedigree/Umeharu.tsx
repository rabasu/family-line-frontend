import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'

const UMEHARU: Horse = {
  name: 'ウメハル',
  id: 'umeharu',
  foaled: new Foaled('1918'),
  sex: 'female',
  breed: 'サラブレッド種',
  breeder: '',
  owner: '東京競馬倶楽部輸入→黒澤文助→柳本理平',
  sire: '',
  dam: '',
  color: '',
  netkeibaId: '000a002386',
  children: [],
}

export default UMEHARU
