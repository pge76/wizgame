import type { ResourceDefinition } from "./ResourceDefinition";

export interface TileDefinition extends ResourceDefinition {
  readonly walkable: boolean;
  readonly color: number;
}

export const TILE_FLOOR: TileDefinition = {
  id: "tile.floor",
  displayName: "Floor",
  walkable: true,
  color: 0x2b2b33
};

export const TILE_WALL: TileDefinition = {
  id: "tile.wall",
  displayName: "Wall",
  walkable: false,
  color: 0x0a0a0d
};

export const TILE_GRASS: TileDefinition = {
  id: "tile.grass",
  displayName: "Grass",
  walkable: true,
  color: 0x3f8f3f
};

export const TILE_SAND: TileDefinition = {
  id: "tile.sand",
  displayName: "Sand",
  walkable: true,
  color: 0xcbb17a
};

export const TILE_WATER: TileDefinition = {
  id: "tile.water",
  displayName: "Water",
  walkable: false,
  color: 0x3f7fbf
};
