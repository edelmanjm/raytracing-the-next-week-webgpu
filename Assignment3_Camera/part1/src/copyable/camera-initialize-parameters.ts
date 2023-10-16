import { vec3 } from 'gl-matrix';
export class CameraInitializeParameters {
  vfov: number;
  lookfrom: vec3;
  lookat: vec3;
  vup: vec3;
  defocus_angle: number;
  focus_dist: number;

  constructor(
    vfov: number,
    lookfrom: vec3,
    lookat: vec3,
    vup: vec3,
    defocus_angle: number,
    focus_dist: number,
  ) {
    this.vfov = vfov;
    this.lookfrom = lookfrom;
    this.lookat = lookat;
    this.vup = vup;
    this.defocus_angle = defocus_angle;
    this.focus_dist = focus_dist;
  }
}
