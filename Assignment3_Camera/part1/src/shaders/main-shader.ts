import shaderMain from './main.wgsl';
import shaderMaterials from './materials.wgsl';

// FIXME sussy but works for now

export function getMaterials() {
  return eval('`' + shaderMaterials + '`');
}

export function getShader(wgSize: number, width: number, height: number): string {
  const materials = getMaterials();
  return eval('`' + shaderMain + '`');
}
