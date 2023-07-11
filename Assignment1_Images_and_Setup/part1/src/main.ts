import { loadP3 } from './ppm-parser';

async function main(): Promise<void> {
  const canvas = await loadP3('http://localhost:1234/ground_texture.ppm');
  document.getElementById('canvas').replaceWith(canvas);
}

main();
