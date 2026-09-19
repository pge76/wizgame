import type { GridPos } from "@world/Coordinates";

const DOOR_RATIO = 0.5;
const LOCKED_RATIO = 0.1;

export interface DoorPlacement {
  readonly pos: GridPos;
  readonly locked: boolean;
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Picks DOOR_RATIO (50%) of `gapPositions` to become doors, and LOCKED_RATIO (10%) of those to be
 *  locked — both exact rounded fractions of a randomly shuffled selection, not independent
 *  per-tile coin flips, so the overall proportions stay close to the design ratios regardless of
 *  how many gaps the map has. */
export function generateDoorPlacements(gapPositions: readonly GridPos[]): DoorPlacement[] {
  const shuffled = shuffle(gapPositions);
  const doorCount = Math.round(shuffled.length * DOOR_RATIO);
  const doorGaps = shuffled.slice(0, doorCount);
  const lockedCount = Math.round(doorGaps.length * LOCKED_RATIO);

  return doorGaps.map((pos, index) => ({ pos, locked: index < lockedCount }));
}
