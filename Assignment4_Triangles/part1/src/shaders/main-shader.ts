import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
  sphereCount: number,
  meshCount: number,
): string {
  return eval('`' + shaderMain + '`');
}
