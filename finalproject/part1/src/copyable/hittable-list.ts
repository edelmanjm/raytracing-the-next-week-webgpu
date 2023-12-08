import { vec3, vec4 } from 'gl-matrix';

export interface Boundable {
  getAabb(): Aabb;
}

export class Sphere implements Boundable {
  center: vec3;
  radius: number;
  mat: number;

  constructor(center: vec3, radius: number, mat: number) {
    this.center = center;
    this.radius = radius;
    this.mat = mat;
  }

  getAabb(): Aabb {
    let rvec: vec3 = [this.radius, this.radius, this.radius];
    let min: vec3 = [0, 0, 0];
    let max: vec3 = [0, 0, 0];
    return new Aabb(vec3.sub(min, this.center, rvec), vec3.add(max, this.center, rvec));
  }
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

export class Mesh implements Boundable {
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

  getAabb(): Aabb {
    let xs: number[] = this.vertices.map(v => v.px);
    let ys: number[] = this.vertices.map(v => v.py);
    let zs: number[] = this.vertices.map(v => v.pz);

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
}

export interface Volume {
  sphere_index: number;
  mesh_index: number;
}

export class VolumeEncapsulation implements Boundable {
  underlyingSphere?: Sphere;
  underlyingMesh?: Mesh;

  private constructor(s: Sphere | null, m: Mesh | null) {
    if (s != null) {
      this.underlyingSphere = s;
    }
    if (m != null) {
      this.underlyingMesh = m;
    }
  }

  static fromSphere(s: Sphere) {
    return new VolumeEncapsulation(s, null);
  }

  static fromMesh(m: Mesh) {
    return new VolumeEncapsulation(null, m);
  }

  getAabb(): Aabb {
    return (
      this.underlyingSphere?.getAabb() ||
      this.underlyingMesh?.getAabb() ||
      new Aabb([0, 0, 0], [0, 0, 0])
    );
  }
}

export class Aabb {
  min: vec3;
  max: vec3;

  constructor(min: vec3, max: vec3) {
    this.min = min;
    this.max = max;
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
  VOLUME,
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
  volume_index: number;

  constructor(
    box: Aabb,
    left_index: number,
    right_index: number,
    sphere_index: number,
    mesh_index: number,
    volume_index: number,
  ) {
    this.box = box;
    this.left_index = left_index;
    this.right_index = right_index;
    this.sphere_index = sphere_index;
    this.mesh_index = mesh_index;
    this.volume_index = volume_index;
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
  spheres_length: number;
  meshes: Mesh[];
  meshes_length: number;
  volumes: Volume[];
  bvhs: Bvh[];
  bg: Background;

  private constructor(
    spheres: Sphere[],
    spheres_length: number,
    meshes: Mesh[],
    meshes_length: number,
    volumes: Volume[],
    bvhs: Bvh[],
    bg: Background,
  ) {
    this.spheres = spheres;
    this.spheres_length = spheres_length;
    this.meshes = meshes;
    this.meshes_length = meshes_length;
    this.volumes = volumes;
    this.bvhs = bvhs;
    this.bg = bg;
  }

  static async fromGeometry(
    spheres: Sphere[],
    meshes: Mesh[],
    volumeEncapsulations: VolumeEncapsulation[],
    bg: Background,
  ) {
    let spheresAndVolumes: Sphere[] = Array.from(spheres);
    let meshesAndVolumes: Mesh[] = Array.from(meshes);

    let volumes: Volume[] = volumeEncapsulations.map(v => {
      if (v.underlyingSphere) {
        spheresAndVolumes.push(v.underlyingSphere);
        return { sphere_index: spheresAndVolumes.length - 1, mesh_index: -1 };
      }
      if (v.underlyingMesh) {
        meshesAndVolumes.push(v.underlyingMesh);
        return { sphere_index: -1, mesh_index: meshesAndVolumes.length - 1 };
      }
      throw new Error('Missing underlying type for volume');
    });

    const addIndex = <T>(values: T[]): [number, T][] => values.map((v, i) => [i, v]);
    const mappedSpheres = spheres.map(s => {
      let potato: AabbEncapsulation = {
        box: s.getAabb(),
        type: AabbType.SPHERE,
      };
      return potato;
    });
    const mappedMeshes = meshes.map(m => {
      let potato: AabbEncapsulation = {
        box: m.getAabb(),
        type: AabbType.MESH,
      };
      return potato;
    });
    const mappedVolumes = volumeEncapsulations.map(v => {
      let potato: AabbEncapsulation = {
        box: v.getAabb(),
        type: AabbType.VOLUME,
      };
      return potato;
    });

    return new HittableList(
      spheresAndVolumes,
      spheres.length,
      meshesAndVolumes,
      meshes.length,
      volumes,
      await HittableList.buildBvh([
        ...addIndex(mappedSpheres),
        ...addIndex(mappedMeshes),
        ...addIndex(mappedVolumes),
      ]),
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
          return [new Bvh(bb.box, -1, -1, -1, i, -1)];
        case AabbType.SPHERE:
          return [new Bvh(bb.box, -1, -1, i, -1, -1)];
        case AabbType.VOLUME:
          return [new Bvh(bb.box, -1, -1, -1, -1, i)];
        default:
          throw new Error('Invalid AABB type');
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
              b.volume_index,
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
              b.volume_index,
            ),
        );
        return [
          new Bvh(Aabb.fromAabbs(left[0].box, right[0].box), 1, left.length + 1, -1, -1, -1),
          ...left,
          ...right,
        ];
      });
    }
  }
}
