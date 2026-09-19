import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { Party, PARTY_SIZE } from "@entities/Party";
import {
  BodyShape,
  EyeStyle,
  FacialFeature,
  HairStyle,
  HeadShape,
  type AppearanceDefinition
} from "@data/resources/AppearanceDefinition";
import { buildPortraitSvg } from "./PortraitSvg";

function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** Debug-only: dumps the trait ids composing a portrait, shown as a hover tooltip. */
function describeAppearance(appearance: AppearanceDefinition): string {
  return [
    `Head: ${HeadShape[appearance.headShape]}`,
    `Body: ${BodyShape[appearance.bodyShape]}`,
    `Hair: ${HairStyle[appearance.hairStyle]} (${toHex(appearance.hairColor)})`,
    `Eyes: ${EyeStyle[appearance.eyeStyle]}`,
    `Feature: ${FacialFeature[appearance.facialFeature]}`,
    `Skin: ${toHex(appearance.skinColor)}`
  ].join("\n");
}

const SLOTS_PER_SIDE = PARTY_SIZE / 2;

/**
 * Fixed screen-space UI showing the party's head portraits, independent of the grid/camera.
 * 3 members are docked to the left edge, 3 to the right edge. Portraits are rendered as SVG,
 * so they stay crisp at any slot size.
 */
export class PartyBarView {
  readonly element: HTMLDivElement;
  private readonly slots: HTMLDivElement[] = [];
  private readonly debugTooltip: HTMLDivElement;

  constructor(
    private readonly manager: EntityManager,
    private readonly party: Party,
    private readonly onOpenCharacterSheet?: (slot: number) => void
  ) {
    this.element = document.createElement("div");
    this.element.className = "party-bar";

    const leftSide = this.buildSide("left");
    const rightSide = this.buildSide("right");
    this.element.append(leftSide, rightSide);

    this.debugTooltip = document.createElement("div");
    this.debugTooltip.className = "party-bar__debug-tooltip";
    this.debugTooltip.hidden = true;
    this.element.appendChild(this.debugTooltip);
  }

  private buildSide(side: "left" | "right"): HTMLDivElement {
    const sideEl = document.createElement("div");
    sideEl.className = `party-bar-side party-bar-side--${side}`;

    const startSlot = side === "left" ? 0 : SLOTS_PER_SIDE;
    for (let slot = startSlot; slot < startSlot + SLOTS_PER_SIDE; slot++) {
      const slotEl = document.createElement("div");
      slotEl.className = "party-bar__slot";
      slotEl.addEventListener("mouseenter", () => this.showDebugTooltip(slotEl, side));
      slotEl.addEventListener("mouseleave", () => {
        this.debugTooltip.hidden = true;
      });
      // Right-click on desktop, plain click/tap everywhere else (including touch) — both open the sheet.
      const capturedSlot = slot;
      slotEl.addEventListener("click", () => this.onOpenCharacterSheet?.(capturedSlot));
      slotEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.onOpenCharacterSheet?.(capturedSlot);
      });
      this.slots[slot] = slotEl;
      sideEl.appendChild(slotEl);
    }

    return sideEl;
  }

  private showDebugTooltip(slotEl: HTMLDivElement, side: "left" | "right"): void {
    const text = slotEl.dataset.debug;
    if (!text) {
      return;
    }

    this.debugTooltip.textContent = text;
    this.debugTooltip.hidden = false;

    const slotRect = slotEl.getBoundingClientRect();
    const barRect = this.element.getBoundingClientRect();
    this.debugTooltip.style.top = `${slotRect.top - barRect.top}px`;
    if (side === "left") {
      this.debugTooltip.style.left = `${slotRect.right - barRect.left + 8}px`;
      this.debugTooltip.style.right = "auto";
    } else {
      this.debugTooltip.style.right = `${barRect.right - slotRect.left + 8}px`;
      this.debugTooltip.style.left = "auto";
    }
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

      const appearance = id === null ? undefined : this.manager.getComponent(id, AppearanceComponent);
      if (appearance) {
        slotEl.dataset.debug = describeAppearance(appearance.appearance);
      } else {
        delete slotEl.dataset.debug;
      }

      const portrait = appearance ? buildPortraitSvg(appearance.appearance) : null;
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
}
