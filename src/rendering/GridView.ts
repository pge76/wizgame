import { Container, Graphics } from "pixi.js";
import type { Grid } from "@world/Grid";
import type { GridPos } from "@world/Coordinates";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { TileDefinition } from "@data/resources/TileDefinition";
import { TILE_SIZE } from "@world/Coordinates";

const HIGHLIGHT_COLOR = 0xffffff;
const HIGHLIGHT_ALPHA = 0.18;

export class GridView {
  readonly container = new Container();
  private readonly highlight = new Graphics();

  constructor(
    private readonly grid: Grid,
    private readonly tileRegistry: ResourceRegistry<TileDefinition>
  ) {}

  build(): void {
    this.container.removeChildren();

    const graphics = new Graphics();
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const cell = this.grid.getCell({ x, y });
        const tile = this.tileRegistry.get(cell.terrainId);

        graphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1).fill({ color: tile.color });
      }
    }
    this.container.addChild(graphics);
    this.container.addChild(this.highlight);
  }

  /** Highlights the given tiles (e.g. a selected unit's movement range). Pass an empty array to clear. */
  setHighlightedTiles(positions: readonly GridPos[]): void {
    this.highlight.clear();
    for (const pos of positions) {
      this.highlight.rect(pos.x * TILE_SIZE, pos.y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1).fill({
        color: HIGHLIGHT_COLOR,
        alpha: HIGHLIGHT_ALPHA
      });
    }
  }
}
