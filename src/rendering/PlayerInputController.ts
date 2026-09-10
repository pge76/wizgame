import type { Application } from "pixi.js";
import type { CameraController } from "./CameraController";
import { worldToGrid, type GridPos } from "@world/Coordinates";

export class PlayerInputController {
  enabled = true;

  constructor(
    private readonly app: Application,
    private readonly camera: CameraController,
    private readonly onCommandMove: (target: GridPos) => void
  ) {
    this.app.canvas.addEventListener("contextmenu", this.onContextMenu);
    this.app.canvas.addEventListener("mousedown", this.onMouseDown);
  }

  destroy(): void {
    this.app.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.app.canvas.removeEventListener("mousedown", this.onMouseDown);
  }

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.enabled || event.button !== 2) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const worldPos = this.camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    this.onCommandMove(worldToGrid(worldPos.x, worldPos.y));
  };
}
