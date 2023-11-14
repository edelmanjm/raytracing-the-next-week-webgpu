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

// Implementation copied from https://webgpu.github.io/webgpu-samples/samples/cornell#./common.wgsl

// A psuedo random number. Initialized with init_rand(), updated with rand().
var<private> rnd : vec3u;

// Initializes the random number generator.
fn init_rand(invocation_id : vec3u, seed : vec3u) {
  const A = vec3(1741651 * 1009,
                 140893  * 1609 * 13,
                 6521    * 983  * 7 * 2);
  rnd = (invocation_id * A) ^ seed;
}

// Returns a random number between 0 and 1.
fn random_f32() -> f32 {
  const C = vec3(60493  * 9377,
                 11279  * 2539 * 23,
                 7919   * 631  * 5 * 3);

  rnd = (rnd * C) ^ (rnd.yzx >> vec3(4u));
  return f32(rnd.x ^ rnd.y) / f32(0xffffffff);
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
    // Alignment is required to use as a uniform
    @align(16) absorption: f32,
}

@group(0) @binding(1)
var<uniform> materials: array<material, ${materialCount}>;

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
// Begin statistics
struct statistics {
    ray_intersection_count: u32,
    ray_cast_count: u32
}

@group(0) @binding(5)
var<storage, read_write> compute_stats: statistics;

// End statistics
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

// We can't use vec3fs due to the aligment requirements of its type. Therefore, we use individual f32s
// See https://gpuweb.github.io/gpuweb/wgsl/#alignment-and-size for details
struct vertex {
    // Positions
    px: f32,
    py: f32,
    pz: f32,
    // Normals
    nx: f32,
    ny: f32,
    nz: f32,
    // Texture coordinates
    u: f32,
    v: f32
}

fn get_position(v: vertex) -> vec3f {
    return vec3f(v.px, v.py, v.pz);
}

const MAX_MESH_INDEX_SIZE = 512;

struct mesh {
    vertices: array<vertex, MAX_MESH_INDEX_SIZE>,
    verticies_length: u32,
    // The fourth value is a dummy value for padding due to WGSL alignment requirements for uniforms
    indices: array<vec4<u32>, MAX_MESH_INDEX_SIZE>,
    indices_length: u32,
    mat: material_index,
}

struct aabb {
    min: vec3f,
    max: vec3f
}

fn get_aabb_sphere(s: sphere) -> aabb {
    let rvec = vec3f(s.radius, s.radius, s.radius);
    return aabb(s.center - rvec, s.center + rvec);
}

fn get_aabb_aabbs(box0: aabb, box1: aabb) -> aabb {
    return aabb(
        vec3f(
            min(box0.min.x, box1.min.x),
            min(box0.min.y, box1.min.y),
            min(box0.min.z, box1.min.z)
        ),
        vec3f(
            max(box0.max.x, box1.max.x),
            max(box0.max.y, box1.max.y),
            max(box0.max.z, box1.max.z)
        )
    );
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

fn hit_triangle(v0: vertex, v1: vertex, v2: vertex, mat: material_index, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    let v0v1: vec3f = get_position(v1) - get_position(v0);
    let v0v2: vec3f = get_position(v2) - get_position(v0);
    let pvec: vec3f = cross(r.direction, v0v2);
    let det: f32 = dot(v0v1, pvec);

    let k_epsilon: f32 = 0.0000001;

    let culling: bool = false;
    if (culling) {
        // if the determinant is negative the triangle is backfacing
        // if the determinant is close to 0, the ray misses the triangle
        if (det < k_epsilon) {
            return false;
        }
    } else {
        // ray and triangle are parallel if det is close to 0
        if (abs(det) < k_epsilon) {
            return false;
        }
    }
    let invDet: f32 = 1 / det;

    let tvec: vec3f = r.origin - get_position(v0);
    let u: f32 = dot(tvec, pvec) * invDet;
    if (u < 0 || u > 1) {
        return false;
    }

    let qvec: vec3f = cross(tvec, v0v1);
    let v: f32 = dot(r.direction, qvec) * invDet;
    if (v < 0 || u + v > 1) {
        return false;
    }

    let t: f32 = dot(v0v2, qvec) * invDet;
    if (t <= ray_tmin || ray_tmax <= t) {
        return false;
    }

    (*rec).t = t;
    (*rec).p = ray_at(r, t);
    set_face_normal(rec, r, cross(v0v1, v0v2));
    (*rec).mat = mat;

    return true;
}

fn hit_aabb(box: aabb, r: ray, ray_tmin: f32, ray_tmax: f32) -> bool {
    for (var a: u32 = 0; a < 3; a++) {
        let inv_d: f32 = 1 / r.direction[a];
        let orig: f32 = r.origin[a];

        var t0: f32 = (box.min[a] - orig) * inv_d;
        var t1: f32 = (box.max[a] - orig) * inv_d;

        if (inv_d < 0) {
            let swap = t0;
            t0 = t1;
            t1 = swap;
        }

        if (min(t1, ray_tmax) <= max(t0, ray_tmin)) {
            return false;
        }
    }

    return true;
}

struct bvh {
    box: aabb,
    // -1 if not a valid index
    left_index: i32,
    right_index: i32,
    sphere_index: i32,
    mesh_index: i32,
}

struct hittable_list {
    spheres: array<sphere, ${sphereCountOrOne}>,
    meshes: array<mesh, ${meshCountOrOne}>,
    bvhs: array<bvh, ${bvhCount}>
}

@group(0) @binding(2)
var<storage> world: hittable_list;

fn hit_hittables(sphere_index: i32, mesh_index: i32, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    var hit_anything: bool = false;
    var temp_rec: hit_record;
    var closest_so_far: f32 = ray_tmax;

    if (sphere_index >= 0) {
        compute_stats.ray_cast_count++;
        if (hit_sphere(world.spheres[sphere_index], r, ray_tmin, closest_so_far, &temp_rec)) {
            compute_stats.ray_intersection_count += 1;
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    if (mesh_index >= 0) {
        var current_mesh: mesh = world.meshes[mesh_index];
        for (var i: u32 = 0; i < current_mesh.indices_length; i++) {
            let i0 = current_mesh.indices[i][0];
            let i1 = current_mesh.indices[i][1];
            let i2 = current_mesh.indices[i][2];
            compute_stats.ray_cast_count++;
            if (hit_triangle(current_mesh.vertices[i0], current_mesh.vertices[i1], current_mesh.vertices[i2], current_mesh.mat, r, ray_tmin, closest_so_far, &temp_rec)) {
                // FIXME program hangs when these are uncommented?? Whack
//                compute_stats.ray_intersection_count += 1;
//                hit_anything = true;
//                closest_so_far = temp_rec.t;
//                (*rec) = temp_rec;
            }
        }
    }

    return hit_anything;
}

fn hit_bvh(bvh_index: u32, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    // No recusion, so we can't use the BVH traversal from Shirley
    // Using a stack for now. Very good stackless algorithms exist, with some being more efficient
    // (see https://dl.acm.org/doi/10.5555/2977336.2977343 for a survey of other algos and a particularly fast algo)
    // but wanted to start with something simpler.
    // TODO replace this

    var stack: array<i32, 1024>;
    var size: u32 = 1;
    stack[0] = i32(bvh_index);

    while (size > 0) {
        let b: bvh = world.bvhs[size - 1];
        size--;

        compute_stats.ray_cast_count++;
        if (hit_aabb(b.box, r, ray_tmin, ray_tmax)) {
            compute_stats.ray_intersection_count++;
            if (b.left_index < 0 && b.right_index < 0) {
                // Leaf
                return hit_hittables(b.sphere_index, b.mesh_index, r, ray_tmin, ray_tmax, rec);
            } else {
                if (b.left_index >= 0) {
                    stack[size] = b.left_index;
                    size++;
                }
                if (b.right_index >= 0) {
                    stack[size] = b.right_index;
                    size++;
                }
            }
        }
    }

    return false;
}

// End hittable objects
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin camera
struct camera {
    width: u32,
    height: u32,
    origin: vec3f,
    pixel00_loc: vec3f,

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

struct camera_initialize_parameters {
    vfov: f32,
    lookfrom: vec3f,
    lookat: vec3f,
    vup: vec3f,
    defocus_angle: f32,
    focus_dist: f32
}

@group(0) @binding(3)
var<uniform> camera_ip: camera_initialize_parameters;

fn camera_initialize(cam: ptr<function, camera>, p: camera_initialize_parameters) {
    (*cam).width = ${width};
    (*cam).height = ${height};
    (*cam).origin = p.lookfrom;
    (*cam).defocus_angle = p.defocus_angle;
    (*cam).focus_dist = p.focus_dist;

    const aspect_ratio: f32 = ${width} / ${height};

    let focal_length = length(p.lookfrom - p.lookat);
    let h = tan(p.vfov / 2);
    let viewport_height = 2 * h * focal_length;
    let viewport_width = aspect_ratio * viewport_height;

    // Calculate the u,v,w unit basis vectors for the camera coordinate frame.
    (*cam).w = normalize(p.lookfrom - p.lookat);
    (*cam).u = normalize(cross(p.vup, (*cam).w));
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
    let defocus_radius = p.focus_dist * tan(p.defocus_angle / 2);
    (*cam).defocus_disk_u = (*cam).u * defocus_radius;
    (*cam).defocus_disk_v = (*cam).v * defocus_radius;
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

fn render(cam: ptr<function, camera>, offset: u32, samples_per_pixel: u32) -> color {
    // Compute current x,y
    let x = f32(offset % (*cam).width);
    let y = f32((*cam).height) - f32(offset / (*cam).width); // Flip Y so Y+ is up

    // Render
    var pixel_color = color(0,0,0);
    for (var sample: u32 = 0; sample < samples_per_pixel; sample += 1) {
        let r: ray = get_ray(cam, x, y);
        pixel_color += ray_color(r);
    }

    // Divide the color by the number of samples.
    pixel_color /= f32(samples_per_pixel);
    return pixel_color;
}
// End camera
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Begin main

struct raytracer_config {
    samples_per_pixel: u32,
    max_depth: u32,
    rand_seed: vec4f,
    weight: f32,
}

@group(0) @binding(4)
var<uniform> config: raytracer_config;

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

const infinity = 3.402823466e+38;

fn ray_color(r: ray) -> color {
    var rec: hit_record;
    var current_ray: ray = r;
    var c: color = color(1.0, 1.0, 1.0);

    // No recusion available
    for (var depth: u32 = 0; depth < config.max_depth; depth += 1) {
        if (hit_bvh(0, current_ray, 0.001, infinity, &rec)) {
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

fn u32_to_color(c: u32) -> color {
    let r = f32((c >> 16) & 0xff) / 255.0;
    let g = f32((c >> 8) & 0xff) / 255.0;
    let b = f32((c >> 0) & 0xff) / 255.0;
    return color(r, g, b);
}

fn write_color(offset: u32, pixel_color: color) {
    // Gamma correction
    var c = sqrt(pixel_color);

    var last = u32_to_color(output[offset]);
    var w = config.weight;
    output[offset] = color_to_u32(last * (1 - w) + c * w);
}

@compute @workgroup_size(${wgSize})
fn main(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    ) {
        init_rand(global_invocation_id, vec3u(config.rand_seed.xyz * 0xffffffff));

        var cam: camera;
        camera_initialize(&cam, camera_ip);

        let offset = global_invocation_id.x;
        // Skip if out of bounds (TODO: only invoke required number of workgroups)
        if (offset >= u32(${width * height})) {
            return;
        }

        // Currently WGSL does not allow passing pointer-to-storage-buffer or pointer-to-uniform-buffer into user-declared helper functions.
        // See https://github.com/openxla/iree/issues/10906#issuecomment-1563362180
        var c: color = render(&cam, offset, config.samples_per_pixel);
        write_color(offset, c);
}
// End main
// ----------------------------------------------------------------------------
