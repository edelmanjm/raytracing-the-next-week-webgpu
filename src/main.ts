import Renderer from './renderer.js';
import { convertP3, convertP6 } from './ppm-parser.js';

class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  lastTimeStampMs: DOMHighResTimeStamp = 0;

  elapsedTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = canvas.height = 32 * 16;
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    // Create a button to trigger the download
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download image';
    downloadButton.addEventListener('click', () => {
      download(this.renderer.scene.shortName + '.ppm');
    });

    // Append the button and static text to the body
    const div = document.createElement('div');
    div.appendChild(downloadButton);

    document.body.appendChild(div);
  }

  async run() {
    await this.renderer.init();

    const updateLoop = async (timeStampMs: DOMHighResTimeStamp) => {
      // Compute delta time in seconds
      const dt = (timeStampMs - this.lastTimeStampMs) / 1000;
      this.lastTimeStampMs = timeStampMs;
      await this.renderer.render(dt);
      requestAnimationFrame(updateLoop);
    };

    // Start the update loop
    this.lastTimeStampMs = performance.now();
    await updateLoop(this.lastTimeStampMs);
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const app = new App(canvas);

// PPM Requirement
async function download(filename: string): Promise<void> {
  const element = document.createElement('a');
  // P3
  // const contents: string = convertP3(app.renderer.frame);
  // const dataUrl: string = 'data:text/plain;charset=utf-8,';
  // P6
  const contents: string = convertP6(app.renderer.frame);
  const dataUrl: string = 'data:image/x-portable-pixmap;base64,';

  element.setAttribute('href', dataUrl + encodeURIComponent(contents));

  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

app.run();
