import { describe, expect, it } from "vitest";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { TileDefinition } from "@data/resources/TileDefinition";

describe("ResourceRegistry", () => {
  const floor: TileDefinition = {
    id: "tile.floor",
    displayName: "Floor",
    walkable: true,
    color: 0x000000
  };

  it("registers and retrieves definitions by id", () => {
    const registry = new ResourceRegistry<TileDefinition>();
    registry.register(floor);
    expect(registry.get("tile.floor")).toBe(floor);
    expect(registry.has("tile.floor")).toBe(true);
  });

  it("throws when registering a duplicate id", () => {
    const registry = new ResourceRegistry<TileDefinition>();
    registry.register(floor);
    expect(() => registry.register(floor)).toThrow();
  });

  it("throws when getting an unregistered id", () => {
    const registry = new ResourceRegistry<TileDefinition>();
    expect(() => registry.get("missing")).toThrow();
  });

  it("returns all registered definitions", () => {
    const registry = new ResourceRegistry<TileDefinition>();
    registry.register(floor);
    expect(registry.getAll()).toEqual([floor]);
  });
});
