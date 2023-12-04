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
  // nx: number;
  // ny: number;
  // nz: number;
  // Texture coordinates
  // u: number;
  // v: number;
}

export class Mesh {
  vertices: Vertex[];
  vertices_length: number;
  indices: vec4[];
  indices_length: number;
  mat: number;

  padVec3ToVec4(input: vec3[], paddingValue: number = 0): vec4[] {
    return input.map(v3 => vec4.fromValues(v3[0], v3[1], v3[2], paddingValue));
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

  // Bounding Volume requirement

  static fromSphere(s: Sphere): Aabb {
    let rvec: vec3 = [s.radius, s.radius, s.radius];
    let min: vec3 = [0, 0, 0];
    let max: vec3 = [0, 0, 0];
    return new Aabb(vec3.sub(min, s.center, rvec), vec3.add(max, s.center, rvec));
  }

  static fromMesh(m: Mesh): Aabb {
    let xs: number[] = m.vertices.map(v => v.px);
    let ys: number[] = m.vertices.map(v => v.py);
    let zs: number[] = m.vertices.map(v => v.pz);

    let minimums: number[] = [];
    let maximums: number[] = [];

    [xs, ys, zs].forEach(values => {
      let min = Math.min(...values);
      let max = Math.max(...values);
      if (min == max) {
        // Add a fudge factor
        min -= 0.0001;
        max += 0.0001;
      }
      minimums.push(min);
      maximums.push(max);
    });

    return new Aabb(
      [minimums[0], minimums[1], minimums[2]],
      [maximums[0], maximums[1], maximums[2]],
    );
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

enum AabbType {
  SPHERE,
  MESH,
}

interface AabbEncapsulation {
  box: Aabb;
  type: AabbType;
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

export class Background {
  use_sky: number;
  albedo: vec3;

  constructor(useSky: boolean, albedo: vec3) {
    this.use_sky = useSky ? 1 : 0;
    this.albedo = albedo;
  }
}

export class HittableList {
  spheres: Sphere[];
  meshes: Mesh[];
  bvhs: Bvh[];
  bg: Background;

  constructor(spheres: Sphere[], meshes: Mesh[], bvhs: Bvh[], bg: Background) {
    this.spheres = spheres;
    this.meshes = meshes;
    this.bvhs = bvhs;
    this.bg = bg;
  }

  static async fromGeometry(spheres: Sphere[], meshes: Mesh[], bg: Background) {
    const addIndex = <T>(values: T[]): [number, T][] => values.map((v, i) => [i, v]);
    const mappedSpheres = spheres.map(s => {
      let potato: AabbEncapsulation = {
        box: Aabb.fromSphere(s),
        type: AabbType.SPHERE,
      };
      return potato;
    });
    const mappedMeshes = meshes.map(m => {
      let potato: AabbEncapsulation = {
        box: Aabb.fromMesh(m),
        type: AabbType.MESH,
      };
      return potato;
    });
    return new HittableList(
      spheres,
      meshes,
      await HittableList.buildBvh([...addIndex(mappedSpheres), ...addIndex(mappedMeshes)]),
      bg,
    );
  }

  /**
   * Return a list of BVHs, with the BVH for the provided geometry at the 0th index.
   * @param bbs A series of tuples with bounding boxes and the corresponding indices of said bounding boxes in the sphere/mesh lists.
   * @param startIndex The starting index for the left_index/right_index properties of the BVHs to be returned. Used for the recursive calls.
   */
  static async buildBvh(bbs: [number, AabbEncapsulation][]): Promise<Bvh[]> {
    if (bbs.length == 1) {
      let [i, bb] = bbs[0];
      switch (bb.type) {
        case AabbType.MESH:
          return [new Bvh(bb.box, -1, -1, -1, i)];
        case AabbType.SPHERE:
          return [new Bvh(bb.box, -1, -1, i, -1)];
        default:
          // Unreachable
          break;
      }
    } else {
      const sorted: [number, AabbEncapsulation][] = Array.from(bbs).sort(([_, s0], [__, s1]) => {
        const axis: number = Math.floor(Math.random() * 3);

        const center0: vec3 = vec3.create();
        vec3.add(center0, s0.box.min, s0.box.max);
        vec3.scale(center0, center0, 0.5);
        const center1: vec3 = vec3.create();
        vec3.add(center1, s1.box.min, s1.box.max);
        vec3.scale(center1, center1, 0.5);

        return center0[axis] - center1[axis];
      });

      const midpoint = sorted.length / 2;
      return Promise.all([
        this.buildBvh(sorted.slice(0, midpoint)),
        this.buildBvh(sorted.slice(midpoint)),
      ]).then(promises => {
        let [leftUnfixed, rightUnfixed] = promises;

        // I tried switching the BVH traversal algorithm to use offsets on the WGSL side, but for whatever reason changing even
        // stack[size] = b.left_index; to stack[size] = b.left_index + 0; causes the program to hang, even if BVHs are disabled.
        // So we're going to recalculate the offsets here.
        let left = leftUnfixed.map(
          b =>
            new Bvh(
              b.box,
              b.left_index > 0 ? b.left_index + 1 : -1,
              b.right_index > 0 ? b.right_index + 1 : -1,
              b.sphere_index,
              b.mesh_index,
            ),
        );
        let right = rightUnfixed.map(
          b =>
            new Bvh(
              b.box,
              b.left_index > 0 ? b.left_index + left.length + 1 : -1,
              b.right_index > 0 ? b.right_index + left.length + 1 : -1,
              b.sphere_index,
              b.mesh_index,
            ),
        );
        return [
          new Bvh(Aabb.fromAabbs(left[0].box, right[0].box), 1, left.length + 1, -1, -1),
          ...left,
          ...right,
        ];
      });
    }
    // Unreachable
    return Promise.resolve([]);
  }
}
