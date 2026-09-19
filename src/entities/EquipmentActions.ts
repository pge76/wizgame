import type { EntityManager } from "./EntityManager";
import type { EntityId } from "./Entity";
import { EquipmentComponent, EquipmentSlot } from "./components/EquipmentComponent";
import type { Party } from "./Party";
import { ItemKind, WeaponSlotKind, type ItemDefinition } from "@data/resources/ItemDefinition";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";

/** True if `slot` can't currently hold anything because a two-handed weapon in the other hand
 *  slot occupies it. Only ever true for LeftHand. */
export function isHandSlotBlocked(
  equipment: EquipmentComponent,
  itemRegistry: ResourceRegistry<ItemDefinition>,
  slot: EquipmentSlot
): boolean {
  if (slot !== EquipmentSlot.LeftHand) return false;
  const rightItemId = equipment.slots[EquipmentSlot.RightHand];
  if (!rightItemId) return false;
  const rightItem = itemRegistry.get(rightItemId);
  return rightItem.kind === ItemKind.Weapon && rightItem.twoHanded;
}

/** Moves `itemId` into the first free party inventory slot. Silently drops it if the inventory is full. */
function returnToInventory(party: Party, itemId: string): void {
  const inventory = party.getInventory();
  const freeSlot = inventory.indexOf(null);
  if (freeSlot !== -1) party.setInventorySlot(freeSlot, itemId);
}

/**
 * Equips the item sitting in party inventory slot `inventorySlot` onto `entityId`. Weapons go into
 * an empty hand (preferring RightHand), or replace RightHand if both are occupied/blocked; a
 * two-handed weapon evicts whatever's in LeftHand first. Armor goes into its one fixed slot.
 * Whatever was equipped in the target slot returns to `inventorySlot`. No-op for Misc items or
 * unknown/empty slots.
 */
export function equipItemFromInventory(
  manager: EntityManager,
  itemRegistry: ResourceRegistry<ItemDefinition>,
  party: Party,
  entityId: EntityId,
  inventorySlot: number
): void {
  const itemId = party.getInventory()[inventorySlot];
  if (!itemId || !itemRegistry.has(itemId)) return;

  const item = itemRegistry.get(itemId);
  const equipment = manager.getComponent(entityId, EquipmentComponent);
  if (!equipment || item.kind === ItemKind.Misc) return;

  let targetSlot: EquipmentSlot;
  if (item.kind === ItemKind.Weapon) {
    if (item.slotKind === WeaponSlotKind.Ranged) {
      targetSlot = EquipmentSlot.Ranged;
    } else {
      const rightFree = !equipment.slots[EquipmentSlot.RightHand];
      const leftFree = !equipment.slots[EquipmentSlot.LeftHand] && !isHandSlotBlocked(equipment, itemRegistry, EquipmentSlot.LeftHand);
      targetSlot = rightFree || !leftFree ? EquipmentSlot.RightHand : EquipmentSlot.LeftHand;

      if (item.twoHanded && targetSlot === EquipmentSlot.RightHand) {
        const displacedLeft = equipment.slots[EquipmentSlot.LeftHand];
        if (displacedLeft) returnToInventory(party, displacedLeft);
        equipment.slots[EquipmentSlot.LeftHand] = null;
      }
    }
  } else {
    targetSlot = item.equipSlot;
  }

  const previousItemId = equipment.slots[targetSlot] ?? null;
  equipment.slots[targetSlot] = itemId;
  party.setInventorySlot(inventorySlot, previousItemId);
}

/** Unequips whatever is in `slot` on `entityId` back into the first free party inventory slot. */
export function unequipToInventory(manager: EntityManager, party: Party, entityId: EntityId, slot: EquipmentSlot): void {
  const equipment = manager.getComponent(entityId, EquipmentComponent);
  const itemId = equipment?.slots[slot];
  if (!equipment || !itemId) return;

  equipment.slots[slot] = null;
  returnToInventory(party, itemId);
}
