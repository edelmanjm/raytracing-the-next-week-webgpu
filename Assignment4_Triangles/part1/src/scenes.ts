import { Material } from './copyable/materials.js';
import { HittableList, Sphere } from './copyable/hittable-list.js';
import { CameraInitializeParameters } from './copyable/camera-initialize-parameters.js';
import { glMatrix, vec3 } from 'gl-matrix';
import { interleaveVertexData } from 'webgpu-utils';
import { readObj } from './obj-reader.js';

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

    let [vertices, indices] = readObj(`
# Blender 3.6.1
# www.blender.org
mtllib cube.mtl
o Cube
v -1.375141 -1.000000 -2.350429
v -1.375141 1.000000 -2.350429
v -0.330134 -1.000000 -4.055703
v -0.330134 1.000000 -4.055703
v 0.330134 -1.000000 -1.305422
v 0.330134 1.000000 -1.305422
v 1.375141 -1.000000 -3.010697
v 1.375141 1.000000 -3.010697
vn -0.8526 -0.0000 -0.5225
vn 0.5225 -0.0000 -0.8526
vn 0.8526 -0.0000 0.5225
vn -0.5225 -0.0000 0.8526
vn -0.0000 -1.0000 -0.0000
vn -0.0000 1.0000 -0.0000
vt 0.625000 0.000000
vt 0.375000 0.250000
vt 0.375000 0.000000
vt 0.625000 0.250000
vt 0.375000 0.500000
vt 0.625000 0.500000
vt 0.375000 0.750000
vt 0.625000 0.750000
vt 0.375000 1.000000
vt 0.125000 0.750000
vt 0.125000 0.500000
vt 0.875000 0.500000
vt 0.625000 1.000000
vt 0.875000 0.750000
s 0
f 2/1/1 3/2/1 1/3/1
f 4/4/2 7/5/2 3/2/2
f 8/6/3 5/7/3 7/5/3
f 6/8/4 1/9/4 5/7/4
f 7/5/5 1/10/5 3/11/5
f 4/12/6 6/8/6 8/6/6
f 2/1/1 4/4/1 3/2/1
f 4/4/2 8/6/2 7/5/2
f 8/6/3 6/8/3 5/7/3
f 6/8/4 2/13/4 1/9/4
f 7/5/5 5/7/5 1/10/5
f 4/12/6 2/14/6 6/8/6
`);

    this.world = new HittableList(
      [
        { center: [-0.5, 0.0, -1.0], radius: 0.01, mat: 0 },
        // { center: [0.0, -100.5, -1.0], radius: 100, mat: 1 },
        // { center: [-1.0, 0.0, -1.0], radius: 0.5, mat: 4 },
        // { center: [1.0, 0.0, -1.0], radius: 0.5, mat: 3 },
        // { center: [0.0, 1.0, -2.0], radius: 1.0, mat: 2 },
      ],
      vertices,
      indices,
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

    this.world = new HittableList(spheres, [], []);
  }
}
