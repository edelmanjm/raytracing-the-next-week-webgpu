import { vec3, vec4 } from 'gl-matrix';

export interface Sphere {
  center: vec3;
  radius: number;
  mat: number;
}

export interface Vertex {
  // Positions
  px: number;
  py: number;
  pz: number;
  // Normals
  nx: number;
  ny: number;
  nz: number;
  // Texture coordinates
  u: number;
  v: number;
}

export class HittableList {
  spheres: Sphere[];
  vertices: Vertex[];
  indices: vec4[];

  padVec3ToVec4(input: vec3[], paddingValue: number = 0): vec4[] {
    return input.map(v3 => vec4.fromValues(v3[0], v3[1], v3[2], 0));
  }

  constructor(spheres: Sphere[], vertices: Vertex[], indices: vec3[]) {
    this.spheres = spheres;
    this.vertices = vertices;
    this.indices = this.padVec3ToVec4(indices);
  }
}
