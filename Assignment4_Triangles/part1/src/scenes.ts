import { Material } from './copyable/materials.js';
import { HittableList, Mesh, Sphere } from './copyable/hittable-list.js';
import { CameraInitializeParameters } from './copyable/camera-initialize-parameters.js';
import { glMatrix, vec3 } from 'gl-matrix';
import { interleaveVertexData } from 'webgpu-utils';
import { readObj } from './obj-reader.js';
import cube from './objs/cube.obj';

export interface Scene {
  shortName: string;
  materials: Material[];
  world: HittableList;
  cameraInitializationParameters: CameraInitializeParameters;
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

    let [vertices, indices] = readObj(cube);

    this.world = new HittableList(
      [
        // { center: [0.0, 0.0, -1.0], radius: 0.5, mat: 0 },
        { center: [0.0, -100.5, -1.0], radius: 100, mat: 1 },
        // { center: [-1.0, 0.0, -1.0], radius: 0.5, mat: 4 },
        // { center: [1.0, 0.0, -1.0], radius: 0.5, mat: 3 },
        // { center: [0.0, 1.0, -2.0], radius: 1.0, mat: 2 },
      ],
      [new Mesh(vertices, indices, 0)],
    );
  }
}

export class FinalScene implements Scene {
  shortName = 'output-10';
  static description: string = 'Scene 10: Many random spheres (final scene)';
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

    this.world = new HittableList(spheres, []);
  }
}
