import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { PlayerAiBehaviorComponent } from "@entities/components/PlayerAiBehaviorComponent";
import { PlayerAiBehavior } from "@data/resources/PlayerAiBehavior";
import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";

const AI_BEHAVIOR_LABELS: Record<PlayerAiBehavior, string> = {
  [PlayerAiBehavior.Melee]: "Nahkampf"
};

/** Fixed screen-space action display for battle: shows Move/Attack availability for the selected unit,
 *  an AI behavior selector, plus an End Turn button, docked to the bottom-center of the screen. */
export class BattleActionBarView {
  readonly element: HTMLDivElement;
  private readonly moveEl: HTMLDivElement;
  private readonly attackEl: HTMLDivElement;
  private readonly aiBehaviorEl: HTMLSelectElement;
  private readonly autoToggleEl: HTMLButtonElement;
  private readonly nextUnitEl: HTMLButtonElement;
  private readonly endTurnEl: HTMLButtonElement;

  constructor(
    private readonly manager: EntityManager,
    onEndTurn: () => void,
    onAiBehaviorChange: (behavior: PlayerAiBehavior) => void,
    onAutoToggle: () => void,
    onNextUnit: () => void
  ) {
    this.element = document.createElement("div");
    this.element.className = "battle-action-bar";
    this.element.hidden = true;

    this.moveEl = document.createElement("div");
    this.moveEl.className = "battle-action-bar__action";
    this.moveEl.textContent = "Bewegen";

    this.attackEl = document.createElement("div");
    this.attackEl.className = "battle-action-bar__action";
    this.attackEl.textContent = "Angriff";

    this.aiBehaviorEl = document.createElement("select");
    this.aiBehaviorEl.className = "battle-action-bar__ai-behavior";
    for (const behavior of [PlayerAiBehavior.Melee]) {
      const option = document.createElement("option");
      option.value = String(behavior);
      option.textContent = AI_BEHAVIOR_LABELS[behavior];
      this.aiBehaviorEl.appendChild(option);
    }
    this.aiBehaviorEl.addEventListener("change", () => {
      onAiBehaviorChange(Number(this.aiBehaviorEl.value) as PlayerAiBehavior);
    });

    this.autoToggleEl = document.createElement("button");
    this.autoToggleEl.className = "battle-action-bar__auto-toggle";
    this.autoToggleEl.textContent = "Auto";
    this.autoToggleEl.addEventListener("click", onAutoToggle);

    // Touch has no Tab key to cycle the selection, so this button covers that (and works on desktop too).
    this.nextUnitEl = document.createElement("button");
    this.nextUnitEl.className = "battle-action-bar__next-unit";
    this.nextUnitEl.textContent = "Nächste Einheit";
    this.nextUnitEl.addEventListener("click", onNextUnit);

    this.endTurnEl = document.createElement("button");
    this.endTurnEl.className = "battle-action-bar__end-turn";
    this.endTurnEl.textContent = "Zug beenden";
    this.endTurnEl.addEventListener("click", onEndTurn);

    this.element.append(
      this.moveEl,
      this.attackEl,
      this.aiBehaviorEl,
      this.autoToggleEl,
      this.nextUnitEl,
      this.endTurnEl
    );
  }

  sync(selectedEntityId: EntityId | null): void {
    const participant = selectedEntityId !== null ? this.manager.getComponent(selectedEntityId, BattleParticipantComponent) : undefined;

    this.moveEl.classList.toggle("battle-action-bar__action--available", !!participant && !participant.hasMoved);
    this.moveEl.classList.toggle("battle-action-bar__action--used", !!participant && participant.hasMoved);

    this.attackEl.classList.toggle("battle-action-bar__action--available", !!participant && !participant.hasAttacked);
    this.attackEl.classList.toggle("battle-action-bar__action--used", !!participant && participant.hasAttacked);

    const aiBehaviorComponent = selectedEntityId !== null ? this.manager.getComponent(selectedEntityId, PlayerAiBehaviorComponent) : undefined;
    this.aiBehaviorEl.disabled = !aiBehaviorComponent;
    this.aiBehaviorEl.value = String(aiBehaviorComponent?.behavior ?? PlayerAiBehavior.Melee);

    this.autoToggleEl.disabled = !aiBehaviorComponent;
    this.autoToggleEl.classList.toggle("battle-action-bar__auto-toggle--active", !!aiBehaviorComponent?.autoEngaged);
  }
}
