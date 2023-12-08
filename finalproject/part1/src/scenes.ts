import { Material } from './copyable/materials.js';
import { Background, Bvh, HittableList, Mesh, Sphere } from './copyable/hittable-list.js';
import { CameraInitializeParameters } from './copyable/camera-initialize-parameters.js';
import { glMatrix, vec3 } from 'gl-matrix';
import { readObj } from './obj-reader.js';
import plane from './objs/plane.obj';
import plane2 from './objs/plane-2.obj';
import torus from './objs/torus.obj';
import monkey from './objs/monkey.obj';
import boxWhite from './objs/cornell-box/box-white.obj';
import boxRed from './objs/cornell-box/box-red.obj';
import boxGreen from './objs/cornell-box/box-green.obj';
import boxLight from './objs/cornell-box/box-light.obj';

export abstract class Scene {
  shortName: string;
  description: string;
  materials: Material[];
  private cachedWorld: HittableList | null = null;
  cameraInitializationParameters: CameraInitializeParameters;
  // Certain scenes don't perform well with certain numbers of samples (either
  // because they time out or because they don't accumulate enough light). This
  // allows individual scenes to override the default.
  samplesPerFrame: number;

  constructor(
    shortName: string,
    description: string,
    materials: Material[],
    cameraInitializationParameters: CameraInitializeParameters,
    samplesPerFrame: number = 10,
  ) {
    this.shortName = shortName;
    this.description = description;
    this.materials = materials;
    this.cameraInitializationParameters = cameraInitializationParameters;
    this.samplesPerFrame = samplesPerFrame;
  }

  abstract initWorld(): Promise<HittableList>;

  async getWorld(): Promise<HittableList> {
    if (this.cachedWorld == null) {
      this.cachedWorld = await this.initWorld();
    }
    return this.cachedWorld;
  }
}

function randomVec3(): vec3 {
  return [Math.random(), Math.random(), Math.random()];
}

export enum FourSphereCameraPosition {
  FRONT,
  WIDE,
  TELEPHOTO,
  TOP,
  REFLECTION_DETAIL,
}

export class FourSphere extends Scene {
  constructor(cam: FourSphereCameraPosition) {
    var cameraInitializationParameters;
    let shortName: string = `output-${cam}`;
    let description: string = `Scene ${cam}: `;

    switch (cam) {
      case FourSphereCameraPosition.FRONT:
      default:
        cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(50),
          [0, 2, 3],
          [0, 1, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        description += 'Front view of four spheres';
        break;
      case FourSphereCameraPosition.WIDE:
        cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(110),
          [-2, 2, 1],
          [0, 0, -1],
          [0, 1, 0],
          glMatrix.toRadian(1),
          3.4,
        );
        description += 'Wide angle view of four spheres';
        break;
      case FourSphereCameraPosition.TELEPHOTO:
        cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(45),
          [-2, 2, 1],
          [0, 0, -1],
          [0, 1, 0],
          glMatrix.toRadian(10),
          3.4,
        );
        description += 'Telephoto view of four spheres with depth of field';
        break;
      case FourSphereCameraPosition.TOP:
        cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(50),
          [0, 10, 0.1],
          [0, 0, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        description += 'Top view of three spheres';
        break;
      case FourSphereCameraPosition.REFLECTION_DETAIL:
        cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(15),
          [0, 2, 3],
          [0, 1, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        description += 'View of reflection of three spheres';
        break;
    }

    super(
      shortName,
      description,
      [
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
        Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
        Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
      ],
      cameraInitializationParameters,
    );
  }

  initWorld(): Promise<HittableList> {
    return Promise.resolve(
      HittableList.fromGeometry(
        [
          new Sphere([0.0, 0.0, -1.0], 0.5, 0),
          new Sphere([0.0, -100.5, -1.0], 100, 1),
          new Sphere([-1.0, 0.0, -1.0], 0.5, 4),
          new Sphere([1.0, 0.0, -1.0], 0.5, 3),
          new Sphere([0.0, 1.0, -2.0], 1.0, 2),
        ],
        [],
        [],
        new Background(true, [0, 0, 0]),
      ),
    );
  }
}

export class FinalScene extends Scene {
  spheres: Sphere[] = [];

  constructor() {
    let materials: Material[] = [];
    let spheres: Sphere[] = [];

    // FIXME setting higher seems to break things; is the max size for a uniform (64K) being exceeded?
    const range = 5;
    // Add materials starting from the zero index
    for (let a = -range; a < range; a++) {
      for (let b = -range; b < range; b++) {
        const chooseMat = Math.random();
        const center: vec3 = [a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random()];

        if (vec3.distance(center, [4, 0.2, 0]) > 0.9) {
          let sphereMaterial: Material;
          if (chooseMat < 0.8) {
            // Diffuse
            const albedo: vec3 = [0.0, 0.0, 0.0];
            vec3.mul(albedo, randomVec3(), randomVec3());
            sphereMaterial = Material.createLambertian({ albedo: albedo }, 0.0);
          } else if (chooseMat < 0.95) {
            // Metal
            sphereMaterial = Material.createMetal(
              { albedo: randomVec3(), fuzz: Math.random() * 0.5 },
              0.0,
            );
          } else {
            // Glass
            sphereMaterial = Material.createDielectric({ ior: 1.5 }, 0.0);
          }

          materials.push(sphereMaterial);
          spheres.push(new Sphere(center, 0.2, materials.length - 1));
        }
      }
    }

    materials.push(Material.createLambertian({ albedo: [0.5, 0.5, 0.5] }, 0.0));
    spheres.push(new Sphere([0, -1000, 0], 1000, materials.length - 1));

    materials.push(Material.createDielectric({ ior: 1.5 }, 0.0));
    spheres.push(new Sphere([0, 1, 0], 1.0, materials.length - 1));

    materials.push(Material.createLambertian({ albedo: [0.4, 0.2, 0.1] }, 0.0));
    spheres.push(new Sphere([-4, 1, 0], 1.0, materials.length - 1));

    materials.push(Material.createMetal({ albedo: [0.7, 0.6, 0.5], fuzz: 0.0 }, 0.0));
    spheres.push(new Sphere([4, 1, 0], 1.0, materials.length - 1));

    super(
      'output-5',
      'Scene 5: Many random spheres (final scene)',
      materials,
      new CameraInitializeParameters(
        glMatrix.toRadian(20),
        [13, 2, 3],
        [0, 0, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.6),
        10.0,
      ),
    );

    this.spheres = spheres;
  }

  initWorld(): Promise<HittableList> {
    return Promise.resolve(
      HittableList.fromGeometry(this.spheres, [], [], new Background(true, [0, 0, 0])),
    );
  }
}

export class SimpleMesh extends Scene {
  constructor() {
    super(
      'output-6',
      'Scene 6: A single torus mesh',
      [
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.9), // Lambertian green
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
      ],
      new CameraInitializeParameters(
        glMatrix.toRadian(50),
        [0, 5, 0.5],
        [0, 4.25, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.1),
        5,
      ),
      5,
    );
  }

  initWorld(): Promise<HittableList> {
    return HittableList.fromGeometry(
      [],
      [new Mesh(...readObj(torus), 0)],
      [],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class MeshShowcase extends Scene {
  constructor() {
    super(
      'output-7',
      'Scene 7: Multiple meshes',
      [
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
        Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
        Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
      ],
      new CameraInitializeParameters(
        glMatrix.toRadian(50),
        [0, 2, 3],
        [0, 1, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.1),
        5,
      ),
      2,
    );
  }

  initWorld(): Promise<HittableList> {
    return HittableList.fromGeometry(
      [new Sphere([-1.7, 1.0, -2.0], 0.5, 2), new Sphere([1.7, 1.0, -2.0], 0.5, 4)],
      [
        new Mesh(...readObj(monkey), 0),
        new Mesh(...readObj(torus), 3),
        new Mesh(...readObj(plane), 1),
      ],
      [],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class BvhTest extends Scene {
  constructor() {
    super(
      'bvh-test',
      'BVH test',
      [
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
        Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.5), // Lambertian green
      ],
      new CameraInitializeParameters(
        glMatrix.toRadian(50),
        [0, 2, 3],
        [0, 1, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.1),
        5,
      ),
    );
  }

  initWorld(): Promise<HittableList> {
    return HittableList.fromGeometry(
      [],
      [new Mesh(...readObj(monkey), 0), new Mesh(...readObj(torus), 1)],
      // [
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, 1, 2, -1, -1),
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, -1, -1, -1, 0),
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, -1, -1, -1, 1),
      // ],
      [],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class EmissionTest extends Scene {
  constructor() {
    super(
      'emission-test',
      'Emission test',
      [
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
        Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
        Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
        Material.createEmissive({ emissivity: [100.0, 1.0, 1.0] }),
      ],
      new CameraInitializeParameters(
        glMatrix.toRadian(50),
        [0, 2, 3],
        [0, 1, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.1),
        5,
      ),
    );
  }

  initWorld(): Promise<HittableList> {
    return HittableList.fromGeometry(
      [
        new Sphere([0.0, 0.0, -1.0], 0.5, 5),
        new Sphere([-1.0, 0.0, -1.0], 0.5, 0),
        new Sphere([1.0, 0.0, -1.0], 0.5, 3),
        new Sphere([0.0, 1.0, -2.0], 1.0, 2),
      ],
      [new Mesh(...readObj(plane2), 0)],
      [],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class CornellBox extends Scene {
  constructor() {
    super(
      'cornell-box',
      'Scene 8: A Cornell box with three spheres with different materials',
      [
        Material.createLambertian({ albedo: [1.0, 1.0, 1.0] }, 0.0),
        Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1),
        Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.1),
        Material.createLambertian({ albedo: [0.0, 0.0, 1.0] }, 0.1),
        Material.createEmissive({ emissivity: [50.0, 50.0, 50.0] }),
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
        Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
        Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
      ],
      new CameraInitializeParameters(
        glMatrix.toRadian(75),
        [4.75, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        glMatrix.toRadian(0.1),
        5,
      ),
      20,
    );
  }

  initWorld(): Promise<HittableList> {
    return HittableList.fromGeometry(
      [
        new Sphere([-3.0, -3.0, -3.0], 1.25, 3),
        new Sphere([-3.0, -3.0, 0.0], 1.25, 5),
        new Sphere([-3.0, -3.0, 3.0], 1.25, 7),
        // new Sphere([-1.0, 0, 0], 0.25, 3 },
      ],
      [
        new Mesh(...readObj(boxWhite), 0),
        new Mesh(...readObj(boxRed), 1),
        new Mesh(...readObj(boxGreen), 2),
        new Mesh(...readObj(boxLight), 4),
      ],
      [],
      new Background(false, [0, 0, 0]),
    );
  }
}
