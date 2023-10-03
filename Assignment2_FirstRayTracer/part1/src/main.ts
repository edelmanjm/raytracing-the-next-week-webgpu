import Renderer from './renderer';
import { convertP3 } from './ppm-parser';

class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  lastTimeStampMs: DOMHighResTimeStamp = 0;

  elapsedTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = canvas.height = 64 * 12;
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    // Create a button to trigger the download
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download image';
    downloadButton.addEventListener('click', () => {
      download('image.ppm');
    });

    // Append the button and static text to the body
    const div = document.createElement('div');
    div.appendChild(downloadButton);

    document.body.appendChild(div);
  }

  async run() {
    await this.renderer.initializeAPI();
    await this.renderer.render();
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const app = new App(canvas);

// PPM Requirement
async function download(filename: string): Promise<void> {
  const element = document.createElement('a');
  const contents: string = convertP3(app.renderer.frame);
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

app.run();
