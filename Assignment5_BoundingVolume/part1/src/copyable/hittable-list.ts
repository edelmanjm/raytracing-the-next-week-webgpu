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

export interface Aabb {
  min: vec3;
  max: vec3;
}

export class Bvh {
  box: Aabb;
  left_index: number;
  right_index: number;
  sphere_index: number;
  mesh_index: number;

  constructor(
    box: Aabb,
    left_index: number,
    right_index: number,
    sphere_index: number,
    mesh_index: number,
  ) {
    this.box = box;
    this.left_index = left_index;
    this.right_index = right_index;
    this.sphere_index = sphere_index;
    this.mesh_index = mesh_index;
  }
}

export class Mesh {
  vertices: Vertex[];
  vertices_length: number;
  indices: vec4[];
  indices_length: number;
  mat: number;

  padVec3ToVec4(input: vec3[], paddingValue: number = 0): vec4[] {
    return input.map(v3 => vec4.fromValues(v3[0], v3[1], v3[2], 0));
  }

  constructor(vertices: Vertex[], indices: vec3[], mat: number) {
    this.vertices = vertices;
    this.vertices_length = this.vertices.length;
    this.indices = this.padVec3ToVec4(indices);
    this.indices_length = this.indices.length;
    this.mat = mat;
  }
}

export class HittableList {
  spheres: Sphere[];
  meshes: Mesh[];
  bvhs: Bvh[];

  constructor(spheres: Sphere[], meshes: Mesh[], bvhs: Bvh[]) {
    this.spheres = spheres;
    this.meshes = meshes;
    this.bvhs = bvhs;
  }
}
