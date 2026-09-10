export class Clock {
  private lastTimeMs: number | null = null;

  tick(nowMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = nowMs;
      return 0;
    }
    const deltaSeconds = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    return deltaSeconds;
  }
}
