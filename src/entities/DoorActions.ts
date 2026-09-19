import { DoorComponent } from "./components/DoorComponent";

/** Tries to open `door` given the party's current inventory; mutates `door.isOpen` and returns
 *  whether it actually opened. A door with no requiredItemId always opens. Already-open doors are
 *  reported as opened (idempotent) — callers should still check isOpen first to avoid redundant work. */
export function tryOpenDoor(door: DoorComponent, inventory: readonly (string | null)[]): boolean {
  if (door.isOpen) return true;
  if (door.requiredItemId !== null && !inventory.includes(door.requiredItemId)) return false;

  door.isOpen = true;
  return true;
}
