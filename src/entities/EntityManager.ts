import type { EntityId } from "./Entity";
import type { Component, ComponentCtor } from "./components/Component";

export class EntityManager {
  private nextId: EntityId = 1;
  private readonly entities = new Set<EntityId>();
  private readonly components = new Map<ComponentCtor, Map<EntityId, Component>>();

  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.components.values()) {
      store.delete(id);
    }
  }

  addComponent<T extends Component>(id: EntityId, ctor: ComponentCtor<T>, component: T): void {
    let store = this.components.get(ctor);
    if (!store) {
      store = new Map<EntityId, Component>();
      this.components.set(ctor, store);
    }
    store.set(id, component);
  }

  getComponent<T extends Component>(id: EntityId, ctor: ComponentCtor<T>): T | undefined {
    return this.components.get(ctor)?.get(id) as T | undefined;
  }

  removeComponent<T extends Component>(id: EntityId, ctor: ComponentCtor<T>): void {
    this.components.get(ctor)?.delete(id);
  }

  hasComponent<T extends Component>(id: EntityId, ctor: ComponentCtor<T>): boolean {
    return this.components.get(ctor)?.has(id) ?? false;
  }

  query(...ctors: ComponentCtor[]): EntityId[] {
    return Array.from(this.entities).filter((id) =>
      ctors.every((ctor) => this.components.get(ctor)?.has(id) ?? false)
    );
  }
}
