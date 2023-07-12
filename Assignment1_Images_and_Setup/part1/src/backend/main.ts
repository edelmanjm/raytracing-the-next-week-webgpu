import { loadP3, writeP3, writeP6 } from './ppm-parser';
import * as fs from 'fs';

async function main(): Promise<void> {
  const canvas = await loadP3(
    '/Users/Jonathan/Projects/Current/monorepo-edelmanjm/common/textures/big_buck_bunny_blender3d_with_weird_formatting.ppm',
  );

  await fs.promises.writeFile('out.png', canvas.toBuffer('image/png'));
  // document.getElementById('canvas').replaceWith(canvas);

  await writeP3('out-p3.ppm', canvas);
  await writeP6('out-p6.ppm', canvas);
}

main();
