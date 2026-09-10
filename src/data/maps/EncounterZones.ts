import { ENCOUNTER_TEST_ZONE } from "@data/resources/EncounterTable";

export interface EncounterZone {
  readonly id: string;
  readonly bounds: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  readonly encounterTableId: string;
}

export const TEST_ENCOUNTER_ZONES: EncounterZone[] = [
  {
    id: "zone.grass-field",
    bounds: { x0: 5, y0: 5, x1: 15, y1: 15 },
    encounterTableId: ENCOUNTER_TEST_ZONE.id
  }
];
