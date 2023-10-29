import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
  sphereCount: number,
): string {
  return eval('`' + shaderMain + '`');
}
