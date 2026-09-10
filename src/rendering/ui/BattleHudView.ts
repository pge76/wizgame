import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { Faction, type PawnDefinition } from "@data/resources/PawnDefinition";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import { MONSTER_TEXTURE_URLS } from "@rendering/pawn/MonsterTextureAssets";
import { buildFullPortraitSvg } from "./PortraitSvg";

/** Fixed screen-space overview of all combatants (players first, then enemies) with HP bars;
 *  the currently selected unit is highlighted. */
export class BattleHudView {
  readonly element: HTMLDivElement;

  constructor(
    private readonly manager: EntityManager,
    private readonly pawnRegistry: ResourceRegistry<PawnDefinition>
  ) {
    this.element = document.createElement("div");
    this.element.className = "battle-hud";
    this.element.hidden = true;
  }

  sync(selectedEntityId: EntityId | null): void {
    const combatants = this.manager.query(StatsComponent, FactionComponent, BattleParticipantComponent);
    const players = combatants.filter((id) => this.manager.getComponent(id, FactionComponent)!.faction === Faction.PC);
    const enemies = combatants.filter((id) => this.manager.getComponent(id, FactionComponent)!.faction === Faction.Monster);

    this.element.replaceChildren();
    for (const id of [...players, ...enemies]) {
      const chip = this.buildChip(id, id === selectedEntityId);
      if (chip) this.element.appendChild(chip);
    }
  }

  private buildChip(id: EntityId, isSelected: boolean): HTMLDivElement | null {
    const stats = this.manager.getComponent(id, StatsComponent);
    const pawn = this.manager.getComponent(id, PawnComponent);
    if (!stats || !pawn) return null;

    const chip = document.createElement("div");
    chip.className = isSelected ? "battle-hud__chip battle-hud__chip--active" : "battle-hud__chip";

    const portrait = this.buildPortrait(id, pawn.pawnDefinitionId);
    if (portrait) chip.appendChild(portrait);

    const hpBar = document.createElement("div");
    hpBar.className = "battle-hud__hp-bar";
    const hpFill = document.createElement("div");
    hpFill.className = "battle-hud__hp-fill";
    hpFill.style.width = `${Math.max(0, (stats.currentHP / stats.maxHP) * 100)}%`;
    hpBar.appendChild(hpFill);
    chip.appendChild(hpBar);

    return chip;
  }

  private buildPortrait(id: EntityId, pawnDefinitionId: string): SVGSVGElement | HTMLImageElement | null {
    const spriteAsset = this.pawnRegistry.get(pawnDefinitionId).spriteAsset;
    const spriteUrl = spriteAsset ? MONSTER_TEXTURE_URLS[spriteAsset] : undefined;
    if (spriteUrl) {
      const img = document.createElement("img");
      img.src = spriteUrl;
      img.className = "party-bar__portrait";
      return img;
    }

    const appearance = this.manager.getComponent(id, AppearanceComponent);
    return appearance ? buildFullPortraitSvg(appearance.appearance) : null;
  }
}
