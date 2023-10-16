// ----------------------------------------------------------------------------
// Begin ray

struct ray {
    origin: vec3f,
    direction: vec3f,
    strength: f32
}

fn ray_at(r: ray, t: f32) -> vec3f {
    return r.origin + t * r.direction;
}
// End ray
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Color

alias color = vec3f;
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin utility functions
fn length_squared(v: vec3f) -> f32 {
    let l = length(v);
    return l * l;
}

fn near_zero(v: vec3f) -> bool {
    // Return true if the vector is close to zero in all dimensions.
    const s = 1e-8;
    return length(v) < s;
}

fn reflect(v: vec3f, n: vec3f) -> vec3f {
    return v - 2 * dot(v, n) * n;
}

fn refract(uv: vec3f, n: vec3f, etai_over_etat: f32) -> vec3f {
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

fn random_vec3f() -> vec3f {
    return vec3(random_f32(), random_f32(), random_f32());
}

fn random_range_vec3f(min: f32, max: f32) -> vec3f {
    return vec3(random_range_f32(min, max), random_range_f32(min, max), random_range_f32(min, max));
}

fn random_in_unit_sphere() -> vec3f {
    loop {
        let p = random_range_vec3f(-1, 1);
        if (length_squared(p) < 1) {
            return p;
        }
    }
}

fn random_in_unit_disk() -> vec3f {
    loop {
        let p = vec3f(random_range_f32(-1, 1), random_range_f32(-1, 1), 0);
        if (length_squared(p) < 1) {
            return p;
        }
    }
}

fn random_unit_vector() -> vec3f {
    return normalize(random_in_unit_sphere());
}

fn random_on_hemisphere(normal: vec3f) -> vec3f {
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
var<storage> materials: array<material>;

fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0 = (1 - ref_idx) / (1 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1 - r0) * pow((1 - cosine), 5);
}

// Returns the percentage of light that was scattered
fn scatter(mat_i: material_index, r_in: ray, rec: hit_record, attenuation: ptr<function, color>, scattered: ptr<function, ray>) -> bool {
    let mat = materials[mat_i];
    switch (mat.ty) {
        // case MATERIAL_TYPE_LAMBERTIAN: {
        case 0: {
            var scatter_direction = rec.normal + random_unit_vector();

            if (near_zero(scatter_direction)) {
                scatter_direction = rec.normal;
            }

            (*scattered) = ray(rec.p, scatter_direction, r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.lambertian.albedo * r_in.strength;
            return true;
        }
        // case MATERIAL_TYPE_METAL: {
        case 1: {
            let reflected: vec3f = reflect(normalize(r_in.direction), rec.normal);
            (*scattered) = ray(rec.p,
                               reflected + mat.metal.fuzz * random_unit_vector(),
                               r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.metal.albedo * r_in.strength;
            return dot((*scattered).direction, rec.normal) > 0;
        }
        // case MATERIAL_TYPE_DIELECTRIC: {
        case 2: {
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
            var direction: vec3f;
            if (cannot_refract || reflectance(cos_theta, refraction_ratio) > random_f32()) {
                direction = reflect(unit_direction, rec.normal);
            } else {
                direction = refract(unit_direction, rec.normal, refraction_ratio);
            }

            (*scattered) = ray(rec.p, direction, r_in.strength * (1.0 - mat.absorption));
            return true;
        }
        default: {
            return false;
        }
    }
}
// End materials
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin hittable objects
struct hit_record {
    p: vec3f,
    normal: vec3f,
    mat: material_index,
    t: f32,
    front_face: bool
}

fn set_face_normal(record: ptr<function, hit_record>, r: ray, outward_normal: vec3f) {
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
    center: vec3f,
    radius: f32,
    mat: material_index,
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

const MAX_NUMBER_SPHERES = 110;
struct hittable_list {
    spheres: array<sphere, MAX_NUMBER_SPHERES>,
    spheres_size: u32,
}

@group(0) @binding(2)
var<uniform> world: hittable_list;

fn hit_hittable_list(r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    var temp_rec: hit_record;
    var hit_anything: bool = false;
    var closest_so_far: f32 = ray_tmax;

    for (var i: u32 = 0; i < world.spheres_size; i++) {
        if (hit_sphere(world.spheres[i], r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    return hit_anything;
}

@group(0) @binding(3)
var<storage> test: array<u32>;

// End hittable objects
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin camera
struct camera {
    width: u32,
    height: u32,
    origin: vec3f,
    pixel00_loc: vec3f,
    samples_per_pixel: u32,

    u: vec3f,
    v: vec3f,
    w: vec3f, // Camera frame basis vectors

    viewport_u: vec3f,
    viewport_v: vec3f,

    pixel_delta_u: vec3f, // Offset to pixel to the right
    pixel_delta_v: vec3f, // Offset to pixel below

    defocus_angle: f32, // Variation angle of rays through each pixel
    focus_dist: f32, // Distance from camera lookfrom point to plane of perfect focus

    defocus_disk_u: vec3f, // Defocus disk horizontal radius
    defocus_disk_v: vec3f, // Defocus disk vertical radius
}

fn camera_initialize(cam: ptr<function, camera>, vfov: f32, lookfrom: vec3f, lookat: vec3f, vup: vec3f, defocus_angle: f32, focus_dist: f32) {
    (*cam).width = ${width};
    (*cam).height = ${height};
    (*cam).origin = lookfrom;
    (*cam).defocus_angle = defocus_angle;
    (*cam).focus_dist = focus_dist;

    const aspect_ratio: f32 = ${width} / ${height};

    let focal_length = length(lookfrom - lookat);
    let h = tan(vfov / 2);
    let viewport_height = 2 * h * focal_length;
    let viewport_width = aspect_ratio * viewport_height;

    // Calculate the u,v,w unit basis vectors for the camera coordinate frame.
    (*cam).w = normalize(lookfrom - lookat);
    (*cam).u = normalize(cross(vup, (*cam).w));
    (*cam).v = cross((*cam).w, (*cam).u);

    // Calculate the vectors across the horizontal and down the vertical viewport edges.
    (*cam).viewport_u = viewport_width * (*cam).u; // Vector across viewport horizontal edge
    (*cam).viewport_v = viewport_height * (*cam).v; // Vector down viewport vertical edge

    // Calculate the horizontal and vertical delta vectors to the next pixel.
    (*cam).pixel_delta_u = (*cam).viewport_u / ${width};
    (*cam).pixel_delta_v = (*cam).viewport_v / ${height};

    // Calculate the location of the upper left pixel.
    let viewport_upper_left = (*cam).origin - (focal_length * (*cam).w) - (*cam).viewport_u / 2 - (*cam).viewport_v / 2;
    (*cam).pixel00_loc = viewport_upper_left + 0.5 * ((*cam).pixel_delta_u + (*cam).pixel_delta_v);

    // Calculate the camera defocus disk basis vectors.
    let defocus_radius = focus_dist * tan(defocus_angle / 2);
    (*cam).defocus_disk_u = (*cam).u * defocus_radius;
    (*cam).defocus_disk_v = (*cam).v * defocus_radius;

    (*cam).samples_per_pixel = 100;
}

fn pixel_sample_square(cam: ptr<function, camera>) -> vec3f {
    // Returns a random point in the square surrounding a pixel at the origin.
    let px = -0.5 + random_f32();
    let py = -0.5 + random_f32();
    return (px * (*cam).pixel_delta_u) + (py * (*cam).pixel_delta_v);
}

fn defocus_disk_sample(cam: ptr<function, camera>) -> vec3f {
    // Returns a random point in the camera defocus disk.
    let p = random_in_unit_disk();
    return (*cam).origin + (p[0] * (*cam).defocus_disk_u) + (p[1] * (*cam).defocus_disk_v);
}

fn get_ray(cam: ptr<function, camera>, i: f32, j: f32) -> ray {
    // Get a randomly-sampled camera ray for the pixel at location i,j, originating from
    // the camera defocus disk.

    let pixel_center = (*cam).pixel00_loc + (i * (*cam).pixel_delta_u) + (j * (*cam).pixel_delta_v);
    let pixel_sample = pixel_center + pixel_sample_square(cam);

    var ray_origin: vec3f;
    if ((*cam).defocus_angle <= 0) {
        ray_origin = (*cam).origin;
    } else {
        ray_origin = defocus_disk_sample(cam);
    }
    let ray_direction = pixel_sample - ray_origin;

    return ray(ray_origin, ray_direction, 1.0);
}

fn render(cam: ptr<function, camera>, offset: u32) -> color {
    // Compute current x,y
    let x = f32(offset % (*cam).width);
    let y = f32((*cam).height) - f32(offset / (*cam).width); // Flip Y so Y+ is up

    // Render
    var pixel_color = color(0,0,0);
    for (var sample: u32 = 0; sample < (*cam).samples_per_pixel; sample += 1) {
        let r: ray = get_ray(cam, x, y);
        pixel_color += ray_color(r);
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

fn ray_color(r: ray) -> color {
    var rec: hit_record;
    var current_ray: ray = r;
    var max_depth = 25;
    var c: color = color(1.0, 1.0, 1.0);

    // No recusion available
    for (var depth = 0; depth < max_depth; depth += 1) {
        if (hit_hittable_list(current_ray, 0.001, infinity, &rec)) {
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
        init_rand(global_invocation_id.x, vec4(vec3f(global_invocation_id), 1.0));

        // World
//        var world: hittable_list;

        var cam: camera;

        let scene_index = 0;
        switch (scene_index) {
            case 0: {
                // Camera Requirement
                camera_initialize(&cam, radians(45), vec3(-2, 2, 1), vec3(0, 0, -1), vec3(0, 1, 0), radians(10.0), 3.4);
            }
            default: {

            }
//            case 1: {
//                // Materials Requirement
//                var ground_material: material;
//                ground_material.ty = MATERIAL_TYPE_LAMBERTIAN;
//                ground_material.lambertian.albedo = color(0.5, 0.5, 0.5);
//                ground_material.absorption = 0.5;
//
//                hittable_list_add_sphere(&world, sphere(vec3f(0.0, -1000.0, 0.0), 1000, ground_material));
//
//                // Sphere Requirement
//                for (var a: i32 = -5; a < 5; a++) {
//                    for (var b: i32 = -5; b < 5; b++) {
//                        let choose_mat = (a + b) % 3;
//
//                        // Current random implementation doesn't work well for this, so we'll avoid it for now
//                        let center = vec3f(f32(a), 0.2, f32(b));
//
//                        if (length(center - vec3f(4, 0.2, 0)) > 0.9) {
//                            var sphere_material: material;
//
//                            if (choose_mat == 0) {
//                                // Diffused
//                                sphere_material.ty = MATERIAL_TYPE_LAMBERTIAN;
//                                sphere_material.lambertian.albedo = color(0.5, 0, 0);
//                            } else if (choose_mat == 1) {
//                                // Metal
//                                sphere_material.ty = MATERIAL_TYPE_METAL;
//                                sphere_material.metal.albedo = color(0.0, 0.5, 0.0);
//                                sphere_material.metal.fuzz = 0.2;
//                            } else {
//                                // Glass
//                                sphere_material.ty = MATERIAL_TYPE_DIELECTRIC;
//                                sphere_material.dielectric.ior = 1.5;
//                            }
//
//                            sphere_material.absorption = 1.0;
//                            hittable_list_add_sphere(&world, sphere(center, 0.1, sphere_material));
//                        }
//                    }
//                }
//
//                var big_dielectric_material: material;
//                big_dielectric_material.ty = MATERIAL_TYPE_DIELECTRIC;
//                big_dielectric_material.dielectric.ior = 1.5;
//                hittable_list_add_sphere(&world, sphere(vec3f(0.0, 1.0, 0.0), 1.0, big_dielectric_material));
//
//                var big_lambertian_material: material;
//                big_lambertian_material.ty = MATERIAL_TYPE_LAMBERTIAN;
//                big_lambertian_material.lambertian.albedo = color(0.4, 0.2, 0.1);
//                hittable_list_add_sphere(&world, sphere(vec3f(-4.0, 1.0, 0.0), 1.0, big_lambertian_material));
//
//                var big_metal_material: material;
//                big_metal_material.ty = MATERIAL_TYPE_METAL;
//                big_metal_material.metal.albedo = color(0.7, 0.6, 0.5);
//                big_metal_material.metal.fuzz = 0.0;
//                hittable_list_add_sphere(&world, sphere(vec3f(4.0, 1.0, 0.0), 1.0, big_metal_material));
//
//                // Camera Requirement
//                camera_initialize(&cam, radians(20), vec3(13, 2, 3), vec3(0, 0, 0), vec3(0, 1, 0), radians(0.6), 10.0);
//            }
        }

        let offset = global_invocation_id.x;
        // Currently WGSL does not allow passing pointer-to-storage-buffer or pointer-to-uniform-buffer into user-declared helper functions.
        // See https://github.com/openxla/iree/issues/10906#issuecomment-1563362180
        var c: color = render(&cam, offset);
        write_color(offset, c, cam.samples_per_pixel);
}
// End main
// ----------------------------------------------------------------------------
