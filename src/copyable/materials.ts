import { vec3 } from 'gl-matrix';

interface MaterialLambertian {
  albedo: vec3;
}

interface MaterialMetal {
  albedo: vec3;
  fuzz: number;
}

interface MaterialDielectric {
  ior: number;
}

interface MaterialEmissive {
  emissivity: vec3;
}

interface MaterialIsotropic {
  albedo: vec3;
}

export class Material {
  ty: number;
  lambertian: MaterialLambertian | {};
  metal: MaterialMetal | {};
  dielectric: MaterialDielectric | {};
  emissive: MaterialEmissive | {};
  isotropic: MaterialIsotropic | {};
  absorption: number;

  constructor(
    ty: number,
    lambertian: MaterialLambertian | {},
    metal: MaterialMetal | {},
    dielectric: MaterialDielectric | {},
    emissive: MaterialEmissive | {},
    isotropic: MaterialEmissive | {},
    absorption: number,
  ) {
    this.ty = ty;
    this.lambertian = lambertian;
    this.metal = metal;
    this.dielectric = dielectric;
    this.emissive = emissive;
    this.isotropic = isotropic;
    this.absorption = absorption;
  }

  static createLambertian(mat: MaterialLambertian, absorption: number): Material {
    return new Material(0, mat, {}, {}, {}, {}, absorption);
  }

  static createMetal(mat: MaterialMetal, absorption: number): Material {
    return new Material(1, {}, mat, {}, {}, {}, absorption);
  }

  static createDielectric(mat: MaterialDielectric, absorption: number): Material {
    return new Material(2, {}, {}, mat, {}, {}, absorption);
  }

  static createEmissive(mat: MaterialEmissive): Material {
    return new Material(3, {}, {}, {}, mat, {}, 0.0);
  }

  static createIsotropic(mat: MaterialIsotropic, absorption: number): Material {
    return new Material(4, {}, {}, {}, {}, mat, absorption);
  }
}
