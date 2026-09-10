import type { ResourceDefinition } from "../resources/ResourceDefinition";

export class ResourceRegistry<T extends ResourceDefinition> {
  private readonly definitions = new Map<string, T>();

  register(definition: T): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Resource with id "${definition.id}" is already registered.`);
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): T {
    const definition = this.definitions.get(id);
    if (!definition) {
      throw new Error(`No resource registered with id "${id}".`);
    }
    return definition;
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  getAll(): readonly T[] {
    return Array.from(this.definitions.values());
  }
}
