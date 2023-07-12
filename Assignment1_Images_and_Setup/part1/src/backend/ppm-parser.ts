import * as fs from 'fs';
import { Canvas, createCanvas, createImageData } from 'canvas';
import assert from 'assert';

export async function loadP3(path: string): Promise<Canvas> {
  const data: string = await fs.promises.readFile(path, 'utf-8');

  const items: string[] = data
    .split('\n')
    .filter(line => !line.startsWith('#'))
    .flatMap(line => line.split(' '));
  assert(items[0] == 'P3');

  const width = parseInt(items[1]);
  const height = parseInt(items[2]);

  const ret: Canvas = createCanvas(width, height);

  const maxValue: number = parseInt(items[3]);
  // Canvases only support 8-bit images
  assert(maxValue == 255);

  const pixels_rgb = new Uint8ClampedArray(
    items
      .slice(4)
      .flatMap(line => line.split(' '))
      .map(s => parseInt(s)),
  );
  const pixels_rgba = new Uint8ClampedArray(width * height * 4);
  // Fill a default value
  pixels_rgba.fill(0);

  // Need to transform to RGBA
  let index_rgb = 0;
  let index_rgba = 0;

  while (index_rgb < pixels_rgb.length) {
    pixels_rgba[index_rgba] = pixels_rgb[index_rgb];
    pixels_rgba[index_rgba + 1] = pixels_rgb[index_rgb + 1];
    pixels_rgba[index_rgba + 2] = pixels_rgb[index_rgb + 2];
    pixels_rgba[index_rgba + 3] = 255;

    index_rgb += 3;
    index_rgba += 4;
  }

  ret.getContext('2d').putImageData(createImageData(pixels_rgba, ret.width, ret.height), 0, 0);

  return ret;
}
export async function writeP3(path: string, canvas: Canvas): Promise<void> {
  let out: string[] = [];

  out.push('P3');
  out.push('# Encoded with TypeScript <3');
  out.push(`${canvas.width} ${canvas.height}`);
  out.push('255');

  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  assert(data.length % 4 == 0);

  out.push(
    data
      .filter((_, index) => {
        return (index + 1) % 4 != 0;
      })
      .join(' '),
  );

  // Preview.app seems to like a trailing newline
  await fs.promises.writeFile(path, out.join('\n') + '\n', 'utf-8');
}

export async function writeP6(path: string, canvas: Canvas): Promise<void> {
  let header: string[] = [];
  header.push('P6');
  header.push('# Encoded with TypeScript <3');
  header.push(`${canvas.width} ${canvas.height}`);
  header.push('255');

  await fs.promises.writeFile(path, header.join('\n') + '\n', 'utf-8');

  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  assert(data.length % 4 == 0);
  let body: Uint8ClampedArray = data.filter((_, index) => {
    return (index + 1) % 4 != 0;
  });

  await fs.promises.appendFile(path, Buffer.from(body));

  await fs.promises.appendFile(path, '\n', 'utf-8');
}
