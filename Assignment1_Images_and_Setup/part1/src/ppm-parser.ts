import * as assert from 'assert';
import * as fs from 'fs';

export async function loadP3(path: string): Promise<HTMLCanvasElement> {
  const data: string = await fetch(path).then(r => r.text());

  const lines: string[] = data.split('\n').filter(line => !line.startsWith('#'));
  // assert(lines[0] == 'P3');

  const dims: number[] = lines[1].split(' ').map(s => parseInt(s));
  // assert(dims.length == 2);

  const ret: HTMLCanvasElement = document.createElement('canvas');
  ret.width = dims[0];
  ret.height = dims[1];

  const maxValue: number = parseInt(lines[2].trim());
  // Canvases only support 8-bit images
  // assert(maxValue == 255);

  const pixels_rgb = new Uint8ClampedArray(
    lines
      .slice(3)
      .flatMap(line => line.split(' '))
      .map(s => parseInt(s)),
  );
  const pixels_rgba = new Uint8ClampedArray((pixels_rgb.length / 3) * 4);

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

  // Remove any extra data
  const trimmed = pixels_rgba.slice(0, Math.floor(pixels_rgba.length / 4) * 4);
  ret.getContext('2d').putImageData(new ImageData(trimmed, ret.width, ret.height), 0, 0);

  return ret;
}
export function writeP3(path: string, image: ImageBitmap): void {}

export function writeP6(path: string, image: ImageBitmap): void {}
