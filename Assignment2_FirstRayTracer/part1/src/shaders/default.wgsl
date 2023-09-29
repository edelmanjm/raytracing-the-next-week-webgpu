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
// Begin main

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

const infinity = 3.402823466e+38;

fn ray_color(r: ray, world: ptr<function, hittable_list>) -> color {
    var rec: hit_record;
    if (hit_hittable_list(world, r, 0, infinity, &rec)) {
        return 0.5 * (rec.normal + color(1.0, 1.0 , 1.0));
    }

    let unit_direction = normalize(r.direction);
    let t = 0.5 * (unit_direction.y + 1.0);
    return (1.0 - t) * color(1.0, 1.0, 1.0) + t * color(0.5, 0.7, 1.0);
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

@compute @workgroup_size(${wgSize})
fn main(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    ) {
        // Compute current x,y
        let offset = global_invocation_id.x;
        let x = f32(offset % ${width});
        let y = ${height} - f32(offset / ${width}); // Flip Y so Y+ is up

        // Image
        const aspect_ratio = ${width} / ${height};
        const image_width = ${width};
        const image_height = ${height};

        // World

        var world: hittable_list;
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0, 0, -1), 0.5));
        hittable_list_add_sphere(&world, sphere(vec3<f32>(0, -100.5, -1), 100));

        // Camera
        const viewport_height = 2.0;
        const viewport_width = aspect_ratio * viewport_height;
        const focal_length = 1.0;

        const origin = vec3(0.0, 0.0, 0.0);
        const horizontal = vec3(viewport_width, 0.0, 0.0);
        const vertical = vec3(0.0, viewport_height, 0.0);
        const lower_left_corner = origin - horizontal / 2 - vertical / 2 - vec3(0, 0, focal_length);

        // Render
        let u = x / image_width;
        let v = y / image_height;
        let r = ray(origin, lower_left_corner + u * horizontal + v * vertical - origin);
        let pixel_color = ray_color(r, &world);

        // Store color for current pixel
        output[offset] = color_to_u32(pixel_color);
}
// End main
// ----------------------------------------------------------------------------
