import { loadP3 } from './ppm-parser';

async function main(): Promise<void> {
  const canvas = await loadP3(
    '/Users/Jonathan/Projects/Current/monorepo-edelmanjm/common/textures/big_buck_bunny_blender3d.ppm',
  );
  // document.getElementById('canvas').replaceWith(canvas);
}

main();
