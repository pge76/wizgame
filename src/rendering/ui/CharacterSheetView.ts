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
import { buildFullPortraitSvg } from "./PortraitSvg";

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

/** Centered overlay showing one party member's portrait, equipment paperdoll, and stats. */
export class CharacterSheetView {
  readonly element: HTMLDivElement;
  private entityId: EntityId | null = null;
  private readonly panel: HTMLDivElement;
  private readonly body: HTMLDivElement;

  private readonly inventory: HTMLDivElement;

  constructor(
    private readonly manager: EntityManager,
    private readonly pawnRegistry: ResourceRegistry<PawnDefinition>,
    private readonly party: Party
  ) {
    this.element = document.createElement("div");
    this.element.className = "character-sheet";
    this.element.hidden = true;

    this.panel = document.createElement("div");
    this.panel.className = "character-sheet__panel";
    this.panel.appendChild(this.buildCloseButton());

    this.body = document.createElement("div");
    this.body.className = "character-sheet__body";
    this.panel.appendChild(this.body);

    this.inventory = document.createElement("div");
    this.inventory.className = "character-sheet__inventory";
    this.panel.appendChild(this.inventory);

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

  /** Re-renders the currently open sheet. No-op while hidden. */
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

    this.body.replaceChildren();
    this.body.appendChild(this.buildPortraitColumn(appearance.appearance, equipment));
    this.body.appendChild(this.buildStatsColumn(stats, experience, attributes));

    this.inventory.replaceChildren(...this.buildInventorySlots());
  }

  /** Shared party inventory — every party member sees the same items. */
  private buildInventorySlots(): HTMLDivElement[] {
    return this.party.getInventory().map((itemId) => {
      const slotEl = document.createElement("div");
      slotEl.className = "character-sheet__slot";
      slotEl.textContent = itemId ?? "";
      if (!itemId) slotEl.classList.add("character-sheet__slot--empty");
      return slotEl;
    });
  }

  private buildCloseButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "character-sheet__close";
    button.textContent = "×";
    button.addEventListener("click", () => this.hide());
    return button;
  }

  private buildPortraitColumn(
    appearance: Parameters<typeof buildFullPortraitSvg>[0],
    equipment: EquipmentComponent | undefined
  ): HTMLDivElement {
    const column = document.createElement("div");
    column.className = "character-sheet__portrait-column";

    column.appendChild(this.buildSlotList(LEFT_SLOTS, equipment));

    const portraitWrap = document.createElement("div");
    portraitWrap.className = "character-sheet__portrait-wrap";
    portraitWrap.appendChild(buildFullPortraitSvg(appearance));
    column.appendChild(portraitWrap);

    column.appendChild(this.buildSlotList(RIGHT_SLOTS, equipment));

    const hands = document.createElement("div");
    hands.className = "character-sheet__hand-slots";
    for (const slot of HAND_SLOTS) {
      hands.appendChild(this.buildSlot(slot, equipment));
    }
    column.appendChild(hands);

    return column;
  }

  private buildSlotList(slots: EquipmentSlot[], equipment: EquipmentComponent | undefined): HTMLDivElement {
    const list = document.createElement("div");
    list.className = "character-sheet__slot-list";
    for (const slot of slots) {
      list.appendChild(this.buildSlot(slot, equipment));
    }
    return list;
  }

  private buildSlot(slot: EquipmentSlot, equipment: EquipmentComponent | undefined): HTMLDivElement {
    const slotEl = document.createElement("div");
    slotEl.className = "character-sheet__slot";
    const itemId = equipment?.slots[slot];
    slotEl.textContent = itemId ?? SLOT_LABELS[slot];
    if (!itemId) slotEl.classList.add("character-sheet__slot--empty");
    return slotEl;
  }

  private buildStatsColumn(
    stats: StatsComponent,
    experience: ExperienceComponent | undefined,
    attributes: PawnDefinition["attributes"]
  ): HTMLDivElement {
    const column = document.createElement("div");
    column.className = "character-sheet__stats-column";

    column.appendChild(this.buildStatRow("Hit Points", `${stats.currentHP} / ${stats.maxHP}`));
    column.appendChild(this.buildStatRow("Armor Class", `${stats.defense}`));
    if (experience) {
      column.appendChild(this.buildStatRow("Experience", `${experience.currentExp}`));
      column.appendChild(this.buildStatRow("Next Level", `${experience.expToNextLevel}`));
    }

    if (attributes) {
      const divider = document.createElement("hr");
      divider.className = "character-sheet__divider";
      column.appendChild(divider);

      column.appendChild(this.buildStatRow("Level", `${attributes.level}`));
      column.appendChild(this.buildStatRow("Strength", `${attributes.strength}`));
      column.appendChild(this.buildStatRow("Intelligence", `${attributes.intelligence}`));
      column.appendChild(this.buildStatRow("Piety", `${attributes.piety}`));
      column.appendChild(this.buildStatRow("Vitality", `${attributes.vitality}`));
      column.appendChild(this.buildStatRow("Dexterity", `${attributes.dexterity}`));
      column.appendChild(this.buildStatRow("Speed", `${attributes.speed}`));
      column.appendChild(this.buildStatRow("Senses", `${attributes.senses}`));
    }

    return column;
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
