import { Horse } from "@/types/Horse";

interface HorseData {
  name: string;
  link: string;
  family: string;
  horse: Horse;
  dam?: Horse;
  article?: boolean;
}

export type { HorseData }