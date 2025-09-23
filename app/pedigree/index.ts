import { Horse } from '@/types/Horse'
import { loadPedigreeFromJson, convertJsonToHorse, PedigreeJsonData } from '../lib/pedigree-loader'

// 動的JSONファイル読み込み用の型定義
type JsonFileData = {
  fileName: string
  variableName: string
  keyName: string
  data: PedigreeJsonData | null
  horse: Horse | null
}

/**
 * ファイル名から変数名を生成する関数
 * 例: "ScarletInk.json" -> "SCARLET_INK"
 */
function generateVariableName(fileName: string): string {
  return fileName
    .replace('.json', '')
    .replace(/([A-Z])/g, '_$1')
    .toUpperCase()
    .replace(/^_/, '')
}

/**
 * ファイル名からキー名を生成する関数
 * 例: "ScarletInk.json" -> "scarlet_ink"
 */
function generateKeyName(fileName: string): string {
  return fileName
    .replace('.json', '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * 利用可能なJSONファイルの一覧を取得する
 * 注意: Next.jsではfsモジュールが使用できないため、静的に定義
 */
function getAvailableJsonFiles(): string[] {
  return [
    'AbbeyBridge.json',
    'Abi.json',
    'ABNoodle.json',
    'Abyla.json',
    'Aconite.json',
    'Addicted.json',
    'AdmireLapis.json',
    'AdmireMonroe.json',
    'AdmireYell.json',
    'Admise.json',
    'AdventureOn.json',
    'Afaff.json',
    'Afdhaad.json',
    'AfterTheSun.json',
    'Aghsan.json',
    'AirPassion.json',
    'Alabaster2.json',
    'Albiano.json',
    'Alderney.json',
    'Alizetta.json',
    'AlKhazaama.json',
    'AllForLondon.json',
    'AllHallows.json',
    'AllicansayisWow.json',
    'AllTheChat.json',
    'Allthewaybaby.json',
    'AlpineRose.json',
    'AlpineSwift.json',
    'Alps.json',
    'AlsAnnie.json',
    'Alvena.json',
    'AlwaysLoyal.json',
    'Alyreina.json',
    'AlysDelight.json',
    'Alywin.json',
    'Amaritude.json',
    'AmazonWarrior.json',
    'Ambulea.json',
    'Amelia.json',
    'AnaMarie.json',
    'Ancaria.json',
    'Ancho.json',
    'Angelinthemorning.json',
    'AngelOfTheGwaun.json',
    'AngelSeed.json',
    'Annalina.json',
    'AnnaMonda.json',
    'AnnaPalariva.json',
    'AnnaPerenna.json',
    'AnnaSterz.json',
    'Anniegetyourgun.json',
    'AnnStuart.json',
    'Antiquary.json',
    'AntiqueValue.json',
    'Appeal2.json',
    'AppealingLass.json',
    'AprilSonnett.json',
    'Aquarist.json',
    'Aranthera.json',
    'Archeology.json',
    'Ariade.json',
    'AriaPura.json',
    'Artisia.json',
    'Arvada.json',
    'Arvola.json',
    'AsakaFuji.json',
    'AsakaHime.json',
    'AsakaMambo.json',
    'AscotStrike.json',
    'AseltinesAngels.json',
    'AShinEpona.json',
    'AShinHarbor.json',
    'AsianMeteor.json',
    'Assertaine.json',
    'Assertion.json',
    'AssertivePrincess.json',
    'Asteria.json',
    'Astonishment.json',
    'Astrea2.json',
    'Atab.json',
    'Atoll.json',
    'Attract.json',
    'AubeIndienne.json',
    'AussieCompany.json',
    'AutumnMelody.json',
    'AutumnMoon.json',
    'Ave.json',
    'AvenirCertain.json',
    'AvenuesLady.json',
    'AwesomeFeather.json',
    'Azeri.json',
    'Azhaar.json',
    'AztecHill.json',
    'Azwah.json',
    'Badeelah.json',
    'Bagalollies.json',
    'Bagatelle.json',
    'Bala.json',
    'BaladaSale.json',
    'Baldwina.json',
    'BalletDancing.json',
    'BalletQueen.json',
    'Banovina.json',
    'Banri.json',
    'Barada.json',
    'Barancella.json',
    'Barbicat.json',
    'BarbsBold.json',
    'Bardonecchia.json',
    'BarefootLady.json',
    'Basha.json',
    'Basimah.json',
    'Baverstock.json',
    'BeaconTarn.json',
    'Beatrice.json',
    'BeatrixKiddo.json',
    'BeauDanzig.json',
    'BeautifulBasic.json',
    'BeautifulDreamer.json',
    'BeautifulGem.json',
    'BeautifulGold.json',
    'BeautifulMoment.json',
    'BeautyContest.json',
    'Beechmast.json',
    'Beesandbirds.json',
    'BeFair.json',
    'BeHappy.json',
    'BelieveSally.json',
    'Belladora.json',
    'BelleAllure.json',
    'BelleAnglaise.json',
    'BelleCherie.json',
    'BelleParole.json',
    'Belpiano.json',
    'Bemol.json',
    'BeMyFire.json',
    'Berliani.json',
    'BerryRose.json',
    'Bersid.json',
    'BestBoot.json',
    'BestTasseled.json',
    'BetterThanHonour.json',
    'Bettolle.json',
    'BetweenTime.json',
    'BiddyScaliger.json',
    'BijouxMiss.json',
    'BillericayBelle.json',
    'BirdCat.json',
    'Birjand.json',
    'BitofFaith.json',
    'BlancheReine.json',
    'Blastina.json',
    'BlazingBliss.json',
    'Blixen.json',
    'BlossomingBeauty.json',
    'BlueAvenue.json',
    'BlueJeanBaby.json',
    'BlueLustre.json',
    'Bluette.json',
    'BlushingBride.json',
    'BlushingDebutante.json',
    'BlushingPrincess.json',
    'BobsDilemma.json',
    'Boldogsag.json',
    'BonnyNancy.json',
    'BornFamous.json',
    'Boudeuse.json',
    'BoundToDance.json',
    'Bradamante.json',
    'BreedersFlight.json',
    'BridalDinner.json',
    'BroadAppeal.json',
    'BroughtToMind.json',
    'BrushWithTequila.json',
    'BubbleCompany.json',
    'BuffedOrange.json',
    'Bugwiser.json',
    'BuperDance.json',
    'Burningwood.json',
    'Buxom.json',
    'BuyTheCat.json',
    'BuyTheSport.json',
    'ByeMyLove.json',
    'Cadenza2.json',
    'Caerna.json',
    'CafeLaLaLu.json',
    'CairoRose.json',
    'Cajole.json',
    'CaliforniaNectar.json',
    'CallenderMaid.json',
    'Calpoppy.json',
    'Cambina.json',
    'CameronGirl.json',
    'Campana.json',
    'CanadianApproval.json',
    'CanadianGirl.json',
    'Canopus.json',
    'CapeVerdi.json',
    'Capricciosa.json',
    'Carambola.json',
    'Cariad.json',
    'Caricatura.json',
    'CarlaPower.json',
    'Carling.json',
    'Carniola.json',
    'CaroGal.json',
    'Case.json',
    'Casey.json',
    'CastleBrown.json',
    'CatAli.json',
    'Catalina.json',
    'Catalyst.json',
    'Cataract.json',
    'Catequil.json',
    'CatherineParr.json',
    'Celeris.json',
    'CertainSecret.json',
    'Chalna.json',
    'ChanceySquaw.json',
    'Chanrossa.json',
    'Chansonnette.json',
    'ChariotdOr.json',
    'Charitable.json',
    'CharityQuest.json',
    'CharlestonHarbor.json',
    'CharmantCoeur.json',
    'CharmingFappiano.json',
    'Charon.json',
    'Chatterbox.json',
    'Cheetah.json',
    'CheriesSmile.json',
    'CherokeeMaiden.json',
    'ChesaPlana.json',
    'ChesutokeRose.json',
    'ChezLaFemme.json',
    'ChickiesDisco.json',
    'ChiefNell.json',
    'ChinaBreeze.json',
    'ChristianName.json',
    'Christiecat.json',
    'CityWells.json',
    'CjsSecret.json',
    'ClaraMcgeary.json',
    'ClareBridge.json',
    'Clarinet.json',
    'ClassicCrown.json',
    'ClearAmber.json',
    'ClearPath.json',
    'Clonfert.json',
    'Cluster.json',
    'Coasted.json',
    'Colchica.json',
    'CollineDeBruyere.json',
    'ColonialBeauty.json',
    'Comfortable.json',
    'Commercante.json',
    'Concaro.json',
    'CondoCommando.json',
    'ConquistadorBlue.json',
    'Conquistadoress.json',
    'Conservatoire.json',
    'Contested.json',
    'CoodenBeach.json',
    'Coppa.json',
    'CopperButterfly.json',
    'Coquerelle.json',
    'Corandia.json',
    'CosmicWish.json',
    'CosmoBell.json',
    'CosmoCielo.json',
    'CouldBeQueen.json',
    'CountessSteffi.json',
    'CountOnAChange.json',
    'CourtneysDay.json',
    'CraftyWife.json',
    'Craigdarroch.json',
    'CreamnCrimson.json',
    'CreamOnly.json',
    'Creed.json',
    'CrepeDeChine.json',
    'CrimsonRattler.json',
    'CroupierLady.json',
    'CrownLavender.json',
    'CrystalGarden.json',
    'CrystalRail.json',
    'Cubata.json',
    'Cursora.json',
    'Cyclas.json',
    'Daabarii.json',
    'Dahlia.json',
    'DaisyDukes.json',
    'Dalama.json',
    'Dalicia.json',
    'Dalinda.json',
    'DamascusQueenJ.json',
    'DameDeCompagnie.json',
    'DamSpectacular.json',
    'DanceCountry.json',
    'DanceGinny.json',
    'DanceInTime.json',
    'DanceLively.json',
    'DancerDestination.json',
    'DancersCup.json',
    'DanceTime.json',
    'DanceWithKitten.json',
    'DancingAuntie.json',
    'DancingGoddess.json',
    'DancingKey.json',
    'Danedream.json',
    'Daneskaya.json',
    'DanseurFabuleux.json',
    'DanseusedEtoile.json',
    'DantsuSure.json',
    'DanuskasMyGirl.json',
    'DaringDanzig.json',
    'DaringVerse.json',
    'DarkestStar.json',
    'DawnRansom.json',
    'DearMimi.json',
    'Deck.json',
    'Deepdene.json',
    'Definite.json',
    'DeLaroche.json',
    'DelicateIce.json',
    'Delphinia.json',
    'Depth.json',
    'Desaucered.json',
    'DesmondsHoliday.json',
    'DevilsBride.json',
    'DevilsCorner.json',
    'Devonia.json',
    'Diagonale.json',
    'Diamantina.json',
    'DiamondCity.json',
    'DiamondDiva.json',
    'DiamondSnow.json',
    'Diana.json',
    'DianneK.json',
    'Dicing.json',
    'Diferente.json',
    'Difficult.json',
    'Dilga.json',
    'DinnerTime.json',
    'Dionisia.json',
    'DiscOfGold.json',
    'Dissipating.json',
    'DivorceTestimony.json',
    'DixielandGem.json',
    'DixieSplash.json',
    'Doff.json',
    'DollyTalbo.json',
    'Dolsk.json',
    'DonaLucia.json',
    'DonnaBlini.json',
    'DreamMoment.json',
    'DreamOfGenie.json',
    'DreamScheme.json',
    'Dresden.json',
    'DrivenSnow.json',
    'DubaiMajesty.json',
    'DubawiHeights.json',
    'Dumka.json',
    'Dunira.json',
    'Duplicit.json',
    'DuPre.json',
    'Durango.json',
    'DustAndDiamonds.json',
    'DynasClub.json',
    'EarthGreen.json',
    'Ecology.json',
    'Egeria.json',
    'EishinGeorgia.json',
    'EishinLaramie.json',
    'EishinMarianna.json',
    'EishinMcallen.json',
    'EishinTennessee.json',
    'Elatis.json',
    'Eleuthera.json',
    'Ella.json',
    'ElusiveWave.json',
    'Elzevir.json',
    'Embla.json',
    'EmbrasserMoi.json',
    'Emile.json',
    'Enamoured.json',
    'Encantado.json',
    'EndItDarling.json',
    'EnglishHumour.json',
    'Enigma.json',
    'Enora.json',
    'EnthrallingLady.json',
    'Enticed.json',
    'Entresol.json',
    'EpicLove.json',
    'EriduBabylon.json',
    'ErimoFantasy.json',
    'ErimoShirayuri.json',
    'ErimoSymphony.json',
    'ErinBird.json',
    'Erzsi.json',
    'EstherDee.json',
    'Estrechada.json',
    'Esyoueffcee.json',
    'EternalBeat.json',
    'EtesVousPrets.json',
    'Etiquette.json',
    'ExcellentGift.json',
    'ExceptForWanda.json',
    'ExhibitOne.json',
    'Exodus.json',
    'FabulousLaFouine.json',
    'FagersProspect.json',
    'FairEllen.json',
    'FairestCape.json',
    'FairestComet.json',
    'FairPeggy.json',
    'FairShirley.json',
    'FairyBallade.json',
    'FairyDoll.json',
    'FairyFootsteps.json',
    'FairyLights.json',
    'FairyTailTime.json',
    'FairyTale.json',
    'FairyWaltz.json',
    'Falkar.json',
    'Fancimine.json',
    'FancyJet.json',
    'FancyKitten.json',
    'Fanjica.json',
    'FantasySuzuka.json',
    'FarmCat.json',
    'FashionMaid.json',
    'Fasta.json',
    'Felicitous.json',
  ]
}

/**
 * 指定されたJSONファイルを動的に読み込む
 */
async function loadJsonFile(fileName: string): Promise<JsonFileData> {
  const variableName = generateVariableName(fileName)
  const keyName = generateKeyName(fileName)

  try {
    // pedigree-loader.tsのloadPedigreeFromJsonを使用
    const horse = await loadPedigreeFromJson(`./${fileName}`)

    return {
      fileName,
      variableName,
      keyName,
      data: null, // 元のJSONデータは不要
      horse,
    }
  } catch (error) {
    console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    return {
      fileName,
      variableName,
      keyName,
      data: null,
      horse: null,
    }
  }
}

/**
 * すべてのJSONファイルを読み込んでJsonFileDataの配列を作成する
 */
async function loadAllJsonFiles(): Promise<JsonFileData[]> {
  const jsonFiles = getAvailableJsonFiles()
  const results: JsonFileData[] = []

  for (const fileName of jsonFiles) {
    try {
      const jsonFileData = await loadJsonFile(fileName)
      results.push(jsonFileData)
    } catch (error) {
      console.error(`JSONファイルの読み込みに失敗: ${fileName}`, error)
    }
  }

  return results
}

// 動的にJSONファイルを読み込み（初期化時は空配列、必要時に読み込み）
let jsonFilesData: JsonFileData[] = []

// 既存のTSXファイル（後方互換性のため）
// import ROLL_YOUR_OWN from './RollYourOwn'  // JSON形式に移行済み
import FLORRIES_CUP from './FlorriesCup'
// JSONファイルを静的インポート
import FLORRIES_CUP_JSON from './FlorriesCup.json'
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
// import FRIGIDITY from './Frigidity'
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

// 動的読み込みされたJSONファイルのキャッシュ
const jsonHorseCache = new Map<string, Horse | null>()

type PedigreeList = {
  [key: string]: Horse
}

/**
 * 牝系データを取得する（TSXファイルとJSONファイルの両方に対応）
 */
async function getPedigreeData(key: string): Promise<Horse | null> {
  try {
    // キャッシュをチェック
    if (jsonHorseCache.has(key)) {
      return jsonHorseCache.get(key)!
    }

    // jsonFilesDataが空の場合は初期化
    if (jsonFilesData.length === 0) {
      jsonFilesData = await loadAllJsonFiles()
    }

    // 動的に読み込まれたJSONファイルから検索
    const jsonFileData = jsonFilesData.find((data) => data.keyName === key)
    if (jsonFileData && jsonFileData.horse) {
      jsonHorseCache.set(key, jsonFileData.horse)
      return jsonFileData.horse
    }

    // ファイルが存在しない場合は動的に読み込みを試行
    const fileName = jsonFilesData.find((data) => data.keyName === key)?.fileName
    if (fileName) {
      const horse = await loadPedigreeFromJson(`./${fileName}`)
      jsonHorseCache.set(key, horse)
      return horse
    }

    return null
  } catch (error) {
    console.error(`JSON牝系データの読み込みに失敗: ${key}`, error)
    return null
  }
}

/**
 * 牝系データのMap（動的生成）
 */
function createPedigreeList(): Map<string, Horse> {
  const pedigreeMap = new Map<string, Horse>()

  // JSONファイルを静的インポートで追加
  try {
    const florriesCupHorse = convertJsonToHorse(FLORRIES_CUP_JSON as PedigreeJsonData)
    pedigreeMap.set('florries_cup', florriesCupHorse)
  } catch (error) {
    console.error('FlorriesCup.jsonの変換に失敗:', error)
  }

  // 既存のTSXファイルを追加
  const tsxPedigrees: [string, Horse][] = [
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
  ]

  tsxPedigrees.forEach(([key, horse]) => {
    pedigreeMap.set(key, horse)
  })

  return pedigreeMap
}

const pedigreeList = createPedigreeList()

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
 * 利用可能な牝系のキー一覧を取得（動的生成）
 */
export function getAvailablePedigreeKeys(): string[] {
  const keys: string[] = []

  // JSONファイルから生成されたキーを追加
  const jsonFiles = getAvailableJsonFiles()
  jsonFiles.forEach((fileName) => {
    const keyName = generateKeyName(fileName)
    keys.push(keyName)
  })

  // TSXファイルのキーを追加
  const tsxKeys = [
    'florries_cup',
    'irish_eyes',
    'asteria',
    'astonishment',
    'ariade',
    'alps',
    'entresol',
    'wet_sail',
    'umeharu',
    'esther_dee',
    'enamoured',
    'emile',
    'ella',
    'oh_yeah',
    'o_dearest',
    'orlinda_2',
    'oshima',
    'cajole',
    'canadian_girl',
    'comfortable',
    'keendragh',
    'queen',
    'clara_mcgeary',
    'craigdarroch',
    'clonfert',
    'quick_lunch',
    'sunderby',
    'shiuichi',
    'jardiniere',
    'shrilly',
    'silver_fort',
    'silver_button',
    'school_bell',
    'stardust',
    'step_sister',
    'stephania',
    'thrilling',
    'sevigne',
    'sereta',
    'thonella',
    'diana',
    'dicing',
    'tyrants_queen',
    'tip_top',
    'chatterbox',
    'devonia',
    'desmonds_holiday',
    'durango',
    'true_spear',
    'nineve',
    'baverstock',
    'buxom',
    'papoose',
    'banri',
    'biddy_scaliger',
    'beautiful_dreamer',
    'billericay_belle',
    'believe_sally',
    'first_stop',
    'fashion_maid',
    'finola',
    'fair_peggy',
    'friars_maiden',
    'frustrate',
    'flittersan',
    'flippancy',
    'bluette',
    'propontis',
    'helen_surf',
    'bonny_nancy',
    'meralbi',
    'mira',
    'mintenza',
    'rhine',
    'la_gracia',
    'leslie_carter',
    'lady_allon',
    'lady_limond',
    'lepida',
    'rose_hawkins',
    'tanemasa',
    'tanemichi',
    'hoshitani',
    'hoshitomi',
    'hoshitomo',
    'hoshihata',
    'hoshihama',
    'hoshiwaka',
  ]

  keys.push(...tsxKeys)

  return keys
}

export default pedigreeList
