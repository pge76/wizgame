import { describe, expect, it } from "vitest";
import { EntityManager } from "@entities/EntityManager";
import { TransformComponent } from "@entities/components/TransformComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { Faction } from "@data/resources/PawnDefinition";
import { Grid } from "@world/Grid";
import { ItemKind, WeaponClass, WeaponSlotKind, type ItemDefinition } from "@data/resources/ItemDefinition";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import { BattleSystem } from "@battle/BattleSystem";
import { BattleState } from "@battle/BattleState";
import { getEffectiveDefense, getEquippedWeapon, rollDamage, UNARMED_WEAPON } from "@battle/CombatFormulas";

const TEST_DAGGER: ItemDefinition = {
  id: "test.dagger",
  displayName: "Test Dagger",
  stackable: false,
  kind: ItemKind.Weapon,
  slotKind: WeaponSlotKind.Hand,
  weaponClass: WeaponClass.Dagger,
  twoHanded: false,
  damageMin: 2,
  damageMax: 4,
  attackBonus: 1
};

const TEST_ARMOR: ItemDefinition = {
  id: "test.armor",
  displayName: "Test Armor",
  stackable: false,
  kind: ItemKind.Armor,
  equipSlot: EquipmentSlot.Torso,
  defenseBonus: 3
};

const TEST_HEAVY_ARMOR: ItemDefinition = {
  id: "test.heavy-armor",
  displayName: "Test Heavy Armor",
  stackable: false,
  kind: ItemKind.Armor,
  equipSlot: EquipmentSlot.Torso,
  defenseBonus: 999
};

function makeRegistry(): ResourceRegistry<ItemDefinition> {
  const registry = new ResourceRegistry<ItemDefinition>();
  registry.register(TEST_DAGGER);
  registry.register(TEST_ARMOR);
  registry.register(TEST_HEAVY_ARMOR);
  return registry;
}

describe("rollDamage", () => {
  it("stays within [min, max] inclusive across many rolls", () => {
    for (let i = 0; i < 200; i++) {
      const roll = rollDamage(2, 5);
      expect(roll).toBeGreaterThanOrEqual(2);
      expect(roll).toBeLessThanOrEqual(5);
    }
  });
});

describe("getEquippedWeapon", () => {
  it("returns undefined when unarmed, finds a weapon in RightHand or LeftHand", () => {
    const manager = new EntityManager();
    const registry = makeRegistry();
    const id = manager.createEntity();
    const equipment = new EquipmentComponent();
    manager.addComponent(id, EquipmentComponent, equipment);

    expect(getEquippedWeapon(manager, registry, id)).toBeUndefined();

    equipment.slots[EquipmentSlot.LeftHand] = TEST_DAGGER.id;
    expect(getEquippedWeapon(manager, registry, id)?.id).toBe(TEST_DAGGER.id);

    equipment.slots[EquipmentSlot.RightHand] = TEST_DAGGER.id;
    expect(getEquippedWeapon(manager, registry, id)?.id).toBe(TEST_DAGGER.id);
  });
});

describe("getEffectiveDefense", () => {
  it("is 0 (BASE_ARMOR_CLASS) with no armor equipped, regardless of StatsComponent.defense", () => {
    const manager = new EntityManager();
    const registry = makeRegistry();
    const id = manager.createEntity();
    manager.addComponent(id, StatsComponent, new StatsComponent(10, 10, 5, 2, 5));
    const equipment = new EquipmentComponent();
    manager.addComponent(id, EquipmentComponent, equipment);

    expect(getEffectiveDefense(manager, registry, id)).toBe(0);

    equipment.slots[EquipmentSlot.Torso] = TEST_ARMOR.id;
    expect(getEffectiveDefense(manager, registry, id)).toBe(3);
  });
});

describe("BattleSystem.resolveMeleeAttack", () => {
  interface Combatants {
    manager: EntityManager;
    grid: Grid;
    system: BattleSystem;
    attackerId: number;
    targetId: number;
    damages: number[];
  }

  function setupCombatants(equipAttackerWeapon: boolean, targetArmorId?: string): Combatants {
    const manager = new EntityManager();
    const registry = makeRegistry();
    const grid = new Grid(3, 3, "tile.floor");
    const state = new BattleState();
    const damages: number[] = [];
    const system = new BattleSystem(
      state,
      registry,
      () => {},
      (_attackerId, _targetId, _attackStat, _defenseStat, damage) => damages.push(damage)
    );

    const attackerId = manager.createEntity();
    manager.addComponent(attackerId, TransformComponent, new TransformComponent({ x: 1, y: 1 }));
    manager.addComponent(attackerId, StatsComponent, new StatsComponent(20, 20, 5, 2, 6));
    manager.addComponent(attackerId, FactionComponent, new FactionComponent(Faction.PC));
    manager.addComponent(attackerId, BattleParticipantComponent, new BattleParticipantComponent());
    const attackerEquipment = new EquipmentComponent();
    if (equipAttackerWeapon) attackerEquipment.slots[EquipmentSlot.RightHand] = TEST_DAGGER.id;
    manager.addComponent(attackerId, EquipmentComponent, attackerEquipment);
    grid.getCell({ x: 1, y: 1 }).occupantEntityId = attackerId;

    const targetId = manager.createEntity();
    manager.addComponent(targetId, TransformComponent, new TransformComponent({ x: 1, y: 2 }));
    manager.addComponent(targetId, StatsComponent, new StatsComponent(999, 999, 3, 1, 4));
    manager.addComponent(targetId, FactionComponent, new FactionComponent(Faction.Monster));
    manager.addComponent(targetId, BattleParticipantComponent, new BattleParticipantComponent());
    const targetEquipment = new EquipmentComponent();
    if (targetArmorId) targetEquipment.slots[EquipmentSlot.Torso] = targetArmorId;
    manager.addComponent(targetId, EquipmentComponent, targetEquipment);
    grid.getCell({ x: 1, y: 2 }).occupantEntityId = targetId;

    return { manager, grid, system, attackerId, targetId, damages };
  }

  it("rolls the UNARMED_WEAPON dice when the attacker has no weapon equipped", () => {
    const { manager, grid, system, attackerId, targetId, damages } = setupCombatants(false);

    for (let i = 0; i < 50; i++) {
      system.resolveMeleeAttack(manager, attackerId, targetId, grid);
    }

    // UNARMED_WEAPON roll 1-2 + attackBonus 1 = 2-3, minus target's (unarmored, so 0) defense = 2-3.
    for (const damage of damages) {
      expect(damage).toBeGreaterThanOrEqual(UNARMED_WEAPON.damageMin + UNARMED_WEAPON.attackBonus);
      expect(damage).toBeLessThanOrEqual(UNARMED_WEAPON.damageMax + UNARMED_WEAPON.attackBonus);
    }
    expect(manager.getComponent(targetId, StatsComponent)!.currentHP).toBe(999 - damages.reduce((a, b) => a + b, 0));
  });

  it("rolls weapon damage dice + attackBonus, mitigated by effective defense, when armed", () => {
    const { manager, grid, system, attackerId, targetId, damages } = setupCombatants(true);

    for (let i = 0; i < 50; i++) {
      system.resolveMeleeAttack(manager, attackerId, targetId, grid);
    }

    // weapon roll 2-4 + attackBonus 1 = 3-5, minus target's (unarmored, so 0) defense = 3-5.
    for (const damage of damages) {
      expect(damage).toBeGreaterThanOrEqual(3);
      expect(damage).toBeLessThanOrEqual(5);
    }
    // Confirm it's actually rolling (not a constant) across enough samples.
    expect(new Set(damages).size).toBeGreaterThan(1);
  });

  it("armor on the target lowers damage by its defenseBonus", () => {
    const { manager, grid, system, attackerId, targetId, damages } = setupCombatants(true, TEST_ARMOR.id);

    for (let i = 0; i < 50; i++) {
      system.resolveMeleeAttack(manager, attackerId, targetId, grid);
    }

    // weapon roll 3-5, minus TEST_ARMOR's defenseBonus (3) = 0-2, floored at 1.
    for (const damage of damages) {
      expect(damage).toBeGreaterThanOrEqual(1);
      expect(damage).toBeLessThanOrEqual(2);
    }
  });

  it("never deals less than 1 damage even against very high armor", () => {
    const { manager, grid, system, attackerId, targetId, damages } = setupCombatants(true, TEST_HEAVY_ARMOR.id);

    const ok = system.resolveMeleeAttack(manager, attackerId, targetId, grid);
    expect(ok).toBe(true);
    expect(damages[0]).toBe(1);
  });
});
