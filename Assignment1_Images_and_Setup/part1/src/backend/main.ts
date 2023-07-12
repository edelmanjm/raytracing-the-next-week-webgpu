import { loadP3, writeP3, writeP6 } from './ppm-parser';
import { Canvas, CanvasRenderingContext2D, createCanvas, createImageData, ImageData } from 'canvas';
import { ArgumentParser } from 'argparse';
import path from 'path';

async function main(): Promise<void> {
  const parser: ArgumentParser = new ArgumentParser();
  parser.add_argument('file', {
    type: 'str',
  });

  let filePath: string = parser.parse_args().file;
  if (!path.isAbsolute(filePath)) {
    // Accounting for the fact that Node executes in dist/ but npm executes in the root directory
    filePath = path.join('..', filePath);
  }

  const image: ImageData = await loadP3(filePath);

  const darkened: ImageData = transformPixels(image, p => p / 2);
  const lightened: ImageData = transformPixels(image, p => p * 2);

  // document.getElementById('canvas').replaceWith(canvas);
  const canvas: Canvas = createCanvas(image.width, image.height);
  const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
  // ctx.putImageData(image, 0, 0);
  circle(canvas);

  await Promise.all([
    // fs.promises.writeFile('out.png', canvas.toBuffer('image/png')),
    writeP3('darken_p3.ppm', darkened),
    writeP6('darken_p6.ppm', darkened),
    writeP3('lighten_p3.ppm', lightened),
    writeP6('lighten_p6.ppm', lightened),
    writeP3('circle.ppm', ctx.getImageData(0, 0, canvas.width, canvas.height)),
  ]);
}

function transformPixels(image: ImageData, transformer: (pixel: number) => number): ImageData {
  const data: Uint8ClampedArray = image.data;

  const lightened: Uint8ClampedArray = data.map((value, index) => {
    // Ignore alpha channel
    if ((index + 1) % 4 == 0) {
      return value;
    } else {
      return transformer(value);
    }
  });

  return createImageData(lightened, image.width, image.height);
}

function circle(canvas: Canvas): void {
  const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(
    canvas.width / 2,
    canvas.height / 2,
    Math.min(canvas.width, canvas.height) / 4,
    0,
    2 * Math.PI,
  );
  ctx.fillStyle = 'red';
  ctx.fill();
}

main();
