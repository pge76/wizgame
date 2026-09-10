import { Container, Graphics } from "pixi.js";
import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import { TransformComponent } from "@entities/components/TransformComponent";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { MovementComponent } from "@entities/components/MovementComponent";
import { AttackAnimationComponent } from "@entities/components/AttackAnimationComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { TILE_SIZE, gridToWorld, lerpGridPos } from "@world/Coordinates";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { PawnDefinition } from "@data/resources/PawnDefinition";
import type { AppearanceDefinition } from "@data/resources/AppearanceDefinition";
import { buildPawnSprite, buildRasterSprite } from "./pawn/PawnSpriteFactory";
import { getMonsterTexture } from "./pawn/MonsterTextureLoader";
import { BODY_TOP_Y, HEAD_CENTER_Y, PAWN_CENTER_X } from "./pawn/PawnLayout";

const ACTIVE_HIGHLIGHT_COLOR = 0xcba135;
const DIMMED_ALPHA = 0.55;
const DEAD_ALPHA = 0.4;
const ATTACK_LUNGE_FRACTION = 0.35;
const HP_BAR_WIDTH = TILE_SIZE - 4;
const HP_BAR_HEIGHT = 4;
const HP_BAR_Y = TILE_SIZE + 2;
const HP_BAR_BG_COLOR = 0x2a2a32;
const HP_BAR_FILL_COLOR = 0x4caf50;

export class PawnView {
  readonly container = new Container();
  private readonly sprites = new Map<EntityId, Container>();
  private readonly hpBars = new Map<EntityId, Graphics>();
  private readonly activeHighlight = new Graphics();
  private activeEntityId: EntityId | null = null;
  private dimmedEntityIds: ReadonlySet<EntityId> = new Set();
  private hiddenEntityIds: ReadonlySet<EntityId> = new Set();
  private showHpBars = false;

  constructor(
    private readonly manager: EntityManager,
    private readonly pawnRegistry: ResourceRegistry<PawnDefinition>
  ) {
    this.activeHighlight.visible = false;
    this.container.addChildAt(this.activeHighlight, 0);
  }

  /** Marks an entity's sprite as the currently active one (e.g. whose battle turn it is). */
  setActiveEntity(id: EntityId | null): void {
    this.activeEntityId = id;
  }

  /** Renders the given entities' sprites at reduced opacity (e.g. units with no actions left). */
  setDimmedEntities(ids: ReadonlySet<EntityId>): void {
    this.dimmedEntityIds = ids;
  }

  /** HP bars are only meaningful in battle; hide them on the overworld map. */
  setShowHpBars(show: boolean): void {
    this.showHpBars = show;
  }

  /** Excludes entities from rendering entirely (e.g. off-screen party members on the overworld map). */
  setHiddenEntities(ids: ReadonlySet<EntityId>): void {
    this.hiddenEntityIds = ids;
  }

  /** Uses the pawn's raster sprite (from its PawnDefinition) if it has one, else the vector pawn. */
  private buildSprite(id: EntityId, appearance: AppearanceDefinition): Container {
    const pawnDefinitionId = this.manager.getComponent(id, PawnComponent)?.pawnDefinitionId;
    const spriteAsset = pawnDefinitionId ? this.pawnRegistry.get(pawnDefinitionId).spriteAsset : undefined;
    const texture = spriteAsset ? getMonsterTexture(spriteAsset) : undefined;

    return texture ? buildRasterSprite(texture) : buildPawnSprite(appearance);
  }

  private syncHpBar(id: EntityId, worldPos: { x: number; y: number }, currentHP: number, maxHP: number): void {
    let bar = this.hpBars.get(id);
    if (!bar) {
      bar = new Graphics();
      this.hpBars.set(id, bar);
      this.container.addChild(bar);
    }

    const ratio = Math.max(0, Math.min(1, currentHP / maxHP));
    bar
      .clear()
      .rect(0, 0, HP_BAR_WIDTH, HP_BAR_HEIGHT)
      .fill({ color: HP_BAR_BG_COLOR })
      .rect(0, 0, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT)
      .fill({ color: HP_BAR_FILL_COLOR });
    bar.position.set(worldPos.x + (TILE_SIZE - HP_BAR_WIDTH) / 2, worldPos.y + HP_BAR_Y);
  }

  sync(): void {
    const entities = this.manager.query(TransformComponent, AppearanceComponent);
    const stillPresent = new Set<EntityId>();

    for (const id of entities) {
      if (this.hiddenEntityIds.has(id)) continue;
      stillPresent.add(id);

      const transform = this.manager.getComponent(id, TransformComponent)!;
      const appearance = this.manager.getComponent(id, AppearanceComponent)!;
      const movement = this.manager.getComponent(id, MovementComponent);
      const attackAnim = this.manager.getComponent(id, AttackAnimationComponent);
      const stats = this.manager.getComponent(id, StatsComponent);
      const isDead = stats !== undefined && stats.currentHP <= 0;

      let sprite = this.sprites.get(id);
      if (!sprite) {
        sprite = this.buildSprite(id, appearance.appearance);
        this.sprites.set(id, sprite);
        this.container.addChild(sprite);
      }

      let renderPos = transform.position;
      if (movement && movement.path.length > 0) {
        renderPos = lerpGridPos(transform.position, movement.path[0]!, movement.progress);
      } else if (attackAnim) {
        const lunge = Math.sin(Math.min(attackAnim.progress, 1) * Math.PI) * ATTACK_LUNGE_FRACTION;
        renderPos = lerpGridPos(transform.position, attackAnim.targetPos, lunge);
      }

      const worldPos = gridToWorld(renderPos);
      sprite.position.set(worldPos.x, worldPos.y);
      sprite.alpha = isDead ? DEAD_ALPHA : this.dimmedEntityIds.has(id) ? DIMMED_ALPHA : 1;

      if (stats && this.showHpBars) {
        this.syncHpBar(id, worldPos, stats.currentHP, stats.maxHP);
      } else {
        this.hpBars.get(id)?.destroy();
        this.hpBars.delete(id);
      }
    }

    for (const [id, sprite] of this.sprites) {
      if (!stillPresent.has(id)) {
        sprite.destroy({ children: true });
        this.sprites.delete(id);
        this.hpBars.get(id)?.destroy();
        this.hpBars.delete(id);
      }
    }

    const activeSprite = this.activeEntityId !== null ? this.sprites.get(this.activeEntityId) : undefined;
    if (activeSprite) {
      this.activeHighlight.visible = true;
      this.activeHighlight.position.set(activeSprite.position.x, activeSprite.position.y);
      const glowCenterY = (HEAD_CENTER_Y + BODY_TOP_Y) / 2 + 6;
      this.activeHighlight
        .clear()
        .circle(PAWN_CENTER_X, glowCenterY, 20)
        .fill({ color: ACTIVE_HIGHLIGHT_COLOR, alpha: 0.12 })
        .circle(PAWN_CENTER_X, glowCenterY, 14)
        .fill({ color: ACTIVE_HIGHLIGHT_COLOR, alpha: 0.22 })
        .circle(PAWN_CENTER_X, glowCenterY, 8)
        .fill({ color: ACTIVE_HIGHLIGHT_COLOR, alpha: 0.35 });
    } else {
      this.activeHighlight.visible = false;
    }
  }
}
