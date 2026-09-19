import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { ItemKind, type ItemDefinition, type WeaponDefinition } from "@data/resources/ItemDefinition";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";

const ARMOR_SLOTS = [
  EquipmentSlot.Head,
  EquipmentSlot.Torso,
  EquipmentSlot.Legs,
  EquipmentSlot.Cloak,
  EquipmentSlot.Gloves,
  EquipmentSlot.Boots,
  EquipmentSlot.Ring,
  EquipmentSlot.Neck
];

/** The weapon equipped in RightHand, falling back to LeftHand — undefined for unarmed combatants
 *  (all current monsters), who keep using the flat StatsComponent.attack/defense formula. */
export function getEquippedWeapon(
  manager: EntityManager,
  itemRegistry: ResourceRegistry<ItemDefinition>,
  entityId: EntityId
): WeaponDefinition | undefined {
  const equipment = manager.getComponent(entityId, EquipmentComponent);
  if (!equipment) return undefined;

  for (const slot of [EquipmentSlot.RightHand, EquipmentSlot.LeftHand]) {
    const itemId = equipment.slots[slot];
    if (!itemId) continue;
    const item = itemRegistry.get(itemId);
    if (item.kind === ItemKind.Weapon) return item;
  }
  return undefined;
}

/** Base defense plus the defenseBonus of every equipped armor piece. */
export function getEffectiveDefense(
  manager: EntityManager,
  itemRegistry: ResourceRegistry<ItemDefinition>,
  entityId: EntityId
): number {
  const baseDefense = manager.getComponent(entityId, StatsComponent)?.defense ?? 0;
  const equipment = manager.getComponent(entityId, EquipmentComponent);
  if (!equipment) return baseDefense;

  let bonus = 0;
  for (const slot of ARMOR_SLOTS) {
    const itemId = equipment.slots[slot];
    if (!itemId) continue;
    const item = itemRegistry.get(itemId);
    if (item.kind === ItemKind.Armor) bonus += item.defenseBonus;
  }
  return baseDefense + bonus;
}

export function rollDamage(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
