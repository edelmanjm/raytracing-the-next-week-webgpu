// ----------------------------------------------------------------------------
// Begin ray

struct ray {
    origin: vec3<f32>,
    direction: vec3<f32>,
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
// End utility functions
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin hittable objects
struct hit_record {
    p: vec3<f32>,
    normal: vec3<f32>,
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

    (*cam).samples_per_pixel = 10;
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
        let r = ray((*cam).origin, (*cam).lower_left_corner + u * (*cam).horizontal + v * (*cam).vertical - (*cam).origin);
        pixel_color += ray_color(r, world);
    }

    // Store color for current pixel
    return pixel_color;
}
// End camera
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
// Begin main

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

const infinity = 3.402823466e+38;

fn ray_color(r: ray, world: ptr<function, hittable_list>) -> color {
    var rec: hit_record;
    var current_ray: ray = r;
    var max_depth = 10;
    var c: color = color(0.0, 0.0, 0.0);
    var bounces = 1;

    // No recusion available
    for (var depth = 0; depth < max_depth; depth += 1) {
        if (hit_hittable_list(world, current_ray, 0.001, infinity, &rec)) {
            let direction = random_on_hemisphere(rec.normal);
            current_ray = ray(rec.p, direction);
            bounces += 1;
        } else {
            // Sky
            let unit_direction = normalize(r.direction);
            let t = 0.5 * (unit_direction.y + 1.0);
            c = (1.0 - t) * color(1.0, 1.0, 1.0) + t * color(0.5, 0.7, 1.0);
            break;
        }
    }

    return c / f32(bounces);
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
    var c = pixel_color;
    // Divide the color by the number of samples.
    c /= f32(samples_per_pixel);
    output[offset] = color_to_u32(c);
}

@compute @workgroup_size(${wgSize})
fn main(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    ) {
        init_rand(global_invocation_id.x, vec4(vec3<f32>(global_invocation_id), 1.0));

        // World
        var world: hittable_list;
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0, 0, -1), 0.5));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0, -100.5, -1), 100));

        var cam: camera;
        camera_initialize(&cam);

        let offset = global_invocation_id.x;
        write_color(offset, render(&cam, &world, offset), cam.samples_per_pixel);
}
// End main
// ----------------------------------------------------------------------------
