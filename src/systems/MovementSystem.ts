import type { EntityManager } from "@entities/EntityManager";
import type { Grid } from "@world/Grid";
import { TransformComponent } from "@entities/components/TransformComponent";
import { MovementComponent } from "@entities/components/MovementComponent";
import type { System } from "./System";

export class MovementSystem implements System {
  update(dt: number, manager: EntityManager, grid: Grid): void {
    for (const id of manager.query(TransformComponent, MovementComponent)) {
      const transform = manager.getComponent(id, TransformComponent)!;
      const movement = manager.getComponent(id, MovementComponent)!;

      if (movement.path.length === 0) {
        manager.removeComponent(id, MovementComponent);
        continue;
      }

      movement.progress += movement.speed * dt;

      while (movement.progress >= 1 && movement.path.length > 0) {
        movement.progress -= 1;
        const nextTile = movement.path.shift()!;

        // Only clear the old cell if it's still marked as this entity's own — another entity that
        // started moving the same tick may have already claimed it.
        if (grid.getCell(transform.position).occupantEntityId === id) {
          grid.getCell(transform.position).occupantEntityId = null;
        }
        grid.getCell(nextTile).occupantEntityId = id;
        transform.position = nextTile;
      }

      if (movement.path.length === 0) {
        movement.progress = 0;
        manager.removeComponent(id, MovementComponent);
      }
    }
  }
}
