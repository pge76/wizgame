import type { Application } from "pixi.js";
import type { CameraController } from "./CameraController";
import type { Grid } from "@world/Grid";
import { worldToGrid, type GridPos } from "@world/Coordinates";

export class BattleInputController {
  constructor(
    private readonly app: Application,
    private readonly camera: CameraController,
    private readonly battleGrid: Grid,
    private readonly onLeftClick: (pos: GridPos) => void,
    private readonly onRightClick: (pos: GridPos) => void
  ) {
    this.app.canvas.addEventListener("mousedown", this.onMouseDown);
    this.app.canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  destroy(): void {
    this.app.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.app.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 && event.button !== 2) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const worldPos = this.camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    const gridPos = worldToGrid(worldPos.x, worldPos.y);
    if (!this.battleGrid.isInBounds(gridPos)) return;

    if (event.button === 0) {
      this.onLeftClick(gridPos);
    } else {
      this.onRightClick(gridPos);
    }
  };
}
