import type { Breed } from '@/types/Breed'
import type { Sex } from '@/types/Horse'

export type RaceResultInput = {
  race: string
  displayRace: string
  year: string
  month: string
  day: string
  grade: string
  racecourse: string
  distance: string
  entry: string
  favorite: string
  result: string
}

export type EditorSubject = {
  name: string
  englishName: string
  pedigreeName: string
  formerName: string
  localName: string
  formerPedigreeName: string
  color: string
  breed: Breed | ''
  breeder: string
  importedYear: string
  importedBy: string
  familyNumber: string
  registration: string
  owner: string
  foaledYear: string
  foaledMonth: string
  foaledDay: string
  netkeibaId: string
  pedigreeQueryId: string
  allBreedPedigreeId: string
  id: string
  sex: Sex | ''
  source: string
  comment: string
  raceStatsRuns: string
  raceStatsWins: string
  raceResults: RaceResultInput[]
}

export function emptyRaceResult(): RaceResultInput {
  return {
    race: '',
    displayRace: '',
    year: '',
    month: '',
    day: '',
    grade: '',
    racecourse: '',
    distance: '',
    entry: '',
    favorite: '',
    result: '',
  }
}

export function emptySubject(): EditorSubject {
  return {
    name: '',
    englishName: '',
    pedigreeName: '',
    formerName: '',
    localName: '',
    formerPedigreeName: '',
    color: '',
    breed: '',
    breeder: '',
    importedYear: '',
    importedBy: '',
    familyNumber: '',
    registration: '',
    owner: '',
    foaledYear: '',
    foaledMonth: '',
    foaledDay: '',
    netkeibaId: '',
    pedigreeQueryId: '',
    allBreedPedigreeId: '',
    id: '',
    sex: '',
    source: '',
    comment: '',
    raceStatsRuns: '',
    raceStatsWins: '',
    raceResults: [],
  }
}
