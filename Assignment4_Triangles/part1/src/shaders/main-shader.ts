import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
  sphereCount: number,
  vertexCount: number,
  indicesCount: number,
): string {
  return eval('`' + shaderMain + '`');
}
