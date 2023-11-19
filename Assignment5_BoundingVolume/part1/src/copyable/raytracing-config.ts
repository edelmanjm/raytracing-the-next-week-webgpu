import { vec4 } from 'gl-matrix';

export interface RaytracingConfig {
  samples_per_pixel: number;
  max_depth: number;
  rand_seed: vec4;
  weight: number;
  use_bvhs: number;
}
