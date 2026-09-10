import type { Application, Container } from "pixi.js";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;
const PAN_MARGIN = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampAxis(position: number, worldSize: number, viewSize: number): number {
  const min = viewSize - worldSize - PAN_MARGIN;
  const max = PAN_MARGIN;
  if (min > max) {
    return position;
  }
  return clamp(position, min, max);
}

export class CameraController {
  constructor(
    private readonly app: Application,
    private readonly world: Container,
    private worldWidth: number,
    private worldHeight: number
  ) {
    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  destroy(): void {
    this.app.canvas.removeEventListener("wheel", this.onWheel);
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const oldScale = this.world.scale.x;
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const newScale = clamp(oldScale * factor, MIN_ZOOM, MAX_ZOOM);
    if (newScale === oldScale) {
      return;
    }

    const worldPointX = (cursorX - this.world.position.x) / oldScale;
    const worldPointY = (cursorY - this.world.position.y) / oldScale;

    this.world.scale.set(newScale);
    this.world.position.x = cursorX - worldPointX * newScale;
    this.world.position.y = cursorY - worldPointY * newScale;
    this.clampPosition();
  };

  setWorldBounds(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.clampPosition();
  }

  centerOn(worldX: number, worldY: number): void {
    const scale = this.world.scale.x;
    this.world.position.x = this.app.screen.width / 2 - worldX * scale;
    this.world.position.y = this.app.screen.height / 2 - worldY * scale;
    this.clampPosition();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const scale = this.world.scale.x;
    return {
      x: (screenX - this.world.position.x) / scale,
      y: (screenY - this.world.position.y) / scale
    };
  }

  private clampPosition(): void {
    const scale = this.world.scale.x;
    const viewWidth = this.app.screen.width;
    const viewHeight = this.app.screen.height;

    this.world.position.x = clampAxis(this.world.position.x, this.worldWidth * scale, viewWidth);
    this.world.position.y = clampAxis(this.world.position.y, this.worldHeight * scale, viewHeight);
  }
}
