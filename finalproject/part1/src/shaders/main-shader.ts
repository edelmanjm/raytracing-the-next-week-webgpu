import shaderMain from './main.wgsl';

export function getShader(
  wgSize: number,
  width: number,
  height: number,
  materialCount: number,
  sphereCount: number,
  meshCount: number,
  vertexCount: number,
  indicesCount: number,
  bvhCount: number,
): string {
  const sphereCountOrOne = Math.max(sphereCount, 1);
  const meshCountOrOne = Math.max(meshCount, 1);
  const vertexCountOrOne = Math.max(vertexCount, 1);
  const indicesCountOrOne = Math.max(indicesCount, 1);
  const bvhCountOrOne = Math.max(bvhCount, 1);
  return eval('`' + shaderMain + '`');
}
