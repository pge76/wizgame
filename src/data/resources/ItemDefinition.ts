import type { ResourceDefinition } from "./ResourceDefinition";
import type { EquipmentSlot } from "@entities/components/EquipmentComponent";

export enum ItemKind {
  Weapon,
  Armor,
  Misc
}

/** Hand: goes in either EquipmentSlot.LeftHand or EquipmentSlot.RightHand (dual-wieldable).
 *  Ranged: goes in the fixed EquipmentSlot.Ranged slot. */
export enum WeaponSlotKind {
  Hand,
  Ranged
}

/** Silhouette family used to pick the item's icon (ItemIconSvg.ts) — purely visual, no gameplay effect. */
export enum WeaponClass {
  Dagger,
  Sword,
  Blunt,
  Ranged
}

interface BaseItemDefinition extends ResourceDefinition {
  readonly kind: ItemKind;
  readonly stackable: boolean;
}

/** Damage is rolled as `damageMin`-`damageMax` per hit, plus the flat `attackBonus` enchantment
 *  modifier (mirrors Wizardry 7's "(+1)"/"(+2)" notation) — see BattleSystem.resolveMeleeAttack. */
export interface WeaponDefinition extends BaseItemDefinition {
  readonly kind: ItemKind.Weapon;
  readonly slotKind: WeaponSlotKind;
  readonly weaponClass: WeaponClass;
  readonly twoHanded: boolean;
  readonly damageMin: number;
  readonly damageMax: number;
  readonly attackBonus: number;
}

export interface ArmorDefinition extends BaseItemDefinition {
  readonly kind: ItemKind.Armor;
  readonly equipSlot: EquipmentSlot;
  readonly defenseBonus: number;
}

/** Silhouette family for Misc items' icon (ItemIconSvg.ts) — purely visual, no gameplay effect.
 *  A door's requiredItemId match is a plain id comparison and doesn't depend on this. */
export enum MiscItemClass {
  Generic,
  Key
}

export interface MiscItemDefinition extends BaseItemDefinition {
  readonly kind: ItemKind.Misc;
  readonly miscClass: MiscItemClass;
}

export type ItemDefinition = WeaponDefinition | ArmorDefinition | MiscItemDefinition;
