import { Clock } from "./Clock";

const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_FRAME_DELTA_SECONDS = 0.25;

export class GameLoop {
  private readonly clock = new Clock();
  private accumulator = 0;
  private running = false;
  private rafHandle = 0;

  constructor(
    private readonly onUpdate: (dt: number) => void,
    private readonly onRender: (alpha: number) => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  private frame = (nowMs: number): void => {
    if (!this.running) return;

    const frameDelta = Math.min(this.clock.tick(nowMs), MAX_FRAME_DELTA_SECONDS);
    this.accumulator += frameDelta;

    while (this.accumulator >= FIXED_TIMESTEP_SECONDS) {
      this.onUpdate(FIXED_TIMESTEP_SECONDS);
      this.accumulator -= FIXED_TIMESTEP_SECONDS;
    }

    this.onRender(this.accumulator / FIXED_TIMESTEP_SECONDS);
    this.rafHandle = requestAnimationFrame(this.frame);
  };
}
