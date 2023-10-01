// ----------------------------------------------------------------------------
// Begin ray

struct ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
    strength: f32
}

fn ray_at(r: ray, t: f32) -> vec3<f32> {
    return r.origin + t * r.direction;
}
// End ray
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Color

alias color = vec3<f32>;
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin utility functions
fn length_squared(v: vec3<f32>) -> f32 {
    let l = length(v);
    return l * l;
}

fn near_zero(v: vec3<f32>) -> bool {
    // Return true if the vector is close to zero in all dimensions.
    const s = 1e-8;
    return length(v) < s;
}

fn reflect(v: vec3<f32>, n: vec3<f32>) -> vec3<f32> {
    return v - 2 * dot(v, n) * n;
}

fn refract(uv: vec3<f32>, n: vec3<f32>, etai_over_etat: f32) -> vec3<f32> {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp =  etai_over_etat * (uv + cos_theta*n);
    let r_out_parallel = -sqrt(abs(1.0 - length_squared(r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}

// End utility functions
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Random

// Implementation copied from https://webgpu.github.io/webgpu-samples/samples/particles#./particle.wgsl
var<private> rand_seed : vec2<f32>;

fn init_rand(invocation_id : u32, seed : vec4<f32>) {
  rand_seed = seed.xz;
  rand_seed = fract(rand_seed * cos(35.456+f32(invocation_id) * seed.yw));
  rand_seed = fract(rand_seed * cos(41.235+f32(invocation_id) * seed.xw));
}

fn random_f32() -> f32 {
  rand_seed.x = fract(cos(dot(rand_seed, vec2<f32>(23.14077926, 232.61690225))) * 136.8168);
  rand_seed.y = fract(cos(dot(rand_seed, vec2<f32>(54.47856553, 345.84153136))) * 534.7645);
  return rand_seed.y;
}

fn random_range_f32(min: f32, max: f32) -> f32 {
    return mix(min, max, random_f32());
}

fn random_vec3f() -> vec3<f32> {
    return vec3(random_f32(), random_f32(), random_f32());
}

fn random_range_vec3f(min: f32, max: f32) -> vec3<f32> {
    return vec3(random_range_f32(min, max), random_range_f32(min, max), random_range_f32(min, max));
}

fn random_in_unit_sphere() -> vec3<f32> {
    loop {
        let p = random_range_vec3f(-1, 1);
        if (length_squared(p) < 1) {
            return p;
        }
    }
}

fn random_unit_vector() -> vec3<f32> {
    return normalize(random_in_unit_sphere());
}

fn random_on_hemisphere(normal: vec3<f32>) -> vec3<f32> {
    let on_unit_sphere = random_unit_vector();
    if (dot(on_unit_sphere, normal) > 0.0) { // In the same hemisphere as the normal
        return on_unit_sphere;
    } else {
        return -on_unit_sphere;
    }
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin materials

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

fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0 = (1 - ref_idx) / (1 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1 - r0) * pow((1 - cosine), 5);
}

// Returns the percentage of light that was scattered
fn scatter(mat: material, r_in: ray, rec: hit_record, attenuation: ptr<function, color>, scattered: ptr<function, ray>) -> bool {
    switch (mat.ty) {
        case MATERIAL_TYPE_LAMBERTIAN {
            var scatter_direction = rec.normal + random_unit_vector();

            if (near_zero(scatter_direction)) {
                scatter_direction = rec.normal;
            }

            (*scattered) = ray(rec.p, scatter_direction, r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.lambertian.albedo * r_in.strength;
            return true;
        }
        case MATERIAL_TYPE_METAL {
            let reflected: vec3<f32> = reflect(normalize(r_in.direction), rec.normal);
            (*scattered) = ray(rec.p,
                               reflected + mat.metal.fuzz * random_unit_vector(),
                               r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.metal.albedo * r_in.strength;
            return dot((*scattered).direction, rec.normal) > 0;
        }
        case MATERIAL_TYPE_DIELECTRIC {
            (*attenuation) = color(1.0, 1.0, 1.0) * r_in.strength;
            var refraction_ratio: f32;
            if (rec.front_face) {
                refraction_ratio = 1.0 / mat.dielectric.ior;
            } else {
                refraction_ratio = mat.dielectric.ior;
            }

            let unit_direction = normalize(r_in.direction);
            let cos_theta = min(dot(-unit_direction, rec.normal), 1.0);
            let sin_theta = sqrt(1.0 - cos_theta*cos_theta);

            let cannot_refract = refraction_ratio * sin_theta > 1.0;
            var direction: vec3<f32>;
            if (cannot_refract || reflectance(cos_theta, refraction_ratio) > random_f32()) {
                direction = reflect(unit_direction, rec.normal);
            } else {
                direction = refract(unit_direction, rec.normal, refraction_ratio);
            }

            (*scattered) = ray(rec.p, direction, r_in.strength * (1.0 - mat.absorption));
            return true;
        }
        default {
            return false;
        }
    }
}
// End Materials
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin hittable objects
struct hit_record {
    p: vec3<f32>,
    normal: vec3<f32>,
    mat: material,
    t: f32,
    front_face: bool
}

fn set_face_normal(record: ptr<function, hit_record>, r: ray, outward_normal: vec3<f32>) {
    // Sets the hit record normal vector.
    // NOTE: the parameter outward_normal is assumed to have unit length.

    (*record).front_face = dot(r.direction, outward_normal) < 0;
    if ((*record).front_face) {
        (*record).normal = outward_normal;
    } else {
        (*record).normal = -outward_normal;
    }
}

// No inheritance is available in WGSL

struct sphere {
    center: vec3<f32>,
    radius: f32,
    mat: material,
}

fn hit_sphere(s: sphere, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    let oc = r.origin - s.center;
    let a = length_squared(r.direction);
    let half_b = dot(oc, r.direction);
    let c = length_squared(oc) - s.radius * s.radius;

    let discriminant = half_b * half_b - a * c;
    if (discriminant < 0) {
        return false;
    }
    let sqrtd = sqrt(discriminant);

    // Find the nearest root that lies in the acceptable range.
    var root = (-half_b - sqrtd) / a;
    if (root <= ray_tmin || ray_tmax <= root) {
        root = (-half_b + sqrtd) / a;
        if (root <= ray_tmin || ray_tmax <= root) {
            return false;
        }
    }

    (*rec).t = root;
    (*rec).p = ray_at(r, root);
    let outward_normal = ((*rec).p - s.center) / s.radius;
    set_face_normal(rec, r, outward_normal);
    (*rec).mat = s.mat;

    return true;
}

const MAX_NUMBER_SPHERES = 10;
struct hittable_list {
    spheres: array<sphere, MAX_NUMBER_SPHERES>,
    spheres_size: u32,
}

fn hittable_list_add_sphere(list: ptr<function, hittable_list>, s: sphere) {
    (*list).spheres[(*list).spheres_size] = s;
    (*list).spheres_size += 1;
}

fn hit_hittable_list(list: ptr<function, hittable_list>, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    var temp_rec: hit_record;
    var hit_anything: bool = false;
    var closest_so_far: f32 = ray_tmax;

    for (var i: u32 = 0; i < (*list).spheres_size; i++) {
        if (hit_sphere((*list).spheres[i], r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    return hit_anything;
}
// End hittable objects
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin camera
struct camera {
    width: u32,
    height: u32,
    origin: vec3<f32>,
    horizontal: vec3<f32>,
    vertical: vec3<f32>,
    lower_left_corner: vec3<f32>,
    samples_per_pixel: u32,
}

fn camera_initialize(cam: ptr<function, camera>) {
    (*cam).width = ${width};
    (*cam).height = ${height};

    const aspect_ratio: f32 = ${width} / ${height};

    const viewport_height = 2.0;
    let viewport_width = aspect_ratio * viewport_height;
    const focal_length = 1.0;

    (*cam).origin = vec3(0.0, 0.0, 0.0);
    (*cam).horizontal = vec3(viewport_width, 0.0, 0.0);
    (*cam).vertical = vec3(0.0, viewport_height, 0.0);
    (*cam).lower_left_corner = (*cam).origin - (*cam).horizontal / 2 - (*cam).vertical / 2 - vec3(0, 0, focal_length);

    (*cam).samples_per_pixel = 5;
}

fn render(cam: ptr<function, camera>, world: ptr<function, hittable_list>, offset: u32) -> color {
    // Compute current x,y
    let x = f32(offset % (*cam).width);
    let y = f32((*cam).height) - f32(offset / (*cam).width); // Flip Y so Y+ is up

    // Render
    var pixel_color = color(0,0,0);
    for (var sample: u32 = 0; sample < (*cam).samples_per_pixel; sample += 1) {
        let u = (x + random_f32()) / f32((*cam).width - 1);
        let v = (y + random_f32()) / f32((*cam).height - 1);
        let r = ray((*cam).origin,
                    (*cam).lower_left_corner + u * (*cam).horizontal + v * (*cam).vertical - (*cam).origin,
                    1.0);
        pixel_color += ray_color(r, world);
    }

    // Divide the color by the number of samples.
    pixel_color /= f32((*cam).samples_per_pixel);
    return pixel_color;
}
// End camera
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin main

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

const infinity = 3.402823466e+38;

fn ray_color(r: ray, world: ptr<function, hittable_list>) -> color {
    var rec: hit_record;
    var current_ray: ray = r;
    var max_depth = 100;
    var c: color = color(1.0, 1.0, 1.0);

    // No recusion available
    for (var depth = 0; depth < max_depth; depth += 1) {
        if (hit_hittable_list(world, current_ray, 0.001, infinity, &rec)) {
            var scattered: ray;
            var attenuation: color;
            if (scatter(rec.mat, current_ray, rec, &attenuation, &scattered)) {
                c *= attenuation;
                current_ray = scattered;
            }
        } else {
            // Sky
            let unit_direction = normalize(r.direction);
            let t = 0.5 * (unit_direction.y + 1.0);
            c *= (1.0 - t) * color(1.0, 1.0, 1.0) + t * color(0.5, 0.7, 1.0);
            break;
        }
    }

    return c;
}

fn color_to_u32(c : color) -> u32 {
    let r = u32(c.r * 255.0);
    let g = u32(c.g * 255.0);
    let b = u32(c.b * 255.0);
    let a = 255u;

    // bgra8unorm
    return (a << 24) | (r << 16) | (g << 8) | b;

    // rgba8unorm
    // return (a << 24) | (b << 16) | (g << 8) | r;
}

fn write_color(offset: u32, pixel_color: color, samples_per_pixel: u32) {
    // Gamma correction
    // Gamma Requirement
    var c = sqrt(pixel_color);

    output[offset] = color_to_u32(c);
}

@compute @workgroup_size(${wgSize})
fn main(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    ) {
        init_rand(global_invocation_id.x, vec4(vec3<f32>(global_invocation_id), 1.0));

        // Materials Requirement
        var material_lambertian_green: material;
        material_lambertian_green.ty = MATERIAL_TYPE_LAMBERTIAN;
        material_lambertian_green.lambertian.albedo = color(0.0, 1.0, 0.0);
        material_lambertian_green.absorption = 0.5;

        var material_lambertian_red: material;
        material_lambertian_red.ty = MATERIAL_TYPE_LAMBERTIAN;
        material_lambertian_red.lambertian.albedo = color(1.0, 0.0, 0.0);
        material_lambertian_red.absorption = 0.1;

        // Reflection Requirement
        var material_metal_bluegrey_glossy: material;
        material_metal_bluegrey_glossy.ty = MATERIAL_TYPE_METAL;
        material_metal_bluegrey_glossy.metal.albedo = color(0.3, 0.3, 0.5);
        material_metal_bluegrey_glossy.metal.fuzz = 0.0;
        material_metal_bluegrey_glossy.absorption = 0.0;

        var material_metal_bluegrey_rough: material;
        material_metal_bluegrey_rough.ty = MATERIAL_TYPE_METAL;
        material_metal_bluegrey_rough.metal.albedo = color(0.3, 0.3, 0.5);
        material_metal_bluegrey_rough.metal.fuzz = 0.5;
        material_metal_bluegrey_rough.absorption = 0.0;

        var material_dielectric: material;
        material_dielectric.ty = MATERIAL_TYPE_DIELECTRIC;
        material_dielectric.dielectric.ior = 1.5;
        material_dielectric.absorption = 0.2;

        // World
        // Sphere Requirement
        var world: hittable_list;
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0.0, 0.0, -1.0), 0.5, material_lambertian_green));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0.0, -100.5, -1.0), 100, material_lambertian_red));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(-1.0, 0.0, -1.0), 0.5, material_dielectric));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(1.0, 0.0, -1.0), 0.5, material_metal_bluegrey_rough));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0.0, 1.0, -2.0), 1.0, material_metal_bluegrey_glossy));

        var cam: camera;
        camera_initialize(&cam);

        let offset = global_invocation_id.x;

        var c: color = render(&cam, &world, offset);

        write_color(offset, c, cam.samples_per_pixel);
}
// End main
// ----------------------------------------------------------------------------
