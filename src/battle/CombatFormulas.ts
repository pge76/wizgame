import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import { ItemKind, type ItemDefinition, type WeaponDefinition } from "@data/resources/ItemDefinition";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";

/** Fists: every combatant without an equipped weapon fights with these — there is no separate
 *  flat-formula fallback anymore, just a weak default "weapon". */
export const UNARMED_WEAPON: Pick<WeaponDefinition, "damageMin" | "damageMax" | "attackBonus"> = {
  damageMin: 1,
  damageMax: 2,
  attackBonus: 1
};

/** Armor Class with nothing equipped. */
export const BASE_ARMOR_CLASS = 0;

/** Below this HP fraction, a combatant flees instead of engaging — shared by the player autobattle
 *  AI (Game.resolveMeleeAiTurn) and the Skirmish enemy AI (EnemyAISystem.takeSkirmishTurn). */
export const FLEE_HP_RATIO = 0.3;

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

/** The weapon equipped in RightHand, falling back to LeftHand — undefined if unarmed, in which case
 *  callers should fall back to UNARMED_WEAPON. */
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

/** BASE_ARMOR_CLASS plus the defenseBonus of every equipped armor piece — armor is the only source
 *  of Armor Class, there is no underlying "base defense" stat anymore. */
export function getEffectiveDefense(
  manager: EntityManager,
  itemRegistry: ResourceRegistry<ItemDefinition>,
  entityId: EntityId
): number {
  const equipment = manager.getComponent(entityId, EquipmentComponent);
  if (!equipment) return BASE_ARMOR_CLASS;

  let armorClass = BASE_ARMOR_CLASS;
  for (const slot of ARMOR_SLOTS) {
    const itemId = equipment.slots[slot];
    if (!itemId) continue;
    const item = itemRegistry.get(itemId);
    if (item.kind === ItemKind.Armor) armorClass += item.defenseBonus;
  }
  return armorClass;
}

export function rollDamage(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
