import type { Application, Container } from "pixi.js";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.1;
const PAN_MARGIN = 200;

/** Below this total finger movement (px), a single-touch gesture counts as a tap rather than a pan. */
const TAP_MOVE_THRESHOLD = 10;
/** Above this duration (ms), a single-touch gesture is too slow to count as a tap even without much movement. */
const TAP_MAX_DURATION_MS = 500;

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

interface TrackedPointer {
  x: number;
  y: number;
}

/** Two-finger touch gesture state. `reference*` is fixed at gesture start (so the zoom factor is
 *  computed cumulatively from the start, avoiding drift); `lastMidpoint*` updates every move to
 *  derive the pan delta since the previous event. */
interface PinchState {
  referenceDistance: number;
  referenceScale: number;
  lastMidpointX: number;
  lastMidpointY: number;
}

export class CameraController {
  /** True once the player has manually panned/pinched. While true, automatic re-centering (e.g. the
   *  overworld's camera-follows-leader behavior) must not fight the player's own positioning — it
   *  should be cleared by game logic once the player issues a new move command. */
  manualOverride = false;

  private readonly activePointers = new Map<number, TrackedPointer>();
  private pinchState: PinchState | null = null;

  /** Single-touch gesture tracking, used to distinguish a tap from a pan drag. */
  private singleTouchStartTime = 0;
  private singleTouchTotalMove = 0;
  private singleTouchIsPanning = false;
  /** False once a gesture has ever involved a second finger, so releasing the last finger of a
   *  just-ended pinch isn't misread as a fresh tap. Only a pointer session that started as (and
   *  stayed) a single touch is tap-eligible. */
  private singleTouchEligibleForTap = false;

  private tapHandler: ((screenX: number, screenY: number) => void) | null = null;

  constructor(
    private readonly app: Application,
    private readonly world: Container,
    private worldWidth: number,
    private worldHeight: number
  ) {
    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    // touch-action: none stops the browser's own pinch-zoom/scroll from fighting our gesture handling.
    this.app.canvas.style.touchAction = "none";
    this.app.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.app.canvas.addEventListener("pointermove", this.onPointerMove);
    this.app.canvas.addEventListener("pointerup", this.onPointerUp);
    this.app.canvas.addEventListener("pointercancel", this.onPointerUp);
  }

  destroy(): void {
    this.app.canvas.removeEventListener("wheel", this.onWheel);
    this.app.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.app.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.app.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.app.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }

  /** Registers the callback fired for a touch/pen tap (as opposed to a pan or pinch gesture). Mouse
   *  clicks are unaffected — those are handled separately by PlayerInputController/BattleInputController. */
  setTapHandler(handler: ((screenX: number, screenY: number) => void) | null): void {
    this.tapHandler = handler;
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    this.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
  };

  /** Zooms so the world point under (screenX, screenY) stays fixed on screen. Shared by wheel and pinch. */
  private zoomAt(screenX: number, screenY: number, factor: number): void {
    const oldScale = this.world.scale.x;
    const newScale = clamp(oldScale * factor, MIN_ZOOM, MAX_ZOOM);
    if (newScale === oldScale) return;

    const worldPointX = (screenX - this.world.position.x) / oldScale;
    const worldPointY = (screenY - this.world.position.y) / oldScale;

    this.world.scale.set(newScale);
    this.world.position.x = screenX - worldPointX * newScale;
    this.world.position.y = screenY - worldPointY * newScale;
    this.clampPosition();
  }

  private panBy(dx: number, dy: number): void {
    this.manualOverride = true;
    this.world.position.x += dx;
    this.world.position.y += dy;
    this.clampPosition();
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") return; // mouse input stays on the existing button-based controllers
    event.preventDefault();

    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 1) {
      this.singleTouchStartTime = performance.now();
      this.singleTouchTotalMove = 0;
      this.singleTouchIsPanning = false;
      this.singleTouchEligibleForTap = true;
    } else if (this.activePointers.size === 2) {
      this.singleTouchIsPanning = false; // a second finger landed: this was never going to be a tap
      this.singleTouchEligibleForTap = false;
      const { distance, midpointX, midpointY } = this.computePointerGeometry();
      this.pinchState = {
        referenceDistance: distance,
        referenceScale: this.world.scale.x,
        lastMidpointX: midpointX,
        lastMidpointY: midpointY
      };
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" || !this.activePointers.has(event.pointerId)) return;
    event.preventDefault();

    const previous = this.activePointers.get(event.pointerId)!;
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 2 && this.pinchState) {
      const { distance, midpointX, midpointY } = this.computePointerGeometry();
      const rect = this.app.canvas.getBoundingClientRect();

      if (this.pinchState.referenceDistance > 0) {
        const targetScale = clamp(
          this.pinchState.referenceScale * (distance / this.pinchState.referenceDistance),
          MIN_ZOOM,
          MAX_ZOOM
        );
        this.zoomAt(midpointX - rect.left, midpointY - rect.top, targetScale / this.world.scale.x);
      }
      this.panBy(midpointX - this.pinchState.lastMidpointX, midpointY - this.pinchState.lastMidpointY);
      this.pinchState.lastMidpointX = midpointX;
      this.pinchState.lastMidpointY = midpointY;
      return;
    }

    if (this.activePointers.size !== 1) return;

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    this.singleTouchTotalMove += Math.abs(dx) + Math.abs(dy);

    if (!this.singleTouchIsPanning && this.singleTouchTotalMove > TAP_MOVE_THRESHOLD) {
      this.singleTouchIsPanning = true;
    }
    if (this.singleTouchIsPanning) {
      this.panBy(dx, dy);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" || !this.activePointers.has(event.pointerId)) return;
    event.preventDefault();

    const wasSinglePointer = this.activePointers.size === 1;
    this.activePointers.delete(event.pointerId);

    if (this.activePointers.size < 2) {
      this.pinchState = null;
    }
    // Re-baseline against whichever finger is still down, so lifting one of two fingers doesn't
    // register as a sudden jump for the remaining one.
    const remaining = [...this.activePointers.values()][0];
    if (remaining) {
      this.singleTouchStartTime = performance.now();
      this.singleTouchTotalMove = 0;
      this.singleTouchIsPanning = false;
      this.singleTouchEligibleForTap = false; // this finger is a pinch leftover, not a fresh tap candidate
      return;
    }

    const duration = performance.now() - this.singleTouchStartTime;
    if (
      wasSinglePointer &&
      this.singleTouchEligibleForTap &&
      !this.singleTouchIsPanning &&
      this.singleTouchTotalMove <= TAP_MOVE_THRESHOLD &&
      duration <= TAP_MAX_DURATION_MS
    ) {
      const rect = this.app.canvas.getBoundingClientRect();
      this.tapHandler?.(event.clientX - rect.left, event.clientY - rect.top);
    }
  };

  private computePointerGeometry(): { distance: number; midpointX: number; midpointY: number } {
    const [a, b] = [...this.activePointers.values()];
    return {
      distance: Math.hypot(b!.x - a!.x, b!.y - a!.y),
      midpointX: (a!.x + b!.x) / 2,
      midpointY: (a!.y + b!.y) / 2
    };
  }

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
