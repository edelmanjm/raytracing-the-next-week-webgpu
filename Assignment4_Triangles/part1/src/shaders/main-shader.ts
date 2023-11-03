import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
  sphereCount: number,
  meshCount: number,
): string {
  const sphereCountOrOne = Math.max(sphereCount, 1);
  const meshCountOrOne = Math.max(meshCount, 1);
  return eval('`' + shaderMain + '`');
}
