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

export class Material {
  ty: number;
  lambertian: MaterialLambertian | {};
  metal: MaterialMetal | {};
  dielectric: MaterialDielectric | {};
  emissive: MaterialEmissive | {};
  absorption: number;

  constructor(
    ty: number,
    lambertian: MaterialLambertian | {},
    metal: MaterialMetal | {},
    dielectric: MaterialDielectric | {},
    emissive: MaterialEmissive | {},
    absorption: number,
  ) {
    this.ty = ty;
    this.lambertian = lambertian;
    this.metal = metal;
    this.dielectric = dielectric;
    this.emissive = emissive;
    this.absorption = absorption;
  }

  static createLambertian(mat: MaterialLambertian, absorption: number): Material {
    return new Material(0, mat, {}, {}, {}, absorption);
  }

  static createMetal(mat: MaterialMetal, absorption: number): Material {
    return new Material(1, {}, mat, {}, {}, absorption);
  }

  static createDielectric(mat: MaterialDielectric, absoption: number): Material {
    return new Material(2, {}, {}, mat, {}, absoption);
  }

  static createEmissive(mat: MaterialEmissive): Material {
    return new Material(3, {}, {}, {}, mat, 0.0);
  }
}
