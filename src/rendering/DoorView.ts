import { Container, Graphics } from "pixi.js";
import type { EntityManager } from "@entities/EntityManager";
import { DoorComponent } from "@entities/components/DoorComponent";
import { TransformComponent } from "@entities/components/TransformComponent";
import { TILE_SIZE } from "@world/Coordinates";

const CLOSED_COLOR = 0x8b5a2b;
const LOCKED_BORDER_COLOR = 0xcba135;
const DOOR_MARGIN = 4;

/** Draws closed doors as a wood-colored panel over their tile (locked ones get a gold outline);
 *  open doors render as nothing extra — their tile is just walkable floor again. */
export class DoorView {
  readonly container = new Container();
  private readonly graphics = new Graphics();

  constructor(private readonly manager: EntityManager) {
    this.container.addChild(this.graphics);
  }

  sync(): void {
    this.graphics.clear();

    for (const id of this.manager.query(DoorComponent, TransformComponent)) {
      const door = this.manager.getComponent(id, DoorComponent)!;
      if (door.isOpen) continue;

      const pos = this.manager.getComponent(id, TransformComponent)!.position;
      const x = pos.x * TILE_SIZE + DOOR_MARGIN;
      const y = pos.y * TILE_SIZE + DOOR_MARGIN;
      const size = TILE_SIZE - DOOR_MARGIN * 2;

      this.graphics.rect(x, y, size, size).fill({ color: CLOSED_COLOR });
      if (door.requiredItemId !== null) {
        this.graphics.rect(x, y, size, size).stroke({ color: LOCKED_BORDER_COLOR, width: 2 });
      }
    }
  }
}
