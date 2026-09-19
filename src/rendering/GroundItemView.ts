import { Container, Graphics } from "pixi.js";
import type { EntityManager } from "@entities/EntityManager";
import { GroundItemComponent } from "@entities/components/GroundItemComponent";
import { TransformComponent } from "@entities/components/TransformComponent";
import { TILE_SIZE } from "@world/Coordinates";

const GEM_COLOR = 0x7fb0d0;
const OUTLINE_COLOR = 0x1a1512;

/** Draws a small generic "there's an item here" marker for every GroundItemComponent entity — same
 *  diamond shape as the inventory's Misc-item icon fallback (ItemIconSvg.ts), just in Pixi Graphics
 *  instead of DOM/SVG since this renders on the world layer. Picked-up items disappear once
 *  Game.checkGroundItemPickups removes their entity. */
export class GroundItemView {
  readonly container = new Container();
  private readonly graphics = new Graphics();

  constructor(private readonly manager: EntityManager) {
    this.container.addChild(this.graphics);
  }

  sync(): void {
    this.graphics.clear();

    for (const id of this.manager.query(GroundItemComponent, TransformComponent)) {
      const pos = this.manager.getComponent(id, TransformComponent)!.position;
      const cx = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = pos.y * TILE_SIZE + TILE_SIZE / 2;
      const r = TILE_SIZE * 0.22;

      this.graphics
        .poly([cx, cy - r, cx + r, cy, cx, cy + r, cx - r, cy])
        .fill({ color: GEM_COLOR })
        .stroke({ color: OUTLINE_COLOR, width: 1 });
    }
  }
}
