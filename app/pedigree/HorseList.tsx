import { Horse } from '@/types/Horse'
import { HorseData } from '@/types/HorseData'
import roll_your_own from './RollYourOwn'
import florries_cup from './FlorriesCup'
import pedigreeList from '.'

const horseLinkMap: Map<string, HorseData> = new Map()

const createHorseLinkMap = (
  horse: Horse,
  family: string,
  dam: Horse
): Map<string, { name: string; link: string; family: string }> => {
  // HorseLink生成用のMap
  // key: リンク生成用の馬名（一意）
  // value.name: リンク文字列として表示する馬名
  // value.link: リンク先の馬のid
  // value.family: リンク先の馬の牝系
  // const horseLinkMap: Map<string, { name: string; link: string; family: string }> = new Map();

  // key=name, および pedigree_name
  // id_name がある場合は name=key, link=id_name, なければ link=name
  const has_article: boolean = horse.details !== null
  const data: HorseData = {
    name: '',
    link: horse.id,
    family: family,
    horse: horse,
    dam: dam,
    article: has_article,
  }

  // 競走名リンク追加
  if (horse.name) {
    horseLinkMap.set(horse.linkName || horse.name, { ...data, name: horse.name })
  }

  // 血統名リンク追加
  if (horse.pedigreeName) {
    horseLinkMap.set(horse.linkPedigreeName || horse.pedigreeName, {
      ...data,
      name: horse.pedigreeName,
    })
  }

  // 再帰的にchildrenも追加
  if (horse.children) {
    horse.children.forEach((child) => {
      createHorseLinkMap(child, family, horse)
    })
  }
  console.log(horseLinkMap)
  return horseLinkMap
}

// pedigreeListをhorseMapに追加
const mergeHorseLinkMapByPedigree = (
  pedigreeList: Map<string, Horse>
): Map<string, { name: string; link: string; family: string }> => {
  const mergedMap = new Map<string, { name: string; link: string; family: string }>()

  // pedigreeList をループして createHorseLinkMap を呼び出し、それぞれの結果をマージ
  pedigreeList.forEach((horse, family) => {
    const horseLinkMap = createHorseLinkMap(horse, family, horse)

    // 統合: 既存のキーがあれば上書きされる
    horseLinkMap.forEach((value, key) => {
      mergedMap.set(key, value)
    })
  })
  return mergedMap // 統合された Map を返す
}

const mergedHorseLinkMap = mergeHorseLinkMapByPedigree(pedigreeList)

export default mergedHorseLinkMap
