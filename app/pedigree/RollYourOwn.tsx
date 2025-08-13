import { Horse } from '@/types/Horse'
import { newDate } from 'app/lib/utils'
import { Foaled } from '@/types/Foaled'
import dynamic from 'next/dynamic'
const HL = dynamic(() => import('@/components/HorseLink'), { ssr: false })

const ROLL_YOUR_OWN: Horse = {
  name: 'ロールユアオーン',
  pedigreeName: 'Roll Your Own',
  id: 'roll-your-own',
  foaled: new Foaled('1924'),
  died: '1944.12.21 死亡', // 血統書データサービス
  breeder: 'F.F. Simms, Xalapa Stud',
  owner: '社台牧場（北海道白老郡白老村）',
  sex: 'female',
  sire: 'Horron',
  dam: 'Negligee',
  color: '鹿毛',
  netkeibaId: '000a002408',
  children: [
    {
      name: 'エスパリオン',
      pedigreeName: '博磊',
      id: 'espalion',
      breed: 'サラブレッド種',
      sex: 'male',
      color: '栗毛',
      foaled: new Foaled('1935'),
      sire: 'ハクリユウ',
      dam: 'ロールユアオーン',
      breeder: '社台牧場（北海道白老郡白老村）',
      retired: '1942年秋季 乗用',
      owner: '宮本恒平',
      trainer: '大久保房松',
      jockey: '佐藤邦雄',
      raceStats: {
        total: { runs: 55, wins: 9 },
        divisions: [
          { type: 'central', stats: { flat: { runs: 55, wins: 9 }, jump: { runs: 0, wins: 0 } } },
          { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
        ],
      },
      prizeMoney: {
        total: '46,100円（本賞金）',
      },
      raceResults: [
        {
          date: newDate(1939, 12, 2),
          racecourse: '中山',
          race: '中山記念（秋）',
          displayRace: '中山記念（秋）',
          distance: '3400',
          grade: 'jrs_grade',
          entry: '12',
          result: '7',
        },
        {
          date: newDate(1940, 5, 4),
          racecourse: '横浜',
          race: '横浜特別（春）',
          displayRace: '横浜特別（春）',
          distance: '3450',
          grade: 'jrs_grade',
          entry: '4',
          result: '1',
        },
        {
          date: newDate(1940, 6, 3),
          racecourse: '東京',
          race: '目黒記念（春）',
          displayRace: '目黒記念（春）',
          distance: '3900',
          grade: 'jrs_grade',
          entry: '7',
          result: '1',
        },
        {
          date: newDate(1940, 11, 16),
          racecourse: '東京',
          race: '目黒記念（秋）',
          displayRace: '目黒記念（秋）',
          distance: '3400',
          grade: 'jrs_grade',
          entry: '10',
          result: '2',
        },
        {
          date: newDate(1940, 12, 8),
          racecourse: '中山',
          race: '中山記念（秋）',
          displayRace: '中山記念（秋）',
          distance: '3400',
          grade: 'jrs_grade',
          entry: '7',
          result: '1',
        },
        {
          date: newDate(1941, 4, 27),
          racecourse: '阪神',
          race: '帝室御賞典（春）',
          displayRace: '帝室御賞典（春）',
          distance: '3200',
          grade: 'jrs_big8',
          entry: '10',
          result: '3',
        },
        {
          date: newDate(1941, 5, 11),
          racecourse: '東京',
          race: '目黒記念（春）',
          displayRace: '目黒記念（春）',
          distance: '3900',
          grade: 'jrs_grade',
          entry: '10',
          result: '4',
        },
        {
          date: newDate(1941, 11, 2),
          racecourse: '東京',
          race: '帝室御賞典（秋）',
          displayRace: '帝室御賞典（秋）',
          distance: '3200',
          grade: 'jrs_big8',
          entry: '12',
          result: '4',
        },
        {
          date: newDate(1941, 11, 9),
          racecourse: '東京',
          race: '目黒記念（秋）',
          displayRace: '目黒記念（秋）',
          distance: '3400',
          grade: 'jrs_grade',
          entry: '9',
          result: '5',
        },
        {
          date: newDate(1941, 12, 6),
          racecourse: '中山',
          race: '中山記念（秋）',
          displayRace: '中山記念（秋）',
          distance: '3400',
          grade: 'jrs_grade',
          entry: '10',
          result: '3',
        },
        {
          date: newDate(1942, 4, 19),
          racecourse: '阪神',
          race: '帝室御賞典（春）',
          displayRace: '帝室御賞典（春）',
          distance: '3200',
          grade: 'jrs_big8',
          entry: '9',
          result: '7',
        },
      ],
    },
    {
      name: 'ミスロール',
      pedigreeName: '第参ロールユアオーン',
      id: 'dai3-roll-your-own',
      breed: 'サラブレッド種',
      sex: 'female',
      color: '栗毛',
      foaled: new Foaled(newDate(1936, 5, 27)),
      died: '1962.06.19 死亡',
      sire: 'ハクリユウ',
      dam: 'ロールユアオーン',
      breeder: '社台牧場（北海道白老郡白老村）',
      retired: '1942.08.10 蕃殖',
      jockey: '佐藤勇',
      raceStats: {
        total: { runs: 33, wins: 4 },
        divisions: [
          { type: 'central', stats: { flat: { runs: 17, wins: 4 }, jump: { runs: 16, wins: 0 } } },
          { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
        ],
      },
      prizeMoney: {
        total: '11,180円',
      },
      raceResults: [],
      netkeibaId: '000a00262a',
      children: [
        {
          name: 'ロールフレイ',
          formerPedigreeName: 'トキノタマ',
          id: 'roll-hurray',
          breed: 'サラブレッド種',
          sex: 'female',
          color: '鹿毛',
          foaled: new Foaled(newDate(1948, 5, 15)),
          died: '1968.12.30 死亡',
          sire: 'トキノチカラ',
          dam: '第参ロールユアオーン',
          breeder: '増本忠孝（北海道静内郡静内町）',
          trainer: '増本勇',
          jockey: '岩元金三郎',
          raceStats: {
            total: { runs: 90, wins: 9 },
            divisions: [
              {
                type: 'central',
                stats: { flat: { runs: 32, wins: 3 }, jump: { runs: 58, wins: 6 } },
              },
              { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
            ],
          },
          prizeMoney: {
            total: '3,215,560円',
          },
          raceResults: [
            {
              date: newDate(1953, 10, 18),
              racecourse: '京都',
              race: '京都大障害（秋）',
              displayRace: '京都大障害（秋）',
              distance: '3100',
              grade: 'national_jump',
              entry: '6',
              result: '4',
            },
          ],
          netkeibaId: '000a00293b',
          children: [
            {
              name: 'ロールメリー',
              formerName: 'フエアジヤパン',
              id: 'roll-merry',
              breed: 'サラブレッド種',
              sex: 'female',
              color: '鹿毛',
              foaled: new Foaled(newDate(1955, 4, 6)),
              sire: 'タカクラヤマ',
              dam: 'ロールフレイ',
              breeder: '増本孝一（北海道静内郡静内町）',
              retired: '1961.12.20 蕃殖',
              owner: '豊島美王麿',
              trainer: '尾形藤吉（東京）→古賀嘉蔵（中山）',
              jockey: '古賀一隆',
              raceStats: {
                total: { runs: 62, wins: 11 },
                divisions: [
                  {
                    type: 'central',
                    stats: { flat: { runs: 29, wins: 3 }, jump: { runs: 33, wins: 8 } },
                  },
                  {
                    type: 'local',
                    stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                  },
                ],
              },
              prizeMoney: {
                total: '11,562,510円',
              },
              awards: [{ year: 1960, award: '最優秀障害馬' }],
              raceResults: [
                {
                  date: newDate(1959, 10, 11),
                  racecourse: '中山',
                  race: '中山大障害（秋）',
                  displayRace: '中山大障害（秋）',
                  distance: '芝4100',
                  grade: 'jra_grandjump',
                  entry: '8',
                  result: '2',
                },
                {
                  date: newDate(1959, 11, 8),
                  racecourse: '東京',
                  race: '東京障害特別（秋）',
                  displayRace: '東京障害特別（秋）',
                  distance: '芝3300',
                  grade: 'jra_jump',
                  entry: '6',
                  result: '2',
                },
                {
                  date: newDate(1960, 5, 3),
                  racecourse: '東京',
                  race: '東京障害特別（春）',
                  displayRace: '東京障害特別（春）',
                  distance: '芝3300',
                  grade: 'jra_jump',
                  entry: '5',
                  result: '2',
                },
                {
                  date: newDate(1960, 6, 26),
                  racecourse: '中山',
                  race: '中山大障害（春）',
                  displayRace: '中山大障害（春）',
                  distance: '芝4100',
                  grade: 'jra_grandjump',
                  entry: '5',
                  result: '1',
                },
                {
                  date: newDate(1960, 10, 9),
                  racecourse: '中山',
                  race: '中山大障害（秋）',
                  displayRace: '中山大障害（秋）',
                  distance: '芝4100',
                  grade: 'jra_grandjump',
                  entry: '6',
                  result: '1',
                },
                {
                  date: newDate(1961, 4, 23),
                  racecourse: '中山',
                  race: '中山大障害（春）',
                  displayRace: '中山大障害（春）',
                  distance: '芝4100',
                  grade: 'jra_grandjump',
                  entry: '9',
                  result: '3',
                },
                {
                  date: newDate(1961, 10, 15),
                  racecourse: '中山',
                  race: '中山大障害（秋）',
                  displayRace: '中山大障害（秋）',
                  distance: '芝4100',
                  grade: 'jra_grandjump',
                  entry: '6',
                  result: '4',
                },
              ],
              summary: '中山大障害・春秋連覇の抽せん馬',
              details: `
抽せん馬「フエアジヤパン」として豊島美王麿に購買され、1957年デビュー。翌年から**ロールメリー**に改名、1959年5月より障害に転向。3戦目で障害初勝利を挙げ、その年の中山大障害（秋）では2着に健闘した。

そこからオープン3勝を積み上げて1960年中山大障害（春）に出走すると、1番人気に応えて7馬身差で快勝した。さらに直行した中山大障害（秋）も10馬身差で圧勝、2年前の**ケニイモア**以来2頭目の大障害春秋連覇を達成した。通年でも14戦5勝（5-5-1-3）、1度も掲示板を外さない活躍により最優秀障害馬に選ばれた。

翌1961年も現役を続行、中山大障害にも出走したが春3着・秋4着に終わった。この年を最後に引退、繁殖入りした記録がある[^CKN1961_108]が産駒は残っていない。
[^CKN1961_108]:『中央競馬年鑑 昭和36年』p.108
`,
              netkeibaId: '1955z00316',
            },
          ],
        },
        {
          name: 'マツシラフジ',
          formerPedigreeName: 'ロールオン（ロールオーン）', // 『サラブレッド血統書 第5巻』p.300, 『サラブレッド血統書 第3巻』p.171
          id: 'matsu-shirafuji',
          foaled: new Foaled(newDate(1949, 5, 8)),
          died: '1962.02.10 死亡', // 血統書データサービス
          sex: 'female',
          sire: 'トキノチカラ',
          dam: '第参ロールユアオーン',
          breeder: '増本忠孝（北海道静内郡静内町）', // サラブレッド血統書 第4巻 p.204
          color: '栗毛',
          raceStats: {
            total: { runs: 0, wins: 0 },
            divisions: [],
          },
          netkeibaId: '000a00285d',
          children: [
            {
              name: 'シラフジヒメ',
              formerPedigreeName: '豊島',
              id: 'shirafuji-hime',
              foaled: new Foaled(newDate(1953, 5, 22)),
              died: '1975.04. 用途変更', // 血統書データサービス
              sex: 'female',
              sire: 'シマタカ',
              dam: 'マツシラフジ',
              breeder: '増本忠孝（北海道静内郡静内町）', // サラブレッド血統書 第4巻 p.204
              owner: '藤原キヨ', // netkeiba
              trainer: '東原實', // netkeiba
              color: '鹿毛',
              raceStats: {
                total: { runs: 69, wins: 4 },
                divisions: [
                  {
                    type: 'central',
                    stats: { flat: { runs: 69, wins: 4 }, jump: { runs: 0, wins: 0 } },
                  },
                  {
                    type: 'local',
                    stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                  },
                ],
              },
              prizeMoney: {
                total: '226.1万円',
              },
              netkeibaId: '000a002cf6',
              children: [
                {
                  name: 'アイユウ',
                  id: 'aiyuu',
                  foaled: new Foaled(newDate(1963, 2, 8)),
                  died: '1975.08. 死亡', // 血統書データサービス
                  sex: 'female',
                  breeder: '（千葉県）', // netkeiba, JBIS
                  sire: 'シーフュリュー(GB)',
                  dam: 'シラフジヒメ',
                  color: '鹿毛',
                  raceStats: {
                    total: { runs: 0, wins: 0 },
                    divisions: [],
                  },
                  netkeibaId: '000a003a47',
                  children: [
                    {
                      name: 'シリユース',
                      id: 'sirius',
                      foaled: new Foaled(newDate(1968, 4, 5)),
                      died: '1989.03. 用途変更', // 血統書データサービス
                      sex: 'female',
                      sire: 'テツソ(GB)',
                      dam: 'アイユウ',
                      breeder: '中村市太郎（青森県三戸郡）', // 「サラブレッド血統書 第9巻」p.509
                      owner: '沼田？', // JBIS
                      color: '栗毛',
                      raceStats: {
                        total: { runs: 25, wins: 2 },
                        divisions: [
                          {
                            type: 'central',
                            stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                          },
                          {
                            type: 'local',
                            stats: { flat: { runs: 25, wins: 2 }, jump: { runs: 0, wins: 0 } },
                          },
                        ],
                      },
                      prizeMoney: {
                        total: '269.0万円', // JBIS
                      },
                      netkeibaId: '1955101548',
                      children: [
                        {
                          name: 'ショウフウグリーン',
                          localName: 'シヨウフウグリーン',
                          id: 'shofu-green',
                          breed: 'サラブレッド種',
                          sex: 'male',
                          color: '栗毛',
                          foaled: new Foaled(newDate(1975, 2, 23)),
                          sire: 'アレツ(FR)',
                          dam: 'シリユース',
                          breeder: '東北牧場（青森県上北郡東北町）',
                          retired: '1979年（中央）',
                          owner: '松本市三郎→松本勝利→中澤淺子',
                          trainer: '田中良平（栗東）→工藤英嗣（高知）',
                          jockey: '山内研二',
                          raceStats: {
                            total: { runs: 45, wins: 8 },
                            divisions: [
                              {
                                type: 'central',
                                stats: { flat: { runs: 20, wins: 4 }, jump: { runs: 0, wins: 0 } },
                              },
                              {
                                type: 'local',
                                stats: { flat: { runs: 25, wins: 4 }, jump: { runs: 0, wins: 0 } },
                              },
                            ],
                          },
                          prizeMoney: {
                            total: '44,389,000円',
                            central: '38,625,000円',
                            local: '5,764,000円',
                          },
                          raceResults: [
                            {
                              date: newDate(1978, 8, 27),
                              racecourse: '小倉',
                              race: '小倉記念',
                              displayRace: '小倉記念',
                              distance: '芝2000',
                              grade: 'jra_grade',
                              entry: '8',
                              result: '1',
                            },
                            {
                              date: newDate(1978, 10, 22),
                              racecourse: '京都',
                              race: '京都新聞杯',
                              displayRace: '京都新聞杯',
                              distance: '芝2000',
                              grade: 'jra_grade',
                              entry: '16',
                              result: '15',
                            },
                            {
                              date: newDate(1978, 11, 12),
                              racecourse: '京都',
                              race: '菊花賞',
                              displayRace: '菊花賞',
                              distance: '芝3000',
                              grade: 'jra_big8',
                              entry: '20',
                              result: '19',
                            },
                            {
                              date: newDate(1979, 5, 6),
                              racecourse: '京都',
                              race: 'スワンS',
                              displayRace: 'スワンS',
                              distance: '芝1600',
                              grade: 'jra_grade',
                              entry: '10',
                              result: '4',
                            },
                            {
                              date: newDate(1979, 6, 10),
                              racecourse: '阪神',
                              race: '阪急杯',
                              displayRace: '阪急杯',
                              distance: '芝1600',
                              grade: 'jra_grade',
                              entry: '14',
                              result: '8',
                            },
                          ],
                          summary: '後の名伯楽・山内研二に重賞を勝たせた馬',
                          details: `
1977年、2歳の秋にショウフウグリーンの名でデビュー。翌年5月に9戦目で初勝利。次走の300万下は9着に敗れたが、ダートから芝に戻し、鞍上を山内研二に替えたところ一気に3連勝。最軽量ハンデを活かして小倉記念を制し、人馬共に重賞初勝利を挙げた。

所謂「夏の登り馬」としてクラシック路線に参戦したが、京都新聞杯で10人気15着と惨敗、続くオープンも7着と敗れる。人馬共にG1初挑戦となる菊花賞では重賞勝ち馬ながら16番人気の低評価で、レースは中団につけるも最終3コーナーの坂で大失速。終わってみればブービー19着という大敗だった。なお大差の最下位には逃げて潰れたチェリーリュウが入った。

その後は鞍上交代や距離短縮を試みるも勝利には届かず、1980年から高知へ移籍。拗音の都合でシヨウフウグリーンと名を改め、25戦4勝の成績を残した。

なお最盛期を共にした山内研二は後に調教師として大成。**イシノサンデー**や**ダンツフレーム**を管理し、G1級8勝を含む重賞57勝を挙げることになる。そんな名伯楽が13年間の騎手人生で唯一掴んだ重賞勝利として、ショウフウグリーンはその名を残している。
`,
                          netkeibaId: '000a0101e7',
                        },
                        {
                          name: 'キングシリユース',
                          id: 'king-sirius',
                          breed: 'サラブレッド種',
                          sex: 'male',
                          color: '栗毛',
                          foaled: new Foaled(newDate(1980, 4, 24)),
                          sire: 'アレツ(FR)',
                          dam: 'シリユース',
                          breeder: '東北牧場（青森県上北郡東北町）',
                          retired: '1988.11.06（中央抹消）',
                          owner: '松川八三→松岡弘（高知）',
                          trainer: '長浜彦三郎→長浜博之（栗東）→濱田隆憲（高知）',
                          jockey: '岩元市三',
                          raceStats: {
                            total: { runs: 50, wins: 7 },
                            divisions: [
                              {
                                type: 'central',
                                stats: { flat: { runs: 44, wins: 7 }, jump: { runs: 0, wins: 0 } },
                              },
                              {
                                type: 'local',
                                stats: { flat: { runs: 6, wins: 0 }, jump: { runs: 0, wins: 0 } },
                              },
                            ],
                          },
                          prizeMoney: {
                            total: '112,179,400円',
                            central: '112,179,400円',
                            local: '0円',
                          },
                          raceResults: [
                            {
                              date: newDate(1983, 5, 1),
                              racecourse: '京都',
                              race: '京都4歳特別(OP)',
                              displayRace: '京都4歳特別',
                              distance: '芝2000',
                              grade: 'jra_grade',
                              entry: '15',
                              result: '4',
                            },
                            {
                              date: newDate(1988, 8, 7),
                              racecourse: '小倉',
                              race: 'TV西日本北九州記念(GIII)',
                              displayRace: '北九州記念',
                              distance: '芝1800',
                              grade: 'jra_g3',
                              entry: '14',
                              result: '7',
                            },
                            {
                              date: newDate(1988, 9, 18),
                              racecourse: '阪神',
                              race: '朝日チャレンジC(GIII)',
                              displayRace: '朝日チャレンジC',
                              distance: '芝2000',
                              grade: 'jra_g3',
                              entry: '14',
                              result: '13',
                            },
                            {
                              date: newDate(1988, 10, 30),
                              racecourse: '京都',
                              race: 'スワンS(GII)',
                              displayRace: 'スワンS',
                              distance: '芝1400',
                              grade: 'jra_g2',
                              entry: '16',
                              result: '13',
                            },
                          ],
                          netkeibaId: '1980102790',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'メイジミドリ',
              formerPedigreeName: 'ミドリザン',
              id: 'meiji-midori-1955',
              linkName: 'メイジミドリ(1955)',
              breed: 'サラブレッド種',
              sex: 'male',
              color: '鹿毛',
              foaled: new Foaled(newDate(1955, 3, 3)),
              sire: 'トサミドリ',
              dam: 'マツシラフジ',
              breeder: '増本忠孝（北海道静内郡静内町）',
              owner: '増本孝一→中野忠雄',
              trainer: '増本勇（京都）',
              jockey: '清水久雄',
              raceStats: {
                total: { runs: 21, wins: 5 },
                divisions: [
                  {
                    type: 'central',
                    stats: { flat: { runs: 21, wins: 5 }, jump: { runs: 0, wins: 0 } },
                  },
                  {
                    type: 'local',
                    stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                  },
                ],
              },
              prizeMoney: {
                total: '2,651,000円',
              },
              raceResults: [
                {
                  date: newDate(1957, 12, 15),
                  racecourse: '阪神',
                  race: '阪神3歳S',
                  displayRace: '阪神3歳S',
                  distance: '芝1200',
                  grade: 'jra_grade',
                  entry: '10',
                  result: '1',
                },
                {
                  date: newDate(1958, 4, 2),
                  racecourse: '中山',
                  race: '皐月賞',
                  displayRace: '皐月賞',
                  distance: '芝2000',
                  grade: 'jra_big8',
                  entry: '18',
                  result: '12',
                },
                {
                  date: newDate(1958, 5, 25),
                  racecourse: '東京',
                  race: '東京優駿',
                  displayRace: '東京優駿',
                  distance: '芝2400',
                  grade: 'jra_big8',
                  entry: '27',
                  result: '19',
                },
                {
                  date: newDate(1958, 6, 15),
                  racecourse: '阪神',
                  race: '毎日盃',
                  displayRace: '毎日盃',
                  distance: '芝2000',
                  grade: 'jra_grade',
                  entry: '13',
                  result: '8',
                },
                {
                  date: newDate(1958, 6, 29),
                  racecourse: '阪神',
                  race: '宝塚盃',
                  displayRace: '宝塚盃',
                  distance: '芝2200',
                  grade: 'jra_grade',
                  entry: '8',
                  result: '3',
                },
                {
                  date: newDate(1958, 11, 3),
                  racecourse: '京都',
                  race: '京都記念（秋）',
                  displayRace: '京都記念（秋）',
                  distance: '芝2200',
                  grade: 'jra_grade',
                  entry: '7',
                  result: '1',
                },
              ],
              details: `
1957年の夏に函館でデビュー。3戦目の北海道3歳S（4着）の後から馬主が変わっている。年末の阪神3歳Sでは8番人気の低評価を覆し、1番人気スマロ（後のホウシユウクイン）を破って関西の3歳チャンピオンとなった。

しかし4歳になると成績が悪化、皐月賞・ダービー共に2桁着順に沈んでしまった。記録では毎回のように横行・後退・蹴りといった駐立不良を繰り返しており、気性が悪化していたのかもしれない。6月の宝塚盃（現在の阪急杯）では軽ハンデを味方に3着に入るも、左前繋靱帯炎を発症し9月の京都盃を取り消した。

それでも11月に復帰し、その復帰戦となるオープン戦で11カ月ぶりの勝利を挙げる。さらに連闘で臨んだ京都記念（秋）も勝利して重賞2勝目を挙げた。しかしケガもあってか翌年上期の出走は1度のみ。秋に再度復帰するもかつての強さは戻らず、この年いっぱいでターフを去った。
`,
              netkeibaId: '1955z00137',
            },
          ],
        },
        {
          name: 'マスラン',
          formerName: 'ハマハヤテ',
          id: 'masuran',
          breed: 'サラブレッド種',
          sex: 'female',
          color: '栗毛',
          foaled: new Foaled(newDate(1951, 4, 22)),
          died: '1979.03.22 死亡',
          sire: 'シマタカ',
          dam: '第参ロールユアオーン',
          breeder: '増本忠孝（北海道静内郡静内町）',
          owner: '増本孝一',
          trainer: '増本勇',
          jockey: '熊坂明',
          raceStats: {
            total: { runs: 28, wins: 5 },
            divisions: [
              {
                type: 'central',
                stats: { flat: { runs: 27, wins: 5 }, jump: { runs: 1, wins: 0 } },
              },
              { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
            ],
          },
          prizeMoney: {
            total: '114.7万円',
          },
          raceResults: [
            {
              date: newDate(1954, 6, 27),
              racecourse: '阪神',
              race: '毎日盃（ハンデ）',
              displayRace: '毎日盃',
              distance: '2000',
              grade: 'national_grade',
              entry: '7',
              result: '2',
            },
          ],
          netkeibaId: '000a002a93',
          children: [
            {
              name: 'ライトニアン',
              id: 'light-nian',
              foaled: new Foaled(newDate(1958, 2, 28)),
              died: '1975.03.25 用途変更', // 血統書データサービス
              sex: 'female',
              sire: 'ボストニアン',
              dam: 'マスラン',
              breeder: '（北海道静内郡静内町）',
              color: '栗毛',
              raceStats: {
                total: { runs: 0, wins: 0 },
                divisions: [],
              },
              netkeibaId: '000a003322',
              children: [
                {
                  name: 'ジーガークイン',
                  id: 'sieger-queen',
                  foaled: new Foaled(newDate(1967, 6, 11)),
                  died: '1992.01.01 用途変更', // 血統書データサービス
                  sex: 'female',
                  sire: 'リユウフオーレル',
                  dam: 'ライトニアン',
                  breeder: '内藤牧場（北海道苫小牧市）', // POGDB
                  color: '鹿毛',
                  raceStats: {
                    total: { runs: 27, wins: 1 },
                    divisions: [
                      {
                        type: 'central',
                        stats: { flat: { runs: 27, wins: 1 }, jump: { runs: 0, wins: 0 } },
                      },
                      {
                        type: 'local',
                        stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                      },
                    ],
                  },
                  prizeMoney: {
                    total: '390.0万円',
                  },
                  netkeibaId: '1955101913',
                  children: [
                    {
                      name: 'ジーガーニジコ',
                      id: 'sieger-nijiko',
                      foaled: new Foaled(newDate(1975, 3, 20)),
                      died: '1992.01.01 用途変更', // 血統書データサービス
                      sex: 'female',
                      sire: 'ファーザーズイメージ(USA)',
                      dam: 'ジーガークイン',
                      breeder: '坂東牧場（北海道沙流郡平取町）',
                      color: '栗毛',
                      raceStats: {
                        total: { runs: 3, wins: 0 },
                        divisions: [
                          {
                            type: 'central',
                            stats: { flat: { runs: 3, wins: 0 }, jump: { runs: 0, wins: 0 } },
                          },
                          {
                            type: 'local',
                            stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                          },
                        ],
                      },
                      prizeMoney: {
                        total: '116.0万円',
                      },
                      netkeibaId: '1955106960',
                      children: [
                        {
                          name: 'ジーガーギヤラント',
                          id: 'sieger-gallant',
                          foaled: new Foaled(newDate(1983, 5, 20)),
                          died: '1997.05.05 死亡', // 血統書データサービス
                          sex: 'female',
                          sire: 'タケシバオー',
                          dam: 'ジーガーニジコ',
                          breeder: '須崎牧場（北海道新冠郡新冠町）',
                          color: '黒鹿毛',
                          raceStats: {
                            total: { runs: 14, wins: 0 },
                            divisions: [
                              {
                                type: 'central',
                                stats: { flat: { runs: 14, wins: 0 }, jump: { runs: 0, wins: 0 } },
                              },
                              {
                                type: 'local',
                                stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } },
                              },
                            ],
                          },
                          prizeMoney: {
                            total: '216.0万円',
                          },
                          netkeibaId: '1983101051',
                          children: [
                            {
                              name: 'ジーガーターセル',
                              id: 'sieger-tercel',
                              foaled: new Foaled(newDate(1990, 3, 4)),
                              died: '2008.09.23 用途変更', // 血統書データサービス
                              breeder: '須崎牧場（北海道新冠郡新冠町）',
                              sex: 'female',
                              sire: 'ホスピタリテイ',
                              dam: 'ジーガーギヤラント',
                              color: '鹿毛',
                              raceStats: {
                                total: { runs: 18, wins: 3 },
                                divisions: [
                                  {
                                    type: 'central',
                                    stats: {
                                      flat: { runs: 18, wins: 3 },
                                      jump: { runs: 0, wins: 0 },
                                    },
                                  },
                                  {
                                    type: 'local',
                                    stats: {
                                      flat: { runs: 0, wins: 0 },
                                      jump: { runs: 0, wins: 0 },
                                    },
                                  },
                                ],
                              },
                              prizeMoney: {
                                total: '2631.0万円',
                              },
                              netkeibaId: '1990102992',
                              children: [
                                {
                                  name: 'ジーガートップラン',
                                  id: 'sieger-top-run',
                                  foaled: new Foaled(newDate(1999, 4, 12)),
                                  died: '2018.10.01 用途変更', // 血統書データサービス
                                  sex: 'female',
                                  sire: 'マヤノトップガン',
                                  dam: 'ジーガーターセル',
                                  breeder: '須崎牧場（北海道新冠郡新冠町）',
                                  color: '鹿毛',
                                  raceStats: {
                                    total: { runs: 19, wins: 1 },
                                    divisions: [
                                      {
                                        type: 'central',
                                        stats: {
                                          flat: { runs: 16, wins: 1 },
                                          jump: { runs: 0, wins: 0 },
                                        },
                                      },
                                      {
                                        type: 'local',
                                        stats: {
                                          flat: { runs: 3, wins: 0 },
                                          jump: { runs: 0, wins: 0 },
                                        },
                                      },
                                    ],
                                  },
                                  prizeMoney: {
                                    total: '710.0万円',
                                  },
                                  netkeibaId: '1999103929',
                                  children: [
                                    {
                                      name: 'キャッスルトップ',
                                      id: 'castle-top',
                                      breed: 'サラブレッド種',
                                      sex: 'male',
                                      color: '黒鹿毛',
                                      foaled: new Foaled(newDate(2018, 4, 20)),
                                      sire: 'バンブーエール',
                                      dam: 'ジーガートップラン',
                                      breeder: '城市公',
                                      retired: '現役',
                                      owner: '城市公',
                                      trainer: '渋谷信博（船橋）→宮川真衣（高知）',
                                      jockey: '仲野光馬',
                                      raceStats: {
                                        total: { runs: 46, wins: 9 },
                                        divisions: [
                                          {
                                            type: 'central',
                                            stats: {
                                              flat: { runs: 1, wins: 0 },
                                              jump: { runs: 0, wins: 0 },
                                            },
                                          },
                                          {
                                            type: 'local',
                                            stats: {
                                              flat: { runs: 45, wins: 9 },
                                              jump: { runs: 0, wins: 0 },
                                            },
                                          },
                                        ],
                                      },
                                      prizeMoney: {
                                        total: '7,741.0万円',
                                        central: '0.0万円',
                                        local: '7,741.0万円',
                                      },
                                      awards: [{ year: 2021, award: 'NAR3歳最優秀牡馬' }],
                                      raceResults: [
                                        {
                                          date: newDate(2021, 7, 14),
                                          racecourse: '大井',
                                          race: 'ジャパンダートダービー',
                                          displayRace: 'ジャパンダートダービー',
                                          distance: 'ダ2000',
                                          grade: 'nar_jpn1',
                                          entry: '13',
                                          result: '1',
                                        },
                                        {
                                          date: newDate(2021, 9, 15),
                                          racecourse: '川崎',
                                          race: '戸塚記念',
                                          displayRace: '戸塚記念',
                                          distance: 'ダ2100',
                                          grade: 'local_grade',
                                          entry: '11',
                                          result: '6',
                                        },
                                        {
                                          date: newDate(2021, 10, 3),
                                          racecourse: '盛岡',
                                          race: 'ダービーグランプリ',
                                          displayRace: 'ダービーグランプリ',
                                          distance: 'ダ2000',
                                          grade: 'local_grade',
                                          entry: '14',
                                          result: '5',
                                        },
                                        {
                                          date: newDate(2021, 12, 29),
                                          racecourse: '大井',
                                          race: '東京大賞典',
                                          displayRace: '東京大賞典',
                                          distance: 'ダ2000',
                                          grade: 'nar_g1',
                                          entry: '15',
                                          result: '13',
                                        },
                                        {
                                          date: newDate(2022, 1, 23),
                                          racecourse: '中山',
                                          race: 'アメリカJCC',
                                          displayRace: 'アメリカJCC',
                                          distance: '芝2200',
                                          grade: 'jra_g2',
                                          entry: '14',
                                          result: '14',
                                        },
                                        {
                                          date: newDate(2022, 2, 16),
                                          racecourse: '船橋',
                                          race: '報知グランプリC',
                                          displayRace: '報知グランプリC',
                                          distance: 'ダ1800',
                                          grade: 'local_grade',
                                          entry: '8',
                                          result: '8',
                                        },
                                        {
                                          date: newDate(2022, 11, 2),
                                          racecourse: '大井',
                                          race: 'サンタアニタトロフィー',
                                          displayRace: 'サンタアニタT',
                                          distance: 'ダ1600',
                                          grade: 'local_grade',
                                          entry: '16',
                                          result: '13',
                                        },
                                        {
                                          date: newDate(2022, 12, 22),
                                          racecourse: '浦和',
                                          race: 'ゴールドC',
                                          displayRace: 'ゴールドC',
                                          distance: 'ダ1400',
                                          grade: 'local_grade',
                                          entry: '10',
                                          result: '8',
                                        },
                                        {
                                          date: newDate(2023, 1, 18),
                                          racecourse: '船橋',
                                          race: '船橋記念',
                                          displayRace: '船橋記念',
                                          distance: 'ダ1000',
                                          grade: 'local_grade',
                                          entry: '12',
                                          result: '12',
                                        },
                                        {
                                          date: newDate(2023, 3, 15),
                                          racecourse: '船橋',
                                          race: 'ダイオライト記念',
                                          displayRace: 'ダイオライト記念',
                                          distance: 'ダ2400',
                                          grade: 'nar_jpn2',
                                          entry: '14',
                                          result: '11',
                                        },
                                        {
                                          date: newDate(2023, 5, 24),
                                          racecourse: '大井',
                                          race: '大井記念',
                                          displayRace: '大井記念',
                                          distance: 'ダ2000',
                                          grade: 'local_grade',
                                          entry: '14',
                                          result: '13',
                                        },
                                        {
                                          date: newDate(2023, 8, 9),
                                          racecourse: '船橋',
                                          race: 'フリオーソレジェンドC',
                                          displayRace: 'フリオーソレジェンドC',
                                          distance: 'ダ1800',
                                          grade: 'local_grade',
                                          entry: '12',
                                          result: '12',
                                        },
                                        {
                                          date: newDate(2024, 5, 1),
                                          racecourse: '船橋',
                                          race: 'かしわ記念',
                                          displayRace: 'かしわ記念',
                                          distance: 'ダ1600',
                                          grade: 'nar_jpn1',
                                          entry: '13',
                                          result: '7',
                                        },
                                        {
                                          date: newDate(2024, 5, 15),
                                          racecourse: '大井',
                                          race: '大井記念',
                                          displayRace: '大井記念',
                                          distance: 'ダ2000',
                                          grade: 'local_grade',
                                          entry: '9',
                                          result: '7',
                                        },
                                        {
                                          date: newDate(2024, 9, 25),
                                          racecourse: '船橋',
                                          race: '日本テレビ盃',
                                          displayRace: '日本テレビ盃',
                                          distance: 'ダ1800',
                                          grade: 'nar_jpn2',
                                          entry: '13',
                                          result: '11',
                                        },
                                      ],
                                      summary: 'ブービー人気・単勝万馬券で3歳ダート王',
                                      details: `
2020年10月に船橋でデビュー。初戦で2着となるも2戦目は10着、そのまま勝ち上がりは3歳春に遅れた。しかしそこから3連勝で船橋の水無月特別（B3）を勝利し、3歳ダート王決定戦・ジャパンダートダービーにコマを進めた。

鞍上は11戦中7戦で手綱を執って2連勝中の仲野光馬の継続騎乗となった。連勝中とはいえつい2カ月前まで未勝利馬だったキャッスルトップの人気は低く、単勝129.5倍という13頭立ての12番人気に留まっていた。しかしレースでは果敢な逃げから直線で粘りこみ、追いすがるゴッドセレクションとウェルドーンをアタマ差抑えて優勝。騎手・調教師・馬主の全員がG1級競走初制覇、騎手と馬主はこれが初重賞勝利という記録づくめの勝利となった。

鞍上や「単勝万馬券」だけでなく、本馬の血統も大きな話題となった。サンデーサイレンスの血が一滴もない、**ロールユアオーン**系というマイナーな牝系、かつ母系に入っている種牡馬も内国産馬ばかり（母父のマヤノトップガンも珍しいが、**ボストニアン**や**リユウフオーレル**もかなり希少）という骨董品様とした血統が注目を集めたのである。

次走の戸塚記念では1番人気に支持されるも6着。ジャパンダートダービーの激走で燃え尽きてしまったのか、以降は20戦以上出走して馬券圏内は1度のみとなっている。
（2024年8月現在）
`,
                                      netkeibaId: '2018103898',
                                    },
                                  ],
                                },
                                {
                                  name: 'ジーガーウイング',
                                  id: 'sieger-wing',
                                  foaled: new Foaled(newDate(2004, 4, 12)),
                                  died: '2022.09.30 転売不明', // 血統書データサービス
                                  sex: 'male',
                                  sire: 'ウイングアロー',
                                  dam: 'ジーガーターセル',
                                  breeder: '須崎牧場（北海道新冠郡新冠町）',
                                  color: '鹿毛',
                                  raceStats: {
                                    total: { runs: 28, wins: 6 },
                                    divisions: [
                                      {
                                        type: 'central',
                                        stats: {
                                          flat: { runs: 14, wins: 0 },
                                          jump: { runs: 0, wins: 0 },
                                        },
                                      },
                                      {
                                        type: 'local',
                                        stats: {
                                          flat: { runs: 14, wins: 6 },
                                          jump: { runs: 0, wins: 0 },
                                        },
                                      },
                                    ],
                                  },
                                  prizeMoney: {
                                    total: '214.8万円',
                                  },
                                  netkeibaId: '2004100380',
                                  children: [
                                    {
                                      name: 'ジーガーローレンス',
                                      id: 'sieger-laurence',
                                      foaled: new Foaled(newDate(2016, 3, 7)),
                                      died: '2023.03.18 用途変更', // 血統書データサービス
                                      sex: 'male',
                                      sire: 'ヘニーヒューズ(USA)',
                                      dam: 'ジーガーウイング',
                                      breeder: '須崎牧場（北海道新冠郡新冠町）',
                                      color: '鹿毛',
                                      raceStats: {
                                        total: { runs: 16, wins: 1 },
                                        divisions: [
                                          {
                                            type: 'central',
                                            stats: {
                                              flat: { runs: 15, wins: 1 },
                                              jump: { runs: 0, wins: 0 },
                                            },
                                          },
                                          {
                                            type: 'local',
                                            stats: {
                                              flat: { runs: 1, wins: 0 },
                                              jump: { runs: 0, wins: 0 },
                                            },
                                          },
                                        ],
                                      },
                                      prizeMoney: {
                                        total: '500.0万円',
                                      },
                                      netkeibaId: '2016100322',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'ヨシトク',
      pedigreeName: '第六ロールユアオーン',
      id: 'dai6-roll-your-own',
      breed: 'サラブレッド種',
      sex: 'female',
      color: '鹿毛',
      foaled: new Foaled(newDate(1940, 4, 18)),
      died: '1965.12.02 死亡',
      sire: 'ステーツマン(GB)',
      dam: 'ロールユアオーン',
      breeder: '社台牧場（北海道白老郡白老村）',
      retired: '1954年',
      jockey: '稗田十七二',
      raceStats: {
        total: { runs: 9, wins: 2 },
        divisions: [
          { type: 'central', stats: { flat: { runs: 9, wins: 2 }, jump: { runs: 0, wins: 0 } } },
          { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
        ],
      },
      prizeMoney: {
        total: '4,970円以上',
      },
      raceResults: [
        {
          date: newDate(1943, 8, 1),
          racecourse: '札幌',
          race: '農賞四才',
          displayRace: '札幌農林省賞典四歳呼馬',
          distance: '2400',
          grade: 'jrs_grade',
          entry: '8',
          result: '1',
        },
      ],
      children: [
        {
          name: 'ノーベル',
          formerPedigreeName: '日高学',
          id: 'nobel',
          breed: 'サラブレッド種',
          sex: 'male',
          color: '鹿毛',
          foaled: new Foaled(newDate(1949, 6, 20)),
          died: '1954.03.14 予後不良',
          sire: '大鵬',
          dam: '第六ロールユアオーン',
          breeder: '辻芳雄（北海道浦河郡浦河町）',
          retired: '1954.03.14（推定）',
          owner: '上田清次郎',
          trainer: '上田武司→望月与一郎→久保田彦之',
          jockey: '上田三千夫',
          raceStats: {
            total: { runs: 57, wins: 18 },
            divisions: [
              {
                type: 'central',
                stats: { flat: { runs: 57, wins: 18 }, jump: { runs: 0, wins: 0 } },
              },
              { type: 'local', stats: { flat: { runs: 0, wins: 0 }, jump: { runs: 0, wins: 0 } } },
            ],
          },
          prizeMoney: {
            total: '5,333,760円',
          },
          raceResults: [
            {
              date: newDate(1951, 12, 16),
              racecourse: '阪神',
              race: '阪神三歳ステークス',
              displayRace: '阪神3歳S',
              distance: '1200',
              grade: 'national_grade',
              entry: '5',
              result: '4',
            },
            {
              date: newDate(1952, 11, 3),
              racecourse: '阪神',
              race: 'チヤレンヂカツプ',
              displayRace: '朝日チャレンジC',
              distance: '2000',
              grade: 'national_grade',
              entry: '9',
              result: '1',
            },
            {
              date: newDate(1952, 12, 1),
              racecourse: '京都',
              race: '京都記念（ハンデ）',
              displayRace: '京都記念（秋）',
              distance: '2000',
              grade: 'national_grade',
              entry: '7',
              result: '4',
            },
            {
              date: newDate(1953, 3, 21),
              racecourse: '京都',
              race: '京都ステークス',
              displayRace: '京都S',
              distance: '2400外',
              grade: 'national_grade',
              entry: '8',
              result: '6',
            },
            {
              date: newDate(1953, 4, 12),
              racecourse: '阪神',
              race: '阪神記念（春）',
              displayRace: '阪神記念（春）',
              distance: '2400',
              grade: 'national_grade',
              entry: '8',
              result: '7',
            },
            {
              date: newDate(1953, 5, 5),
              racecourse: '京都',
              race: '天皇賞（春）',
              displayRace: '天皇賞（春）',
              distance: '3200',
              grade: 'national_big8',
              entry: '8',
              result: '5',
            },
            {
              date: newDate(1953, 6, 7),
              racecourse: '阪神',
              race: '鳴尾記念（春）',
              displayRace: '鳴尾記念（春）',
              distance: '2200',
              grade: 'national_grade',
              entry: '5',
              result: '4',
            },
            {
              date: newDate(1953, 8, 23),
              racecourse: '中京',
              race: '中京開設記念',
              displayRace: '中京開設記念',
              distance: '1800',
              grade: 'national_grade',
              entry: '7',
              result: '5',
            },
            {
              date: newDate(1953, 9, 6),
              racecourse: '中京',
              race: '金鯱賞',
              displayRace: '金鯱賞',
              distance: '1600',
              grade: 'national_grade',
              entry: '10',
              result: '5',
            },
            {
              date: newDate(1953, 9, 12),
              racecourse: '中京',
              race: '愛知盃',
              displayRace: '愛知盃',
              distance: '2000',
              grade: 'national_grade',
              entry: '4',
              result: '2',
            },
            {
              date: newDate(1953, 9, 20),
              racecourse: '中京',
              race: '中日盃',
              displayRace: '中日盃',
              distance: '1800',
              grade: 'national_grade',
              entry: '8',
              result: '2',
            },
            {
              date: newDate(1953, 10, 25),
              racecourse: '中山',
              race: '中山記念',
              displayRace: '中山記念',
              distance: '2400',
              grade: 'national_grade',
              entry: '11',
              result: '7',
            },
            {
              date: newDate(1953, 11, 15),
              racecourse: '東京',
              race: '天皇賞（五才以上）',
              displayRace: '天皇賞（秋）',
              distance: '3200',
              grade: 'national_big8',
              entry: '8',
              result: '4',
            },
            {
              date: newDate(1953, 11, 29),
              racecourse: '東京',
              race: '毎日王冠',
              displayRace: '毎日王冠',
              distance: '2500',
              grade: 'national_grade',
              entry: '8',
              result: '7',
            },
            {
              date: newDate(1953, 12, 20),
              racecourse: '中山',
              race: '中山特別',
              displayRace: '中山特別',
              distance: '2400',
              grade: 'national_grade',
              entry: '11',
              result: '7',
            },
          ],
          summary: '18勝を挙げ、同期の名牝に挑み続けた「サラ抽」一期生',
          details: `
サラブレッドの抽せん馬（共同購入）制度が復活した1951年。ノーベルはその一期生として上田清次郎に購買され、7月の京都でデビューした。2歳時の戦績は9戦4勝（4-4-0-1）。年末の阪神3歳ステークスこそテツノハナ・レダ・クインナルビーに続く4着に敗れたが、それ以外は全て連対という好成績を収める。3歳時には正月開催の京都で優勝。その後も勝ち星を積み重ね、秋にはハンデ重賞のチャレンジカップ（現在の朝日チャレンジカップ）に出走。同期のクインナルビーとレダ、1歳上の桜花賞馬ツキカワらを破って重賞初制覇を果たした。

順風満帆に思われたノーベルだったが、その後の道のりは厳しいものになる。阪神3歳ステークスで後塵を拝し、チャレンジカップで借りを返したクインナルビーとレダ、本格化した同期の2頭が大きな壁となった。

1953年の京都ステークス・天皇賞（春）・鳴尾記念（春）では、1着2着を入れ替えながらクインナルビーとレダがワンツーフィニッシュを繰り返した。レダは中京競馬場で新設重賞を2つ勝った。天皇賞を勝ち抜けたレダを追うようにクインナルビーは天皇賞（秋）を制した。これら全てのレースにノーベルはいて、つまりその全てで敗れていた。ノーベルはクインナルビーに9度、レダに6度も敗れた。平場では勝てているのだが、この2頭の前にはどうしても勝利が遠かった。

10月からは札幌の望月与一郎厩舎、東京の久保田彦之厩舎に転厩を繰り返した。11月末の毎日王冠では鳴尾記念（春）ぶりに3頭が揃ったが、この競走中にレダが故障を発生し予後不良となった。クインナルビーは14戦ぶりに馬券内を外す4着。ノーベルは生涯最低タイの7着に終わった。翌1954年の1月、日本経済新春杯3着を最後にクインナルビーは引退した。

年明け初戦となった3月14日東京のA特ハン、ノーベルは4コーナーで故障を発生し競走を中止。病名は「左主腕前哆開骨折」、翌3月15日に薬殺された。配布価格は55万円、獲得賞金は530万円を超えていた。
`,
        },
      ],
    },
  ],
} as const satisfies Horse

export default ROLL_YOUR_OWN
