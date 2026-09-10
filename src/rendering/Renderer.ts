import { Application, Container } from "pixi.js";

export class Renderer {
  readonly app = new Application();
  readonly sceneRoot = new Container();

  async init(mountEl: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: mountEl,
      background: 0x111116,
      antialias: true,
      autoStart: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    this.app.ticker.stop();
    mountEl.appendChild(this.app.canvas);
    this.app.stage.addChild(this.sceneRoot);
  }

  render(): void {
    this.app.renderer.render(this.app.stage);
  }
}
