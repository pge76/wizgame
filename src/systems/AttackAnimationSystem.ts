import type { EntityManager } from "@entities/EntityManager";
import type { Grid } from "@world/Grid";
import { AttackAnimationComponent } from "@entities/components/AttackAnimationComponent";
import type { System } from "./System";

export class AttackAnimationSystem implements System {
  update(dt: number, manager: EntityManager, _grid: Grid): void {
    for (const id of manager.query(AttackAnimationComponent)) {
      const anim = manager.getComponent(id, AttackAnimationComponent)!;
      anim.progress += anim.speed * dt;
      if (anim.progress >= 1) {
        manager.removeComponent(id, AttackAnimationComponent);
      }
    }
  }
}
