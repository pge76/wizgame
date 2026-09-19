import { describe, expect, it } from "vitest";
import { EntityManager } from "@entities/EntityManager";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import { Party } from "@entities/Party";
import { equipItemFromInventory, isHandSlotBlocked, unequipToInventory } from "@entities/EquipmentActions";
import { ItemKind, WeaponClass, WeaponSlotKind, type ItemDefinition } from "@data/resources/ItemDefinition";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";

function weapon(id: string, twoHanded: boolean): ItemDefinition {
  return {
    id,
    displayName: id,
    stackable: false,
    kind: ItemKind.Weapon,
    slotKind: WeaponSlotKind.Hand,
    weaponClass: WeaponClass.Sword,
    twoHanded,
    damageMin: 1,
    damageMax: 4,
    attackBonus: 0
  };
}

function armor(id: string, equipSlot: EquipmentSlot): ItemDefinition {
  return { id, displayName: id, stackable: false, kind: ItemKind.Armor, equipSlot, defenseBonus: 1 };
}

function makeRegistry(): ResourceRegistry<ItemDefinition> {
  const registry = new ResourceRegistry<ItemDefinition>();
  registry.register(weapon("item.sword-a", false));
  registry.register(weapon("item.sword-b", false));
  registry.register(weapon("item.sword-c", false));
  registry.register(weapon("item.claymore", true));
  registry.register(armor("item.helmet", EquipmentSlot.Head));
  registry.register(armor("item.helmet-2", EquipmentSlot.Head));
  return registry;
}

function setup() {
  const manager = new EntityManager();
  const party = new Party();
  const registry = makeRegistry();
  const entityId = manager.createEntity();
  manager.addComponent(entityId, EquipmentComponent, new EquipmentComponent());
  return { manager, party, registry, entityId };
}

describe("equipItemFromInventory", () => {
  it("equips a one-handed weapon into the first empty hand (RightHand preferred)", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.sword-a");

    equipItemFromInventory(manager, registry, party, entityId, 0);

    const equipment = manager.getComponent(entityId, EquipmentComponent)!;
    expect(equipment.slots[EquipmentSlot.RightHand]).toBe("item.sword-a");
    expect(party.getInventory()[0]).toBeNull();
  });

  it("fills LeftHand once RightHand is occupied, then replaces RightHand once both are full", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.sword-a");
    party.setInventorySlot(1, "item.sword-b");
    party.setInventorySlot(2, "item.sword-c");

    equipItemFromInventory(manager, registry, party, entityId, 0);
    equipItemFromInventory(manager, registry, party, entityId, 1);
    equipItemFromInventory(manager, registry, party, entityId, 2);

    const equipment = manager.getComponent(entityId, EquipmentComponent)!;
    expect(equipment.slots[EquipmentSlot.RightHand]).toBe("item.sword-c");
    expect(equipment.slots[EquipmentSlot.LeftHand]).toBe("item.sword-b");
    // The displaced sword-a returns to the inventory slot sword-c came from.
    expect(party.getInventory()[2]).toBe("item.sword-a");
  });

  it("a two-handed weapon takes RightHand and evicts whatever was in LeftHand back to inventory", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.sword-a");
    party.setInventorySlot(1, "item.sword-b");
    party.setInventorySlot(2, "item.claymore");
    equipItemFromInventory(manager, registry, party, entityId, 0); // -> RightHand
    equipItemFromInventory(manager, registry, party, entityId, 1); // -> LeftHand

    equipItemFromInventory(manager, registry, party, entityId, 2); // claymore

    const equipment = manager.getComponent(entityId, EquipmentComponent)!;
    expect(equipment.slots[EquipmentSlot.RightHand]).toBe("item.claymore");
    expect(equipment.slots[EquipmentSlot.LeftHand]).toBeNull();
    // sword-a (displaced from RightHand) returns to slot 2; sword-b (evicted from LeftHand) lands
    // in the next free inventory slot.
    expect(party.getInventory()).toContain("item.sword-a");
    expect(party.getInventory()).toContain("item.sword-b");
  });

  it("blocks LeftHand while a two-handed weapon occupies RightHand", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.claymore");
    equipItemFromInventory(manager, registry, party, entityId, 0);
    const equipment = manager.getComponent(entityId, EquipmentComponent)!;

    expect(isHandSlotBlocked(equipment, registry, EquipmentSlot.LeftHand)).toBe(true);

    party.setInventorySlot(1, "item.sword-a");
    equipItemFromInventory(manager, registry, party, entityId, 1);
    // LeftHand is blocked, so the new weapon replaces RightHand (evicting the claymore) instead.
    expect(equipment.slots[EquipmentSlot.RightHand]).toBe("item.sword-a");
    expect(equipment.slots[EquipmentSlot.LeftHand]).toBeNull();
  });

  it("equips armor into its fixed slot and swaps out whatever was there", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.helmet");
    party.setInventorySlot(1, "item.helmet-2");

    equipItemFromInventory(manager, registry, party, entityId, 0);
    equipItemFromInventory(manager, registry, party, entityId, 1);

    const equipment = manager.getComponent(entityId, EquipmentComponent)!;
    expect(equipment.slots[EquipmentSlot.Head]).toBe("item.helmet-2");
    expect(party.getInventory()[1]).toBe("item.helmet");
  });
});

describe("unequipToInventory", () => {
  it("clears the slot and returns the item to the first free inventory slot", () => {
    const { manager, party, registry, entityId } = setup();
    party.setInventorySlot(0, "item.sword-a");
    equipItemFromInventory(manager, registry, party, entityId, 0);

    unequipToInventory(manager, party, entityId, EquipmentSlot.RightHand);

    const equipment = manager.getComponent(entityId, EquipmentComponent)!;
    expect(equipment.slots[EquipmentSlot.RightHand]).toBeNull();
    expect(party.getInventory()[0]).toBe("item.sword-a");
  });
});
