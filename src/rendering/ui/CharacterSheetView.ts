import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import type { Party } from "@entities/Party";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { ExperienceComponent } from "@entities/components/ExperienceComponent";
import { EquipmentComponent, EquipmentSlot } from "@entities/components/EquipmentComponent";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { PawnDefinition } from "@data/resources/PawnDefinition";
import { ItemKind, type ItemDefinition } from "@data/resources/ItemDefinition";
import { getEffectiveDefense, getEquippedWeapon } from "@battle/CombatFormulas";
import { buildFullPortraitSvg } from "./PortraitSvg";

/** "Dagger (1-4)", "Rapier (1-7+1)", "Leather Armor (+2)" — compact stat suffix per item kind. */
function formatItemLabel(item: ItemDefinition): string {
  switch (item.kind) {
    case ItemKind.Weapon: {
      const bonus = item.attackBonus > 0 ? `+${item.attackBonus}` : "";
      return `${item.displayName} (${item.damageMin}-${item.damageMax}${bonus})`;
    }
    case ItemKind.Armor:
      return `${item.displayName} (+${item.defenseBonus})`;
    case ItemKind.Misc:
      return item.displayName;
  }
}

const LEFT_SLOTS = [EquipmentSlot.Head, EquipmentSlot.Neck, EquipmentSlot.Cloak, EquipmentSlot.Torso, EquipmentSlot.Legs];
const RIGHT_SLOTS = [EquipmentSlot.Ring, EquipmentSlot.Gloves, EquipmentSlot.Boots, EquipmentSlot.Ranged, EquipmentSlot.Munition];
const HAND_SLOTS = [EquipmentSlot.LeftHand, EquipmentSlot.RightHand];

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.Head]: "Head",
  [EquipmentSlot.Torso]: "Torso",
  [EquipmentSlot.Legs]: "Legs",
  [EquipmentSlot.Cloak]: "Cloak",
  [EquipmentSlot.Gloves]: "Gloves",
  [EquipmentSlot.Boots]: "Boots",
  [EquipmentSlot.Ring]: "Ring",
  [EquipmentSlot.LeftHand]: "L. Hand",
  [EquipmentSlot.RightHand]: "R. Hand",
  [EquipmentSlot.Ranged]: "Ranged",
  [EquipmentSlot.Munition]: "Munition",
  [EquipmentSlot.Neck]: "Neck"
};

/** Centered overlay showing one party member's portrait, equipment paperdoll, and stats.
 *
 *  Equipment and inventory slot elements are built once and updated in place on `sync()`, rather
 *  than being torn down and rebuilt every frame (`sync()` runs on every render tick while visible):
 *  rebuilding would detach their click listeners mid-gesture on a slow tap/click, the same class of
 *  bug the persistent close button already works around. */
export class CharacterSheetView {
  readonly element: HTMLDivElement;
  private entityId: EntityId | null = null;
  private readonly panel: HTMLDivElement;
  private readonly portraitWrap: HTMLDivElement;
  private readonly statsColumn: HTMLDivElement;
  private readonly equipSlotElements = new Map<EquipmentSlot, HTMLDivElement>();
  private readonly inventorySlotElements: HTMLDivElement[];

  constructor(
    private readonly manager: EntityManager,
    private readonly pawnRegistry: ResourceRegistry<PawnDefinition>,
    private readonly itemRegistry: ResourceRegistry<ItemDefinition>,
    private readonly party: Party,
    private readonly onEquipFromInventory: (entityId: EntityId, inventorySlot: number) => void,
    private readonly onUnequip: (entityId: EntityId, slot: EquipmentSlot) => void
  ) {
    this.element = document.createElement("div");
    this.element.className = "character-sheet";
    this.element.hidden = true;

    this.panel = document.createElement("div");
    this.panel.className = "character-sheet__panel";
    this.panel.appendChild(this.buildCloseButton());

    const scroll = document.createElement("div");
    scroll.className = "character-sheet__scroll";
    this.panel.appendChild(scroll);

    const body = document.createElement("div");
    body.className = "character-sheet__body";
    scroll.appendChild(body);

    this.portraitWrap = document.createElement("div");
    this.portraitWrap.className = "character-sheet__portrait-wrap";

    const portraitColumn = document.createElement("div");
    portraitColumn.className = "character-sheet__portrait-column";
    portraitColumn.appendChild(this.buildSlotList(LEFT_SLOTS));
    portraitColumn.appendChild(this.portraitWrap);
    portraitColumn.appendChild(this.buildSlotList(RIGHT_SLOTS));

    const hands = document.createElement("div");
    hands.className = "character-sheet__hand-slots";
    for (const slot of HAND_SLOTS) hands.appendChild(this.createEquipSlotElement(slot));
    portraitColumn.appendChild(hands);
    body.appendChild(portraitColumn);

    this.statsColumn = document.createElement("div");
    this.statsColumn.className = "character-sheet__stats-column";
    body.appendChild(this.statsColumn);

    const inventory = document.createElement("div");
    inventory.className = "character-sheet__inventory";
    this.inventorySlotElements = this.party
      .getInventory()
      .map((_itemId, inventorySlot) => this.createInventorySlotElement(inventorySlot));
    inventory.append(...this.inventorySlotElements);
    scroll.appendChild(inventory);

    this.element.appendChild(this.panel);

    this.element.addEventListener("click", (event) => {
      if (event.target === this.element) this.hide();
    });
  }

  show(id: EntityId): void {
    this.entityId = id;
    this.element.hidden = false;
    this.sync();
  }

  hide(): void {
    this.entityId = null;
    this.element.hidden = true;
  }

  isVisible(): boolean {
    return !this.element.hidden;
  }

  /** Re-renders the currently open sheet's dynamic content. No-op while hidden. */
  sync(): void {
    if (this.entityId === null) return;
    const id = this.entityId;

    const pawn = this.manager.getComponent(id, PawnComponent);
    const appearance = this.manager.getComponent(id, AppearanceComponent);
    const stats = this.manager.getComponent(id, StatsComponent);
    const experience = this.manager.getComponent(id, ExperienceComponent);
    const equipment = this.manager.getComponent(id, EquipmentComponent);
    if (!pawn || !appearance || !stats) {
      this.hide();
      return;
    }

    const attributes = this.pawnRegistry.get(pawn.pawnDefinitionId).attributes;

    this.portraitWrap.replaceChildren(buildFullPortraitSvg(appearance.appearance));
    this.syncStatsColumn(id, stats, experience, attributes);

    for (const [slot, slotEl] of this.equipSlotElements) {
      this.syncSlotElement(slotEl, equipment?.slots[slot] ?? null, SLOT_LABELS[slot]);
    }

    const inventoryItemIds = this.party.getInventory();
    this.inventorySlotElements.forEach((slotEl, index) => {
      this.syncSlotElement(slotEl, inventoryItemIds[index] ?? null, "");
    });
  }

  /** Applies the current item (or empty placeholder) to an already-built slot element. */
  private syncSlotElement(slotEl: HTMLDivElement, itemId: string | null, emptyLabel: string): void {
    const item = itemId && this.itemRegistry.has(itemId) ? this.itemRegistry.get(itemId) : null;
    slotEl.textContent = item ? formatItemLabel(item) : emptyLabel;
    slotEl.classList.toggle("character-sheet__slot--empty", !item);
    slotEl.classList.toggle("character-sheet__slot--interactive", item !== null && item.kind !== ItemKind.Misc);
  }

  private buildCloseButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "character-sheet__close";
    button.textContent = "×";
    button.addEventListener("click", () => this.hide());
    return button;
  }

  private buildSlotList(slots: EquipmentSlot[]): HTMLDivElement {
    const list = document.createElement("div");
    list.className = "character-sheet__slot-list";
    for (const slot of slots) list.appendChild(this.createEquipSlotElement(slot));
    return list;
  }

  /** Built once per paperdoll slot; content is filled in later by sync()/syncSlotElement(). */
  private createEquipSlotElement(slot: EquipmentSlot): HTMLDivElement {
    const slotEl = document.createElement("div");
    slotEl.className = "character-sheet__slot character-sheet__slot--empty";
    slotEl.textContent = SLOT_LABELS[slot];
    slotEl.addEventListener("click", () => {
      if (this.entityId !== null) this.onUnequip(this.entityId, slot);
    });
    this.equipSlotElements.set(slot, slotEl);
    return slotEl;
  }

  /** Built once per party inventory slot; content is filled in later by sync()/syncSlotElement().
   *  Tapping an equippable item equips it onto the open character straight away (destination slot
   *  picked automatically). */
  private createInventorySlotElement(inventorySlot: number): HTMLDivElement {
    const slotEl = document.createElement("div");
    slotEl.className = "character-sheet__slot character-sheet__slot--empty";
    slotEl.addEventListener("click", () => {
      if (this.entityId !== null) this.onEquipFromInventory(this.entityId, inventorySlot);
    });
    return slotEl;
  }

  private syncStatsColumn(
    entityId: EntityId,
    stats: StatsComponent,
    experience: ExperienceComponent | undefined,
    attributes: PawnDefinition["attributes"]
  ): void {
    const effectiveDefense = getEffectiveDefense(this.manager, this.itemRegistry, entityId);
    const armorBonus = effectiveDefense - stats.defense;
    const armorClassLabel = armorBonus > 0 ? `${effectiveDefense} (+${armorBonus})` : `${effectiveDefense}`;

    const weapon = getEquippedWeapon(this.manager, this.itemRegistry, entityId);
    const damageLabel = weapon
      ? `${weapon.damageMin}-${weapon.damageMax}${weapon.attackBonus > 0 ? `+${weapon.attackBonus}` : ""}`
      : "Unarmed";

    const rows: [string, string][] = [
      ["Hit Points", `${stats.currentHP} / ${stats.maxHP}`],
      ["Damage", damageLabel],
      ["Armor Class", armorClassLabel]
    ];
    if (experience) {
      rows.push(["Experience", `${experience.currentExp}`], ["Next Level", `${experience.expToNextLevel}`]);
    }

    this.statsColumn.replaceChildren(...rows.map(([label, value]) => this.buildStatRow(label, value)));

    if (attributes) {
      const divider = document.createElement("hr");
      divider.className = "character-sheet__divider";
      this.statsColumn.appendChild(divider);

      this.statsColumn.append(
        this.buildStatRow("Level", `${attributes.level}`),
        this.buildStatRow("Strength", `${attributes.strength}`),
        this.buildStatRow("Intelligence", `${attributes.intelligence}`),
        this.buildStatRow("Piety", `${attributes.piety}`),
        this.buildStatRow("Vitality", `${attributes.vitality}`),
        this.buildStatRow("Dexterity", `${attributes.dexterity}`),
        this.buildStatRow("Speed", `${attributes.speed}`),
        this.buildStatRow("Senses", `${attributes.senses}`)
      );
    }
  }

  private buildStatRow(label: string, value: string): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "character-sheet__stat-row";
    const labelEl = document.createElement("span");
    labelEl.className = "character-sheet__stat-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.className = "character-sheet__stat-value";
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    return row;
  }
}
