import { Material } from './copyable/materials.js';
import { HittableList, Sphere } from './copyable/hittable-list.js';
import { CameraInitializeParameters } from './copyable/camera-initialize-parameters.js';
import { glMatrix } from 'gl-matrix';

export interface Scene {
  description: string;
  getMaterials(): Material[];
  getWorld(): HittableList;
  getCameraInitializationParameters(): CameraInitializeParameters;
}

export class ThreeSphere implements Scene {
  description: string = 'Three spheres or something idk';

  getMaterials(): Material[] {
    return [
      Material.createLambertian({ albedo: [0.0, 1.0, 0.0] }, 0.5), // Lambertian green
      Material.createLambertian({ albedo: [1.0, 0.0, 0.0] }, 0.1), // Lambertian red
      Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.0 }, 0.0), // Metal blue-grey glossy
      Material.createMetal({ albedo: [0.3, 0.3, 0.5], fuzz: 0.5 }, 0.0), // Metal blue-grey rough
      Material.createDielectric({ ior: 1.5 }, 0.2), // Dielectric
    ];
  }

  getWorld(): HittableList {
    let spheres: Sphere[] = [
      { center: [0.0, 0.0, -1.0], radius: 0.5, mat: 0 },
      { center: [0.0, -100.5, -1.0], radius: 100, mat: 1 },
      { center: [-1.0, 0.0, -1.0], radius: 0.5, mat: 4 },
      { center: [1.0, 0.0, -1.0], radius: 0.5, mat: 3 },
      { center: [0.0, 1.0, -2.0], radius: 1.0, mat: 2 },
    ];
    return new HittableList(spheres);
  }

  getCameraInitializationParameters(): CameraInitializeParameters {
    return new CameraInitializeParameters(
      glMatrix.toRadian(45),
      [-2, 2, 1],
      [0, 0, -1],
      [0, 1, 0],
      glMatrix.toRadian(10),
      3.4,
    );
  }

  // TODO randomized materials in a way that's not painful
}
