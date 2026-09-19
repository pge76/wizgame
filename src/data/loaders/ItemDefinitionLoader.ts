import { ItemKind, WeaponSlotKind, type ItemDefinition } from "@data/resources/ItemDefinition";
import { EquipmentSlot } from "@entities/components/EquipmentComponent";

interface BaseItemJson {
  readonly id: string;
  readonly displayName: string;
  readonly stackable: boolean;
}

interface WeaponJson extends BaseItemJson {
  readonly kind: "weapon";
  readonly slotKind: "hand" | "ranged";
  readonly twoHanded: boolean;
  readonly damageMin: number;
  readonly damageMax: number;
  readonly attackBonus: number;
}

type ArmorEquipSlotName = "head" | "torso" | "legs" | "cloak" | "gloves" | "boots" | "ring" | "neck";

interface ArmorJson extends BaseItemJson {
  readonly kind: "armor";
  readonly equipSlot: ArmorEquipSlotName;
  readonly defenseBonus: number;
}

interface MiscJson extends BaseItemJson {
  readonly kind: "misc";
}

type ItemJson = WeaponJson | ArmorJson | MiscJson;

const WEAPON_SLOT_KIND_BY_NAME: Record<WeaponJson["slotKind"], WeaponSlotKind> = {
  hand: WeaponSlotKind.Hand,
  ranged: WeaponSlotKind.Ranged
};

const ARMOR_EQUIP_SLOT_BY_NAME: Record<ArmorEquipSlotName, EquipmentSlot> = {
  head: EquipmentSlot.Head,
  torso: EquipmentSlot.Torso,
  legs: EquipmentSlot.Legs,
  cloak: EquipmentSlot.Cloak,
  gloves: EquipmentSlot.Gloves,
  boots: EquipmentSlot.Boots,
  ring: EquipmentSlot.Ring,
  neck: EquipmentSlot.Neck
};

function toItemDefinition(json: ItemJson): ItemDefinition {
  switch (json.kind) {
    case "weapon": {
      const slotKind = WEAPON_SLOT_KIND_BY_NAME[json.slotKind];
      if (slotKind === undefined) {
        throw new Error(`Unknown weapon slotKind "${json.slotKind}" in item definition "${json.id}".`);
      }
      return {
        id: json.id,
        displayName: json.displayName,
        stackable: json.stackable,
        kind: ItemKind.Weapon,
        slotKind,
        twoHanded: json.twoHanded,
        damageMin: json.damageMin,
        damageMax: json.damageMax,
        attackBonus: json.attackBonus
      };
    }
    case "armor": {
      const equipSlot = ARMOR_EQUIP_SLOT_BY_NAME[json.equipSlot];
      if (equipSlot === undefined) {
        throw new Error(`Unknown armor equipSlot "${json.equipSlot}" in item definition "${json.id}".`);
      }
      return {
        id: json.id,
        displayName: json.displayName,
        stackable: json.stackable,
        kind: ItemKind.Armor,
        equipSlot,
        defenseBonus: json.defenseBonus
      };
    }
    case "misc":
      return {
        id: json.id,
        displayName: json.displayName,
        stackable: json.stackable,
        kind: ItemKind.Misc
      };
  }
}

const itemModules = import.meta.glob("../resources/items/*.json", { eager: true }) as Record<
  string,
  { default: ItemJson }
>;

/** All item ItemDefinitions found under src/data/resources/items/*.json. */
export const ITEM_DEFINITIONS: readonly ItemDefinition[] = Object.values(itemModules).map((module) =>
  toItemDefinition(module.default)
);
