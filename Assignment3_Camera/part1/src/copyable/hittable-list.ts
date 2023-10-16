import { vec3 } from 'gl-matrix';

export interface Sphere {
  center: vec3;
  radius: number;
  mat: number;
}

export class HittableList {
  spheres: Sphere[];
  spheres_size: number;

  constructor(spheres: Sphere[]) {
    this.spheres = spheres;
    this.spheres_size = spheres.length;
  }
}
