import Renderer from './renderer';

class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  lastTimeStampMs: DOMHighResTimeStamp = 0;

  elapsedTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = canvas.height = 64 * 12;
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
  }

  async run() {
    await this.renderer.initializeAPI();

    const updateLoop = (timeStampMs: DOMHighResTimeStamp) => {
      // Compute delta time in seconds
      const dt = (timeStampMs - this.lastTimeStampMs) / 1000;
      this.lastTimeStampMs = timeStampMs;
      this.renderer.render(dt);
      requestAnimationFrame(updateLoop);
    };

    // Start the update loop
    this.lastTimeStampMs = performance.now();
    updateLoop(this.lastTimeStampMs);
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const app = new App(canvas);

app.run();
