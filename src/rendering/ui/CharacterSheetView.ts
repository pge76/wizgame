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
import { getEffectiveDefense, getEquippedWeapon, UNARMED_WEAPON } from "@battle/CombatFormulas";
import { buildFullPortraitSvg } from "./PortraitSvg";
import { buildItemIconSvg } from "./ItemIconSvg";

/** References either a paperdoll equipment slot or a party inventory slot — whichever is currently
 *  selected for the info box. */
type SelectedSlotRef = { readonly kind: "equip"; readonly slot: EquipmentSlot } | { readonly kind: "inventory"; readonly index: number };

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

/** Centered overlay showing one party member's portrait, equipment paperdoll, stats, and shared
 *  inventory.
 *
 *  Equipment and inventory slot elements are built once and updated in place on `sync()`, rather
 *  than being torn down and rebuilt every frame (`sync()` runs on every render tick while visible):
 *  rebuilding would detach their click listeners mid-gesture on a slow tap/click, the same class of
 *  bug the persistent close button already works around.
 *
 *  Clicking a slot only *selects* it and fills the info box with its details — it does not equip or
 *  unequip anything by itself. That happens only via the info box's own action button, so browsing
 *  items can't accidentally change what's worn. */
export class CharacterSheetView {
  readonly element: HTMLDivElement;
  private entityId: EntityId | null = null;
  private selectedSlotRef: SelectedSlotRef | null = null;
  private readonly panel: HTMLDivElement;
  private readonly portraitWrap: HTMLDivElement;
  private readonly statsColumn: HTMLDivElement;
  private readonly equipSlotElements = new Map<EquipmentSlot, HTMLDivElement>();
  private readonly inventorySlotElements: HTMLDivElement[];
  private readonly infoBoxName: HTMLDivElement;
  private readonly infoBoxStats: HTMLDivElement;
  private readonly infoBoxAction: HTMLButtonElement;

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

    const infoBox = document.createElement("div");
    infoBox.className = "character-sheet__info-box";
    this.infoBoxName = document.createElement("div");
    this.infoBoxName.className = "character-sheet__info-box-name";
    this.infoBoxStats = document.createElement("div");
    this.infoBoxStats.className = "character-sheet__info-box-stats";
    this.infoBoxAction = document.createElement("button");
    this.infoBoxAction.className = "character-sheet__info-box-action";
    this.infoBoxAction.addEventListener("click", () => this.runSelectedSlotAction());
    infoBox.append(this.infoBoxName, this.infoBoxStats, this.infoBoxAction);
    scroll.appendChild(infoBox);

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
    this.selectedSlotRef = null;
    this.element.hidden = false;
    this.sync();
  }

  hide(): void {
    this.entityId = null;
    this.selectedSlotRef = null;
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
      this.syncSlotElement(slotEl, equipment?.slots[slot] ?? null, SLOT_LABELS[slot], this.isSelected({ kind: "equip", slot }));
    }

    const inventoryItemIds = this.party.getInventory();
    this.inventorySlotElements.forEach((slotEl, index) => {
      this.syncSlotElement(slotEl, inventoryItemIds[index] ?? null, "", this.isSelected({ kind: "inventory", index }));
    });

    this.syncInfoBox(equipment);
  }

  private isSelected(ref: SelectedSlotRef): boolean {
    if (!this.selectedSlotRef) return false;
    return this.selectedSlotRef.kind === "equip" && ref.kind === "equip"
      ? this.selectedSlotRef.slot === ref.slot
      : this.selectedSlotRef.kind === "inventory" && ref.kind === "inventory"
        ? this.selectedSlotRef.index === ref.index
        : false;
  }

  /** Applies the current item (or empty placeholder) to an already-built slot element. */
  private syncSlotElement(slotEl: HTMLDivElement, itemId: string | null, emptyLabel: string, selected: boolean): void {
    const item = itemId && this.itemRegistry.has(itemId) ? this.itemRegistry.get(itemId) : null;
    const iconWrap = slotEl.querySelector(".character-sheet__slot-icon")!;
    const nameEl = slotEl.querySelector(".character-sheet__slot-name")!;

    iconWrap.replaceChildren(...(item ? [buildItemIconSvg(item)] : []));
    nameEl.textContent = item ? item.displayName : emptyLabel;

    slotEl.classList.toggle("character-sheet__slot--empty", !item);
    slotEl.classList.toggle("character-sheet__slot--interactive", item !== null && item.kind !== ItemKind.Misc);
    slotEl.classList.toggle("character-sheet__slot--selected", selected);
  }

  /** Fills the info box from the currently selected slot, or shows a neutral placeholder. */
  private syncInfoBox(equipment: EquipmentComponent | undefined): void {
    const itemId = this.resolveSelectedItemId(equipment);
    const item = itemId && this.itemRegistry.has(itemId) ? this.itemRegistry.get(itemId) : null;

    if (!this.selectedSlotRef || !item) {
      this.infoBoxName.textContent = "Kein Gegenstand ausgewählt";
      this.infoBoxStats.replaceChildren();
      this.infoBoxAction.hidden = true;
      return;
    }

    this.infoBoxName.textContent = item.displayName;
    this.infoBoxStats.replaceChildren(...this.buildItemStatLines(item));

    this.infoBoxAction.hidden = item.kind === ItemKind.Misc;
    this.infoBoxAction.textContent = this.selectedSlotRef.kind === "inventory" ? "Ausrüsten" : "Ablegen";
  }

  private resolveSelectedItemId(equipment: EquipmentComponent | undefined): string | null {
    if (!this.selectedSlotRef) return null;
    return this.selectedSlotRef.kind === "equip"
      ? (equipment?.slots[this.selectedSlotRef.slot] ?? null)
      : (this.party.getInventory()[this.selectedSlotRef.index] ?? null);
  }

  private buildItemStatLines(item: ItemDefinition): HTMLDivElement[] {
    switch (item.kind) {
      case ItemKind.Weapon: {
        const lines = [
          this.buildStatRow("Angriffswerte", `${item.damageMin}-${item.damageMax}${item.attackBonus > 0 ? ` (+${item.attackBonus})` : ""}`)
        ];
        if (item.twoHanded) lines.push(this.buildStatRow("Beidhändig", "Ja"));
        return lines;
      }
      case ItemKind.Armor:
        return [this.buildStatRow("Verteidigungswerte", `+${item.defenseBonus}`)];
      case ItemKind.Misc:
        return [];
    }
  }

  /** Performs the info box's action (equip from inventory, or unequip) on the current selection,
   *  then clears the selection — the equipped/inventory state itself is re-read on the next sync(). */
  private runSelectedSlotAction(): void {
    if (this.entityId === null || !this.selectedSlotRef) return;

    if (this.selectedSlotRef.kind === "inventory") {
      this.onEquipFromInventory(this.entityId, this.selectedSlotRef.index);
    } else {
      this.onUnequip(this.entityId, this.selectedSlotRef.slot);
    }
    this.selectedSlotRef = null;
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

  /** Built once per paperdoll slot; content is filled in later by sync()/syncSlotElement(). Clicking
   *  it only selects it (see class doc) — it no longer unequips directly. */
  private createEquipSlotElement(slot: EquipmentSlot): HTMLDivElement {
    const slotEl = this.buildBareSlotElement(SLOT_LABELS[slot]);
    slotEl.addEventListener("click", () => {
      this.selectedSlotRef = { kind: "equip", slot };
      this.sync();
    });
    this.equipSlotElements.set(slot, slotEl);
    return slotEl;
  }

  /** Built once per party inventory slot; content is filled in later by sync()/syncSlotElement().
   *  Clicking it only selects it (see class doc) — it no longer equips directly. */
  private createInventorySlotElement(inventorySlot: number): HTMLDivElement {
    const slotEl = this.buildBareSlotElement("");
    slotEl.addEventListener("click", () => {
      this.selectedSlotRef = { kind: "inventory", index: inventorySlot };
      this.sync();
    });
    return slotEl;
  }

  private buildBareSlotElement(emptyLabel: string): HTMLDivElement {
    const slotEl = document.createElement("div");
    slotEl.className = "character-sheet__slot character-sheet__slot--empty";

    const iconWrap = document.createElement("div");
    iconWrap.className = "character-sheet__slot-icon";
    const nameEl = document.createElement("div");
    nameEl.className = "character-sheet__slot-name";
    nameEl.textContent = emptyLabel;
    slotEl.append(iconWrap, nameEl);

    return slotEl;
  }

  private syncStatsColumn(
    entityId: EntityId,
    stats: StatsComponent,
    experience: ExperienceComponent | undefined,
    attributes: PawnDefinition["attributes"]
  ): void {
    // Armor Class is purely gear-driven now (BASE_ARMOR_CLASS is 0), so this total *is* the armor
    // contribution — no "base + bonus" breakdown to show.
    const armorClassLabel = `${getEffectiveDefense(this.manager, this.itemRegistry, entityId)}`;

    const weapon = getEquippedWeapon(this.manager, this.itemRegistry, entityId);
    const damageStats = weapon ?? UNARMED_WEAPON;
    const damageBonus = damageStats.attackBonus > 0 ? `+${damageStats.attackBonus}` : "";
    const damageLabel = `${weapon ? "" : "Unarmed "}${damageStats.damageMin}-${damageStats.damageMax}${damageBonus}`;

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
