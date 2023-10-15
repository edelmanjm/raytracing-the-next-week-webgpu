import shader from './default.wgsl';

export function getShader(wgSize: number, width: number, height: number): string {
  // FIXME sussy but works for now
  return eval('`' + shader + '`');
}
