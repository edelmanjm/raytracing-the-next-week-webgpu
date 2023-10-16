import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
): string {
  return eval('`' + shaderMain + '`');
}
