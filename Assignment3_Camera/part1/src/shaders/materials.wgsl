// ----------------------------------------------------------------------------
// Color

alias color = vec3f;
// ----------------------------------------------------------------------------

alias material_index = u32;

alias material_type = u32;
const MATERIAL_TYPE_LAMBERTIAN : material_type = 0;
const MATERIAL_TYPE_METAL : material_type = 1;
const MATERIAL_TYPE_DIELECTRIC : material_type = 2;

struct material_lambertian {
    albedo: color,
}

struct material_metal {
    albedo: color,
    fuzz: f32,
}

struct material_dielectric {
    ior: f32,
}

struct material {
    ty: material_type,
    lambertian: material_lambertian,
    metal: material_metal,
    dielectric: material_dielectric,
    absorption: f32,
}

@group(0) @binding(1)
var<storage> materials: array<material, 5>;