import type { EntityManager } from "@entities/EntityManager";
import type { Grid } from "@world/Grid";

export interface System {
  update(dt: number, manager: EntityManager, world: Grid): void;
}
