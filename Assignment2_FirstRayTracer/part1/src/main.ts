import { writeP3 } from './ppm-parser';

async function main(): Promise<void> {
  const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (ctx == null) {
    throw Error('lol idk');
  }
  circle(canvas, ctx);

  await Promise.all([
    // fs.promises.writeFile('out.png', canvas.toBuffer('image/png')),
    writeP3('circle.ppm', ctx.getImageData(0, 0, canvas.width, canvas.height)),
  ]);
}

function circle(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
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
