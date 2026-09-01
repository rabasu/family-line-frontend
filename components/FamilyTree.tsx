import FamilyTreeView from './FamilyTreeView'
import { loadFamilyRoot } from 'app/lib/traditional-family-loader'

const FamilyTree = ({ name }: { name: string }): JSX.Element => {
  const horse = loadFamilyRoot(name)
  if (!horse) return <div>pedigreeが存在しません; ${name}</div>

  return <FamilyTreeView horse={horse} />
}

export default FamilyTree
