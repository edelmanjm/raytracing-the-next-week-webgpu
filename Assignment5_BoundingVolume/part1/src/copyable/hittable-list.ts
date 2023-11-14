import { vec2, vec3, vec4 } from 'gl-matrix';
import { start } from 'repl';

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

export class Aabb {
  min: vec3;
  max: vec3;

  constructor(min: vec3, max: vec3) {
    this.min = min;
    this.max = max;
  }

  static fromSphere(s: Sphere): Aabb {
    let rvec: vec3 = [s.radius, s.radius, s.radius];
    let min: vec3 = [0, 0, 0];
    let max: vec3 = [0, 0, 0];
    return new Aabb(vec3.sub(min, s.center, rvec), vec3.add(max, s.center, rvec));
  }

  static fromAabbs(box0: Aabb, box1: Aabb): Aabb {
    return new Aabb(
      [
        Math.min(box0.min[0], box1.min[0]),
        Math.min(box0.min[1], box1.min[1]),
        Math.min(box0.min[2], box1.min[2]),
      ],
      [
        Math.max(box0.max[0], box1.max[0]),
        Math.max(box0.max[1], box1.max[1]),
        Math.max(box0.max[2], box1.max[2]),
      ],
    );
  }
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

export class HittableList {
  spheres: Sphere[];
  meshes: Mesh[];
  bvhs: Bvh[];

  constructor(spheres: Sphere[], meshes: Mesh[], bvhs: Bvh[]) {
    this.spheres = spheres;
    this.meshes = meshes;
    this.bvhs = bvhs;
  }

  static fromGeometry(spheres: Sphere[], meshes: Mesh[]) {
    const addIndex = <T>(values: T[]): Map<number, T> => new Map(values.map((v, i) => [i, v]));
    return new HittableList(
      spheres,
      meshes,
      HittableList.buildBvh(addIndex(spheres), addIndex(meshes)),
    );
  }

  /**
   * Return a list of BVHs, with the BVH for the provided geometry at the 0th index.
   * @param spheres
   * @param meshes
   * @param startIndex The starting index for the left_index/right_index properties of the BVHs to be returned. Used for the recursive calls.
   */
  static buildBvh(
    spheres: Map<number, Sphere>,
    meshes: Map<number, Mesh>,
    startIndex: number = 0,
  ): Bvh[] {
    if (spheres.size + meshes.size == 1) {
      if (spheres.size == 1) {
        const [i, sphere] = Array.from(spheres.entries())[0];
        return [new Bvh(Aabb.fromSphere(sphere), -1, -1, i, -1)];
      } else if (meshes.size == 1) {
        // TODO
        return [];
      }
    } else {
      // TODO mesh handling
      const sorted: [number, Sphere][] = Array.from(spheres).sort(([i0, s0], [i1, s1]) => {
        const axis: number = Math.floor(Math.random() * 3);
        return s0.center[axis] - s1.center[axis];
      });

      const leftStartIndex = startIndex + 1;
      const left: Bvh[] = this.buildBvh(
        new Map(sorted.slice(0, sorted.length / 2)),
        new Map(),
        leftStartIndex,
      );
      const rightStartIndex = startIndex + left.length + 1;
      const right: Bvh[] = this.buildBvh(
        new Map(sorted.slice(sorted.length / 2)),
        new Map(),
        rightStartIndex,
      );

      return [
        new Bvh(Aabb.fromAabbs(left[0].box, right[0].box), leftStartIndex, rightStartIndex, -1, -1),
        ...left,
        ...right,
      ];
    }
    // Unreachable
    return [];
  }
}
