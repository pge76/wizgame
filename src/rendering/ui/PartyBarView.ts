import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { Party, PARTY_SIZE } from "@entities/Party";
import { buildPortraitSvg } from "./PortraitSvg";

const SLOTS_PER_SIDE = PARTY_SIZE / 2;

/**
 * Fixed screen-space UI showing the party's head portraits, independent of the grid/camera.
 * 3 members are docked to the left edge, 3 to the right edge. Portraits are rendered as SVG,
 * so they stay crisp at any slot size.
 */
export class PartyBarView {
  readonly element: HTMLDivElement;
  private readonly slots: HTMLDivElement[] = [];

  constructor(
    private readonly manager: EntityManager,
    private readonly party: Party
  ) {
    this.element = document.createElement("div");
    this.element.className = "party-bar";

    const leftSide = this.buildSide("left");
    const rightSide = this.buildSide("right");
    this.element.append(leftSide, rightSide);
  }

  private buildSide(side: "left" | "right"): HTMLDivElement {
    const sideEl = document.createElement("div");
    sideEl.className = `party-bar-side party-bar-side--${side}`;

    const startSlot = side === "left" ? 0 : SLOTS_PER_SIDE;
    for (let slot = startSlot; slot < startSlot + SLOTS_PER_SIDE; slot++) {
      const slotEl = document.createElement("div");
      slotEl.className = "party-bar__slot";
      this.slots[slot] = slotEl;
      sideEl.appendChild(slotEl);
    }

    return sideEl;
  }

  /** Highlights the slot for `id` (e.g. the current battle turn, or the overworld leader). Pass null to clear. */
  setActiveMember(id: EntityId | null): void {
    const members = this.party.getMembers();
    for (let slot = 0; slot < PARTY_SIZE; slot++) {
      this.slots[slot]!.classList.toggle("party-bar__slot--active", id !== null && members[slot] === id);
    }
  }

  /** Re-renders all portraits. Call after party membership or appearance changes. */
  sync(): void {
    const members = this.party.getMembers();
    for (let slot = 0; slot < PARTY_SIZE; slot++) {
      const id = members[slot] ?? null;
      const slotEl = this.slots[slot]!;
      slotEl.replaceChildren();

      const portrait = id === null ? null : this.renderPortrait(id);
      if (portrait) {
        slotEl.appendChild(portrait);
      }

      const stats = id === null ? undefined : this.manager.getComponent(id, StatsComponent);
      if (stats) {
        slotEl.appendChild(this.renderHpBar(stats.currentHP, stats.maxHP));
      }
    }
  }

  private renderHpBar(currentHP: number, maxHP: number): HTMLDivElement {
    const bar = document.createElement("div");
    bar.className = "party-bar__hp-bar";
    const fill = document.createElement("div");
    fill.className = "party-bar__hp-fill";
    fill.style.width = `${Math.max(0, (currentHP / maxHP) * 100)}%`;
    bar.appendChild(fill);
    return bar;
  }

  private renderPortrait(id: EntityId): SVGSVGElement | null {
    const appearance = this.manager.getComponent(id, AppearanceComponent);
    if (!appearance) {
      return null;
    }

    return buildPortraitSvg(appearance.appearance);
  }
}
