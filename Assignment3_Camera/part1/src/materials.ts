interface MaterialLambertian {
  albedo: number[];
}

interface MaterialMetal {
  albedo: number[];
  fuzz: number;
}

interface MaterialDielectric {
  ior: number;
}

export class Material {
  ty: number;
  lambertian: MaterialLambertian | {};
  metal: MaterialMetal | {};
  dielectric: MaterialDielectric | {};
  absorption: number;

  constructor(
    ty: number,
    lambertian: MaterialLambertian | {},
    metal: MaterialMetal | {},
    dielectric: MaterialDielectric | {},
    absorption: number,
  ) {
    this.ty = ty;
    this.lambertian = lambertian;
    this.metal = metal;
    this.dielectric = dielectric;
    this.absorption = absorption;
  }

  static createLambertian(mat: MaterialLambertian, absorption: number): Material {
    return new Material(0, mat, {}, {}, absorption);
  }

  static createMetal(mat: MaterialMetal, absorption: number): Material {
    return new Material(1, {}, mat, {}, absorption);
  }

  static createDielectric(mat: MaterialDielectric, absoption: number): Material {
    return new Material(2, {}, {}, mat, absoption);
  }
}
