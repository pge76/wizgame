import { describe, expect, it } from "vitest";
import { EntityManager } from "@entities/EntityManager";
import { TransformComponent } from "@entities/components/TransformComponent";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { randomAppearance } from "@data/generation/AppearanceGenerator";

describe("EntityManager", () => {
  it("adds and retrieves components", () => {
    const manager = new EntityManager();
    const id = manager.createEntity();
    manager.addComponent(id, TransformComponent, new TransformComponent({ x: 1, y: 2 }));

    expect(manager.hasComponent(id, TransformComponent)).toBe(true);
    expect(manager.getComponent(id, TransformComponent)?.position).toEqual({ x: 1, y: 2 });
  });

  it("queries entities matching all given component types", () => {
    const manager = new EntityManager();
    const a = manager.createEntity();
    const b = manager.createEntity();

    manager.addComponent(a, TransformComponent, new TransformComponent({ x: 0, y: 0 }));
    manager.addComponent(a, AppearanceComponent, new AppearanceComponent(randomAppearance()));
    manager.addComponent(b, TransformComponent, new TransformComponent({ x: 1, y: 1 }));

    expect(manager.query(TransformComponent, AppearanceComponent)).toEqual([a]);
    expect(manager.query(TransformComponent)).toEqual([a, b]);
  });

  it("removes all components when an entity is destroyed", () => {
    const manager = new EntityManager();
    const id = manager.createEntity();
    manager.addComponent(id, TransformComponent, new TransformComponent({ x: 0, y: 0 }));

    manager.destroyEntity(id);

    expect(manager.hasComponent(id, TransformComponent)).toBe(false);
    expect(manager.query(TransformComponent)).toEqual([]);
  });
});
