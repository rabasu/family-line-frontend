import { Horse } from '@/types/Horse'
import { loadPedigreeFromJson, convertJsonToHorse, PedigreeJsonData } from '../lib/pedigree-loader'

// JSON形式の牝系データを直接インポート
import SCARLET_INK_JSON from './ScarletInk.json'
import ROLL_YOUR_OWN_JSON from './RollYourOwn.json'

// 既存のTSXファイル（後方互換性のため）
// import ROLL_YOUR_OWN from './RollYourOwn'  // JSON形式に移行済み
import FLORRIES_CUP from './FlorriesCup'
import IRISH_EYES from './IrishEyes'
import ASTERIA from './Asteria'
import ASTONISHMENT from './Astonishment'
import ARIADE from './Ariade'
import ALPS from './Alps'
import ENTRESOL from './Entresol'
import WET_SAIL from './WetSail'
import UMEHARU from './Umeharu'
import ESTHER_DEE from './EstherDee'
import ENAMOURED from './Enamoured'
import EMILE from './Emile'
import ELLA from './Ella'
import OH_YEAH from './OhYeah'
import O_DEAREST from './ODearest'
import ORLINDA_2 from './Orlinda2'
import OSHIMA from './Oshima'
import CAJOLE from './Cajole'
import CANADIAN_GIRL from './CanadianGirl'
import COMFORTABLE from './Comfortable'
import KEENDRAGH from './Keendragh'
import QUEEN from './Queen'
import CLARA_MCGEARY from './ClaraMcgeary'
import CRAIGDARROCH from './Craigdarroch'
import CLONFERT from './Clonfert'
import QUICK_LUNCH from './QuickLunch'
import SUNDERBY from './Sunderby'
import SHIUICHI from './Shiuichi'
import JARDINIERE from './Jardiniere'
import SHRILLY from './Shrilly'
import SILVER_FORT from './SilverFort'
import SILVER_BUTTON from './SilverButton'
import SCHOOL_BELL from './SchoolBell'
import STARDUST from './Stardust'
import STEP_SISTER from './StepSister'
import STEPHANIA from './Stephania'
import THRILLING from './Thrilling'
import SEVIGNE from './Sevigne'
import SERETA from './Sereta'
import THONELLA from './Thonella'
import DIANA from './Diana'
import DICING from './Dicing'
import TYRANTS_QUEEN from './TyrantsQueen'
import TIP_TOP from './TipTop'
import CHATTERBOX from './Chatterbox'
import DEVONIA from './Devonia'
import DESMONDS_HOLIDAY from './DesmondsHoliday'
import DURANGO from './Durango'
import TRUE_SPEAR from './TrueSpear'
import NINEVE from './Nineve'
import BAVERSTOCK from './Baverstock'
import BUXOM from './Buxom'
import PAPOOSE from './Papoose'
import BANRI from './Banri'
import BIDDY_SCALIGER from './BiddyScaliger'
import BEAUTIFUL_DREAMER from './BeautifulDreamer'
import BILLERICAY_BELLE from './BillericayBelle'
import BELIEVE_SALLY from './BelieveSally'
import FIRST_STOP from './FirstStop'
import FASHION_MAID from './FashionMaid'
import FINOLA from './Finola'
import FAIR_PEGGY from './FairPeggy'
import FRIARS_MAIDEN from './FriarsMaiden'
import FRUSTRATE from './Frustrate'
import FRIGIDITY from './Frigidity'
import FLITTERSAN from './Flittersan'
import FLIPPANCY from './Flippancy'
import BLUETTE from './Bluette'
import PROPONTIS from './Propontis'
import HELEN_SURF from './HelenSurf'
import BONNY_NANCY from './BonnyNancy'
import MERALBI from './Meralbi'
import MIRA from './Mira'
import MINTENZA from './Mintenza'
import RHINE from './Rhine'
import LA_GRACIA from './LaGracia'
import LESLIE_CARTER from './LeslieCarter'
import LADY_ALLON from './LadyAllon'
import LADY_LIMOND from './LadyLimond'
import LEPIDA from './Lepida'
import ROSE_HAWKINS from './RoseHawkins'
import TANEMASA from './Tanemasa'
import TANEMICHI from './Tanemichi'
import HOSHITANI from './Hoshitani'
import HOSHITOMI from './Hoshitomi'
import HOSHITOMO from './Hoshitomo'
import HOSHIHATA from './Hoshihata'
import HOSHIHAMA from './Hoshihama'
import HOSHIWAKA from './Hoshiwaka'

// 新しいJSONファイル（動的インポート）
let SCARLET_INK: Horse | null = null
let ROLL_YOUR_OWN: Horse | null = null

// JSON形式の牝系データをHorse型に変換
const SCARLET_INK_SYNC = convertJsonToHorse(SCARLET_INK_JSON as PedigreeJsonData)
const ROLL_YOUR_OWN_SYNC = convertJsonToHorse(ROLL_YOUR_OWN_JSON as PedigreeJsonData)

type PedigreeList = {
  [key: string]: Horse
}

/**
 * 牝系データを取得する（TSXファイルとJSONファイルの両方に対応）
 */
async function getPedigreeData(key: string): Promise<Horse | null> {
  try {
    // まずJSONファイルを試す
    if (key === 'scarlet_ink') {
      if (!SCARLET_INK) {
        SCARLET_INK = await loadPedigreeFromJson('./ScarletInk.json')
      }
      return SCARLET_INK
    }

    if (key === 'roll_your_own') {
      if (!ROLL_YOUR_OWN) {
        ROLL_YOUR_OWN = await loadPedigreeFromJson('./RollYourOwn.json')
      }
      return ROLL_YOUR_OWN
    }

    // その他のJSONファイルもここに追加
    // if (key === 'other_pedigree') {
    //   if (!OTHER_PEDIGREE) {
    //     OTHER_PEDIGREE = await loadPedigreeFromJson('./OtherPedigree.json')
    //   }
    //   return OTHER_PEDIGREE
    // }

    return null
  } catch (error) {
    console.error(`JSON牝系データの読み込みに失敗: ${key}`, error)
    return null
  }
}

/**
 * 牝系データのMap（既存のTSXファイル）
 */
const pedigreeList = new Map<string, Horse>([
  // JSON形式の牝系データを追加
  ...(ROLL_YOUR_OWN_SYNC ? [['roll_your_own', ROLL_YOUR_OWN_SYNC] as [string, Horse]] : []),
  ...(SCARLET_INK_SYNC ? [['scarlet_ink', SCARLET_INK_SYNC] as [string, Horse]] : []),
  // 既存のTSXファイル
  ['florries_cup', FLORRIES_CUP],
  ['irish_eyes', IRISH_EYES],
  ['asteria', ASTERIA],
  ['astonishment', ASTONISHMENT],
  ['ariade', ARIADE],
  ['alps', ALPS],
  ['entresol', ENTRESOL],
  ['wet_sail', WET_SAIL],
  ['umeharu', UMEHARU],
  ['esther_dee', ESTHER_DEE],
  ['enamoured', ENAMOURED],
  ['emile', EMILE],
  ['ella', ELLA],
  ['oh_yeah', OH_YEAH],
  ['o_dearest', O_DEAREST],
  ['orlinda_2', ORLINDA_2],
  ['oshima', OSHIMA],
  ['cajole', CAJOLE],
  ['canadian_girl', CANADIAN_GIRL],
  ['comfortable', COMFORTABLE],
  ['keendragh', KEENDRAGH],
  ['queen', QUEEN],
  ['clara_mcgeary', CLARA_MCGEARY],
  ['craigdarroch', CRAIGDARROCH],
  ['clonfert', CLONFERT],
  ['quick_lunch', QUICK_LUNCH],
  ['sunderby', SUNDERBY],
  ['shiuichi', SHIUICHI],
  ['jardiniere', JARDINIERE],
  ['shrilly', SHRILLY],
  ['silver_fort', SILVER_FORT],
  ['silver_button', SILVER_BUTTON],
  ['school_bell', SCHOOL_BELL],
  ['stardust', STARDUST],
  ['step_sister', STEP_SISTER],
  ['stephania', STEPHANIA],
  ['thrilling', THRILLING],
  ['sevigne', SEVIGNE],
  ['sereta', SERETA],
  ['thonella', THONELLA],
  ['diana', DIANA],
  ['dicing', DICING],
  ['tyrants_queen', TYRANTS_QUEEN],
  ['tip_top', TIP_TOP],
  ['chatterbox', CHATTERBOX],
  ['devonia', DEVONIA],
  ['desmonds_holiday', DESMONDS_HOLIDAY],
  ['durango', DURANGO],
  ['true_spear', TRUE_SPEAR],
  ['nineve', NINEVE],
  ['baverstock', BAVERSTOCK],
  ['buxom', BUXOM],
  ['papoose', PAPOOSE],
  ['banri', BANRI],
  ['biddy_scaliger', BIDDY_SCALIGER],
  ['beautiful_dreamer', BEAUTIFUL_DREAMER],
  ['billericay_belle', BILLERICAY_BELLE],
  ['believe_sally', BELIEVE_SALLY],
  ['first_stop', FIRST_STOP],
  ['fashion_maid', FASHION_MAID],
  ['finola', FINOLA],
  ['fair_peggy', FAIR_PEGGY],
  ['friars_maiden', FRIARS_MAIDEN],
  ['frustrate', FRUSTRATE],
  ['frigidity', FRIGIDITY],
  ['flittersan', FLITTERSAN],
  ['flippancy', FLIPPANCY],
  ['bluette', BLUETTE],
  ['propontis', PROPONTIS],
  ['helen_surf', HELEN_SURF],
  ['bonny_nancy', BONNY_NANCY],
  ['meralbi', MERALBI],
  ['mira', MIRA],
  ['mintenza', MINTENZA],
  ['rhine', RHINE],
  ['la_gracia', LA_GRACIA],
  ['leslie_carter', LESLIE_CARTER],
  ['lady_allon', LADY_ALLON],
  ['lady_limond', LADY_LIMOND],
  ['lepida', LEPIDA],
  ['rose_hawkins', ROSE_HAWKINS],
  ['tanemasa', TANEMASA],
  ['tanemichi', TANEMICHI],
  ['hoshitani', HOSHITANI],
  ['hoshitomi', HOSHITOMI],
  ['hoshitomo', HOSHITOMO],
  ['hoshihata', HOSHIHATA],
  ['hoshihama', HOSHIHAMA],
  ['hoshiwaka', HOSHIWAKA],
])

/**
 * 牝系データを取得する（TSXファイルとJSONファイルの両方に対応）
 */
export async function getPedigree(key: string): Promise<Horse | null> {
  // まず既存のTSXファイルをチェック
  if (pedigreeList.has(key)) {
    return pedigreeList.get(key)!
  }

  // JSONファイルを試す
  return await getPedigreeData(key)
}

/**
 * 利用可能な牝系のキー一覧を取得
 */
export function getAvailablePedigreeKeys(): string[] {
  return Array.from(pedigreeList.keys())
}

export default pedigreeList
