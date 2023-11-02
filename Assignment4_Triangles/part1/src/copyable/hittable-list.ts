import { vec3 } from 'gl-matrix';

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
  indices: Uint32Array;

  padVec3ToVec4(input: vec3[], paddingValue: number = 0): number[] {
    let paddedArray = [];

    for (let i = 0; i < input.length; i += 3) {
      paddedArray.push(...input[i]);
      paddedArray.push(paddingValue);
    }

    return paddedArray;
  }

  constructor(spheres: Sphere[], vertices: Vertex[], indices: vec3[]) {
    this.spheres = spheres;
    this.vertices = vertices;
    this.indices = new Uint32Array(this.padVec3ToVec4(indices));
  }
}
