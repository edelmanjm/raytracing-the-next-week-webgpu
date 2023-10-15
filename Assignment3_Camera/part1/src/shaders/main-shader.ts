import shaderMain from './main.wgsl';
import shaderMaterials from './materials.wgsl';

export function getShader(wgSize: number, width: number, height: number): string {
  const materials = shaderMaterials;
  // FIXME sussy but works for now
  return eval('`' + shaderMain + '`');
}

export function getMaterials() {
  return shaderMaterials;
}
