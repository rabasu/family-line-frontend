// レースの格付け
// グレード制後はG1~G3を1~3とする
// グレード制以前、および非グレード競走は以下のように定める：
// rank1: 所謂「八大競走」および「十大競走」、中山大障害、帝室御賞典（統一前）、各種連合競走
// rank2: 障害重賞、各種重賞、「濠抽混合（後の目黒記念）」
// rank3: 帝国競馬時代の重賞級特別競走
// rank5: 重賞ではないが特筆すべき勝ち鞍  帝国競馬時代の「優勝」、地方独自重賞など
export type Grade = {
  name: string;
  rank: number;
  description: string;
};

export const grades = {
  jra_g1: { name: "GI", rank: 1, description: "JRA G1" },
  jra_g2: { name: "GII", rank: 2, description: "JRA G2" },
  jra_g3: { name: "GIII", rank: 3, description: "JRA G3" },
  jra_new_grade: { name: "重賞", rank: 4, description: "JRA 格付けなし重賞" },
  nar_g1: { name: "GI", rank: 1, description: "NAR 国際G1" },
  nar_jpn1: { name: "JpnI", rank: 1, description: "NAR Jpn1" },
  nar_jpn2: { name: "JpnII", rank: 2, description: "NAR Jpn2" },
  nar_jpn3: { name: "JpnIII", rank: 3, description: "NAR Jpn3" },
  local_grade: { name: "地方重賞", rank: 5, description: "地方独自グレード重賞" },
  jra_jg1: { name: "J・GI", rank: 1, description: "JRA 障害GI" },
  jra_jg2: { name: "J・GII", rank: 2, description: "JRA 障害GII" },
  jra_jg3: { name: "J・GIII", rank: 3, description: "JRA 障害GIII" },
  jra_big8: { name: "八大競走", rank: 1, description: "JRA八大競走(~1984)" },
  jra_big10: { name: "旧GI級競走", rank: 1, description: "JRA宝塚・エリ女・JC(~1984)" },
  jra_grade: { name: "重賞", rank: 2, description: "JRA重賞競走(~1984)" },
  jra_grandjump: { name: "大障害競走", rank: 1, description: "JRA中山大障害(~1998)" },
  jra_jump: { name: "障害重賞", rank: 2, description: "JRA障害重賞競走(~1998)" },
  jrs_big8: { name: "八大競走", rank: 1, description: "日本競馬会八大競走(~1954)" },
  jrs_grade: { name: "重賞", rank: 2, description: "日本競馬会重賞競走(~1954)" },
  jrs_grandjump: { name: "大障害競走", rank: 1, description: "日本競馬会中山大障害(~1954)" },
  jrs_jump: { name: "障害重賞", rank: 2, description: "日本競馬会障害重賞競走(~1954)" },
  empire_2mile: { name: "連合競走", rank: 1, description: "各種連合競走(~1937)" },
  empire_cup: { name: "帝室御賞典", rank: 1, description: "統一前の帝室御賞典(~1937)" },
  empire_derby: { name: "東京優駿大競走", rank: 1, description: "日本ダービー(~1937)" },
  empire_2m1f: { name: "濠抽混合", rank: 2, description: "所謂二哩一分(~1937)" },
  empire_grade: { name: "特別競走", rank: 3, description: "重賞級特別競走(~1937)" },
  empire_cs: { name: "優勝・特ハン", rank: 5, description: "優勝および特ハン競走(~1937)" },
  abroad_g1: { name: "GI", rank: 1, description: "海外 G1" },
  abroad_g2: { name: "GII", rank: 2, description: "海外 G2" },
  abroad_g3: { name: "GIII", rank: 3, description: "海外 G3" },
} as const satisfies Record<string, Grade>;

export type GradeCode = keyof typeof grades;
