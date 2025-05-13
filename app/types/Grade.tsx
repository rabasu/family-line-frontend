// レースの格付け
// グレード制後はG1~G3を1~3とする
// グレード制以前、および非グレード競走は以下のように定める：
// rank5: 所謂「八大競走」および「十大競走」、中山大障害、帝室御賞典、各種連合競走、非グレード制下の地方主要重賞
// rank6: 障害重賞、各種重賞、「濠抽混合（後の目黒記念）」、重賞級特別競走、非グレード制下の地方重賞
// rank10: 重賞ではないが特筆すべき勝ち鞍 帝国競馬時代の「優勝」「特ハン」、グレード制施行後の地方独自重賞など
export class Grade {
  name: string
  rank: number
  description: string
  isJusho: boolean

  constructor(name: string, rank: number, description: string) {
    this.name = name
    this.rank = rank
    this.description = description
    this.isJusho = rank <= 6
  }
}

export const grades = {
  jra_g1: new Grade('GI', 1, 'JRA G1'),
  jra_g2: new Grade('GII', 2, 'JRA G2'),
  jra_g3: new Grade('GIII', 3, 'JRA G3'),
  jra_new_grade: new Grade('重賞', 4, 'JRA 格付けなし重賞'),
  nar_g1: new Grade('GI', 1, 'NAR 国際G1'),
  nar_jpn1: new Grade('JpnI', 1, 'NAR Jpn1'),
  nar_jpn2: new Grade('JpnII', 2, 'NAR Jpn2'),
  nar_jpn3: new Grade('JpnIII', 3, 'NAR Jpn3'),
  local_grade: new Grade('地方重賞', 7, '地方独自グレード重賞'),
  local_old_big: new Grade('地方重賞', 5, '地方主要重賞競走(~1996)'),
  local_old_grade: new Grade('地方重賞', 6, '地方重賞競走(~1996)'),
  jra_jg1: new Grade('J・GI', 1, 'JRA 障害GI'),
  jra_jg2: new Grade('J・GII', 2, 'JRA 障害GII'),
  jra_jg3: new Grade('J・GIII', 3, 'JRA 障害GIII'),
  jra_big8: new Grade('八大競走', 5, 'JRA八大競走(~1984)'),
  jra_big10: new Grade('旧GI級競走', 5, 'JRA宝塚・エリ女・JC(~1984)'),
  jra_grade: new Grade('重賞', 6, 'JRA重賞競走(~1984)'),
  jra_grandjump: new Grade('大障害競走', 5, 'JRA中山大障害(~1998)'),
  jra_jump: new Grade('障害重賞', 6, 'JRA障害重賞競走(~1998)'),
  national_big8: new Grade('八大競走', 5, '国営競馬八大競走(~1954/09/24)'),
  national_grade: new Grade('重賞', 6, '国営競馬重賞競走(~1954/09/24)'),
  national_grandjump: new Grade('大障害競走', 5, '国営競馬中山大障害(~1954/09/24)'),
  national_jump: new Grade('障害重賞', 6, '国営競馬障害重賞競走(~1954/09/24)'),
  jrs_big8: new Grade('八大競走', 5, '日本競馬会八大競走(~1948/09/10)'),
  jrs_grade: new Grade('重賞', 6, '日本競馬会重賞競走(~1948/09/10)'),
  jrs_grandjump: new Grade('大障害競走', 5, '日本競馬会中山大障害(~1948/09/10)'),
  jrs_jump: new Grade('障害重賞', 6, '日本競馬会障害重賞競走(~1948/09/10)'),
  empire_2mile: new Grade('連合競走', 5, '各種連合競走・横浜特別(~1937)'),
  empire_cup: new Grade('帝室御賞典', 5, '統一前の帝室御賞典(~1937)'),
  empire_derby: new Grade('東京優駿大競走', 5, '日本ダービー(~1937)'),
  empire_2m1f: new Grade('濠抽混合', 5, '所謂二哩一分(~1937)'),
  empire_grade: new Grade('特別競走', 6, '重賞級特別競走(~1937)'),
  empire_cs: new Grade('優勝・特ハン', 7, '優勝および特ハン競走(~1937)'),
  abroad_g1: new Grade('GI', 1, '海外 G1'),
  abroad_g2: new Grade('GII', 2, '海外 G2'),
  abroad_g3: new Grade('GIII', 3, '海外 G3'),
} as const satisfies Record<string, Grade>

export type GradeCode = keyof typeof grades
