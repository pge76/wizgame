import type { ResourceDefinition } from "./ResourceDefinition";
import { PAWN_BANDIT, PAWN_RAT } from "./EnemyPawnDefinitions";

export interface EncounterEntry {
  readonly pawnDefinitionId: string;
  readonly weight: number;
  readonly minCount: number;
  readonly maxCount: number;
}

export interface EncounterTable extends ResourceDefinition {
  readonly entries: readonly EncounterEntry[];
}

export const ENCOUNTER_TEST_ZONE: EncounterTable = {
  id: "encounter.test-zone",
  displayName: "Test Zone Ambush",
  entries: [
    { pawnDefinitionId: PAWN_RAT.id, weight: 3, minCount: 2, maxCount: 4 },
    { pawnDefinitionId: PAWN_BANDIT.id, weight: 2, minCount: 1, maxCount: 2 },
    { pawnDefinitionId: "pawn.stag-weevil", weight: 2, minCount: 1, maxCount: 2 },
    { pawnDefinitionId: "pawn.mino-skeleton", weight: 1, minCount: 1, maxCount: 1 }
  ]
};

const ALL_ENCOUNTER_TABLES: readonly EncounterTable[] = [ENCOUNTER_TEST_ZONE];

export function getEncounterTable(id: string): EncounterTable {
  const table = ALL_ENCOUNTER_TABLES.find((t) => t.id === id);
  if (!table) {
    throw new Error(`No encounter table registered with id "${id}".`);
  }
  return table;
}
