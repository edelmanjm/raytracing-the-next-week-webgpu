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

export interface Scene {
  shortName: string;
  materials: Material[];
  world: HittableList;
  cameraInitializationParameters: CameraInitializeParameters;
  // Certain scenes don't perform well with certain numbers of samples (either
  // because they time out or because they don't accumulate enough light). This
  // allows individual scenes to override the default.
  samplesPerFrame: number;
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

export class FourSphere implements Scene {
  shortName: string;
  description: string;
  materials = [
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
    Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
    Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters;

  samplesPerFrame = 10;

  constructor(cam: FourSphereCameraPosition) {
    this.shortName = `output-${cam}`;
    this.description = `Scene ${cam}: `;

    switch (cam) {
      case FourSphereCameraPosition.FRONT:
      default:
        this.cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(50),
          [0, 2, 3],
          [0, 1, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        this.description += 'Front view of four spheres';
        break;
      case FourSphereCameraPosition.WIDE:
        this.cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(110),
          [-2, 2, 1],
          [0, 0, -1],
          [0, 1, 0],
          glMatrix.toRadian(1),
          3.4,
        );
        this.description += 'Wide angle view of four spheres';
        break;
      case FourSphereCameraPosition.TELEPHOTO:
        this.cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(45),
          [-2, 2, 1],
          [0, 0, -1],
          [0, 1, 0],
          glMatrix.toRadian(10),
          3.4,
        );
        this.description += 'Telephoto view of four spheres with depth of field';
        break;
      case FourSphereCameraPosition.TOP:
        this.cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(50),
          [0, 10, 0.1],
          [0, 0, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        this.description += 'Top view of three spheres';
        break;
      case FourSphereCameraPosition.REFLECTION_DETAIL:
        this.cameraInitializationParameters = new CameraInitializeParameters(
          glMatrix.toRadian(15),
          [0, 2, 3],
          [0, 1, 0],
          [0, 1, 0],
          glMatrix.toRadian(0.1),
          5,
        );
        this.description += 'View of reflection of three spheres';
        break;
    }

    this.world = HittableList.fromGeometry(
      [
        { center: [0.0, 0.0, -1.0], radius: 0.5, mat: 0 },
        { center: [0.0, -100.5, -1.0], radius: 100, mat: 1 },
        { center: [-1.0, 0.0, -1.0], radius: 0.5, mat: 4 },
        { center: [1.0, 0.0, -1.0], radius: 0.5, mat: 3 },
        { center: [0.0, 1.0, -2.0], radius: 1.0, mat: 2 },
      ],
      [],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class FinalScene implements Scene {
  shortName = 'output-5';
  static description: string = 'Scene 5: Many random spheres (final scene)';
  materials: Material[] = [];
  world: HittableList;
  cameraInitializationParameters = new CameraInitializeParameters(
    glMatrix.toRadian(20),
    [13, 2, 3],
    [0, 0, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.6),
    10.0,
  );
  samplesPerFrame = 10;

  constructor() {
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

          this.materials.push(sphereMaterial);
          spheres.push({ center: center, radius: 0.2, mat: this.materials.length - 1 });
        }
      }
    }

    this.materials.push(Material.createLambertian({ albedo: [0.5, 0.5, 0.5] }, 0.0));
    spheres.push({ center: [0, -1000, 0], radius: 1000, mat: this.materials.length - 1 });

    this.materials.push(Material.createDielectric({ ior: 1.5 }, 0.0));
    spheres.push({ center: [0, 1, 0], radius: 1.0, mat: this.materials.length - 1 });

    this.materials.push(Material.createLambertian({ albedo: [0.4, 0.2, 0.1] }, 0.0));
    spheres.push({ center: [-4, 1, 0], radius: 1.0, mat: this.materials.length - 1 });

    this.materials.push(Material.createMetal({ albedo: [0.7, 0.6, 0.5], fuzz: 0.0 }, 0.0));
    spheres.push({ center: [4, 1, 0], radius: 1.0, mat: this.materials.length - 1 });

    this.world = HittableList.fromGeometry(spheres, [], new Background(true, [0, 0, 0]));
  }
}

export class SimpleMesh implements Scene {
  shortName: string = 'output-6';
  static description: string = 'Scene 6: A single torus mesh';
  materials = [
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.9), // Lambertian green
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters = new CameraInitializeParameters(
    glMatrix.toRadian(50),
    [0, 5, 0.5],
    [0, 4.25, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.1),
    5,
  );

  samplesPerFrame = 5;

  constructor() {
    this.world = HittableList.fromGeometry(
      [],
      [new Mesh(...readObj(torus), 0)],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class MeshShowcase implements Scene {
  shortName: string = 'output-7';
  static description: string = 'Scene 7: Multiple meshes';
  materials = [
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
    Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
    Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters = new CameraInitializeParameters(
    glMatrix.toRadian(50),
    [0, 2, 3],
    [0, 1, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.1),
    5,
  );

  samplesPerFrame = 2;

  constructor() {
    this.world = HittableList.fromGeometry(
      [
        { center: [-1.7, 1.0, -2.0], radius: 0.5, mat: 2 },
        { center: [1.7, 1.0, -2.0], radius: 0.5, mat: 4 },
      ],
      [
        new Mesh(...readObj(monkey), 0),
        new Mesh(...readObj(torus), 3),
        new Mesh(...readObj(plane), 1),
      ],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class BvhTest implements Scene {
  shortName: string = 'bvh-test';
  static description: string = 'BVH test';
  materials = [
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
    Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.5), // Lambertian green
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters = new CameraInitializeParameters(
    glMatrix.toRadian(50),
    [0, 2, 3],
    [0, 1, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.1),
    5,
  );

  samplesPerFrame = 10;

  constructor() {
    this.world = HittableList.fromGeometry(
      [],
      [new Mesh(...readObj(monkey), 0), new Mesh(...readObj(torus), 1)],
      // [
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, 1, 2, -1, -1),
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, -1, -1, -1, 0),
      //   new Bvh({ min: [-3, -3, -3], max: [3, 3, 3] }, -1, -1, -1, 1),
      // ],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class EmissionTest implements Scene {
  shortName: string = 'emission-test';
  static description: string = 'Emission test';
  materials = [
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
    Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
    Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
    Material.createEmissive({ emissivity: [100.0, 1.0, 1.0] }),
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters = new CameraInitializeParameters(
    glMatrix.toRadian(50),
    [0, 2, 3],
    [0, 1, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.1),
    5,
  );

  samplesPerFrame = 10;

  constructor() {
    this.world = HittableList.fromGeometry(
      [
        { center: [0.0, 0.0, -1.0], radius: 0.5, mat: 5 },
        { center: [-1.0, 0.0, -1.0], radius: 0.5, mat: 0 },
        { center: [1.0, 0.0, -1.0], radius: 0.5, mat: 3 },
        { center: [0.0, 1.0, -2.0], radius: 1.0, mat: 2 },
      ],
      [new Mesh(...readObj(plane2), 0)],
      new Background(true, [0, 0, 0]),
    );
  }
}

export class CornellBox implements Scene {
  shortName: string = 'cornell-box';
  static description: string = 'Scene 8: A Cornell box with three spheres with different materials';
  materials = [
    Material.createLambertian({ albedo: [1.0, 1.0, 1.0] }, 0.0),
    Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1),
    Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.1),
    Material.createLambertian({ albedo: [0.0, 0.0, 1.0] }, 0.1),
    Material.createEmissive({ emissivity: [50.0, 50.0, 50.0] }),
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
    Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
    Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
  ];

  world: HittableList;

  cameraInitializationParameters: CameraInitializeParameters = new CameraInitializeParameters(
    glMatrix.toRadian(75),
    [4.75, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    glMatrix.toRadian(0.1),
    5,
  );

  samplesPerFrame = 20;

  constructor() {
    this.world = HittableList.fromGeometry(
      [
        { center: [-3.0, -3.0, -3.0], radius: 1.25, mat: 3 },
        { center: [-3.0, -3.0, 0.0], radius: 1.25, mat: 5 },
        { center: [-3.0, -3.0, 3.0], radius: 1.25, mat: 7 },
        // { center: [-1.0, 0, 0], radius: 0.25, mat: 3 },
      ],
      [
        new Mesh(...readObj(boxWhite), 0),
        new Mesh(...readObj(boxRed), 1),
        new Mesh(...readObj(boxGreen), 2),
        new Mesh(...readObj(boxLight), 4),
      ],
      new Background(false, [0, 0, 0]),
    );
  }
}
