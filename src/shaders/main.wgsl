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
    let s = 1e-8;
    return length(v) < 1e-8;
}

fn reflect(v: vec3f, n: vec3f) -> vec3f {
    return v - 2.0 * dot(v, n) * n;
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
  let A = vec3u(1741651u * 1009u,
                 140893u * 1609u * 13u,
                 6521u   *  983u *  7u * 2u);
  rnd = (invocation_id * A) ^ seed;
}

// Returns a random number between 0 and 1.
fn random_f32() -> f32 {
  let C = vec3u(60493u * 9377u,
                11279u * 2539u * 23u,
                 7919u * 631u  *  5u * 3u);

  rnd = (rnd * C) ^ (rnd.yzx >> vec3(4u));
  return f32(rnd.x ^ rnd.y) / f32(0x7fffffff);
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
const MATERIAL_TYPE_LAMBERTIAN: material_type = 0u;
const MATERIAL_TYPE_METAL: material_type = 1u;
const MATERIAL_TYPE_DIELECTRIC: material_type = 2u;
const MATERIAL_TYPE_EMISSIVE: material_type = 3u;
const MATERIAL_TYPE_ISOTROPIC: material_type = 4u;

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

struct material_emissive {
    emissivity: color,
}

struct material_isotropic {
    albedo: color,
}

struct material {
    ty: material_type,
    lambertian: material_lambertian,
    metal: material_metal,
    dielectric: material_dielectric,
    emissive: material_emissive,
    isotropic: material_isotropic,
    // Alignment is required to use as a uniform
    @align(16) absorption: f32,
}

@group(0) @binding(1)
var<uniform> materials: array<material, ${materialCount}>;

fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

// Returns the percentage of light that was scattered
fn scatter(mat_i: material_index, r_in: ray, rec: hit_record, attenuation: ptr<function, color>, scattered: ptr<function, ray>) -> bool {
    let mat = materials[mat_i];
    switch (mat.ty) {
        // case MATERIAL_TYPE_LAMBERTIAN: {
        case 0u: {
            var scatter_direction = rec.normal + random_unit_vector();

            if (near_zero(scatter_direction)) {
                scatter_direction = rec.normal;
            }

            (*scattered) = ray(rec.p, scatter_direction, r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.lambertian.albedo * r_in.strength;
            return true;
        }
        // case MATERIAL_TYPE_METAL: {
        case 1u: {
            let reflected: vec3f = reflect(normalize(r_in.direction), rec.normal);
            (*scattered) = ray(rec.p,
                               reflected + mat.metal.fuzz * random_unit_vector(),
                               r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.metal.albedo * r_in.strength;
            return dot((*scattered).direction, rec.normal) > 0.0;
        }
        // case MATERIAL_TYPE_DIELECTRIC: {
        case 2u: {
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
        // case MATERIAL_TYPE_ISOTROPIC: {
        case 4u: {
            (*scattered) = ray(rec.p, random_unit_vector(), r_in.strength * (1.0 - mat.absorption));
            (*attenuation) = mat.isotropic.albedo;
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
    ray_cast_count: u32,
    ray_bv_intersection_count: u32,
    ray_object_intersection_count: u32
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

    (*record).front_face = dot(r.direction, outward_normal) < 0.0;
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
//    nx: f32,
//    ny: f32,
//    nz: f32,
    // Texture coordinates
//    u: f32,
//    v: f32
}

fn get_position(v: vertex) -> vec3f {
    return vec3f(v.px, v.py, v.pz);
}

struct mesh {
    vertices: array<vertex, ${vertexCountOrOne}>,
    verticies_length: u32,
    // The fourth value is a dummy value for padding due to WGSL alignment requirements for uniforms
    indices: array<vec4<u32>, ${indicesCountOrOne}>,
    indices_length: u32,
    mat: material_index,
}

struct volume {
    sphere_index: i32,
    mesh_index: i32,
    density: f32,
    mat: material_index,
}

struct aabb {
    min: vec3f,
    max: vec3f
}

fn hit_sphere(s: sphere, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    compute_stats.ray_cast_count++;

    let oc = r.origin - s.center;
    let a = length_squared(r.direction);
    let half_b = dot(oc, r.direction);
    let c = length_squared(oc) - s.radius * s.radius;

    let discriminant = half_b * half_b - a * c;
    if (discriminant < 0.0) {
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

    compute_stats.ray_object_intersection_count++;
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
    let inv_det: f32 = 1.0 / det;

    let tvec: vec3f = r.origin - get_position(v0);
    let u: f32 = dot(tvec, pvec) * inv_det;
    if (u < 0.0 || u > 1.0) {
        return false;
    }

    let qvec: vec3f = cross(tvec, v0v1);
    let v: f32 = dot(r.direction, qvec) * inv_det;
    if (v < 0.0 || u + v > 1.0) {
        return false;
    }

    let t: f32 = dot(v0v2, qvec) * inv_det;
    if (t <= ray_tmin || ray_tmax <= t) {
        return false;
    }

    (*rec).t = t;
    (*rec).p = ray_at(r, t);
    set_face_normal(rec, r, normalize(cross(v0v1, v0v2)));
    (*rec).mat = mat;

    compute_stats.ray_object_intersection_count++;
    return true;
}

fn hit_mesh(m: mesh, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    compute_stats.ray_cast_count++;

    var hit_anything: bool = false;
    var temp_rec: hit_record;
    var closest_so_far: f32 = ray_tmax;

    for (var i: u32 = 0u; i < m.indices_length; i++) {
        let i0 = m.indices[i][0];
        let i1 = m.indices[i][1];
        let i2 = m.indices[i][2];
        if (hit_triangle(m.vertices[i0], m.vertices[i1], m.vertices[i2], m.mat, r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    return hit_anything;
}

fn hit_volume(v: volume, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    compute_stats.ray_cast_count++;

    var rec1: hit_record;
    var rec2: hit_record;

    if (v.sphere_index >= 0) {
        if (!hit_sphere(world.spheres[v.sphere_index], r, -infinity, infinity, &rec1)) {
            return false;
        }
        if (!hit_sphere(world.spheres[v.sphere_index], r, rec1.t + 0.0001, infinity, &rec2)) {
            return false;
        }
    } else if (v.mesh_index >= 0) {
        if (!hit_mesh(world.meshes[v.mesh_index], r, -infinity, infinity, &rec1)) {
            return false;
        }

        if (!hit_mesh(world.meshes[v.mesh_index], r, rec1.t + 0.0001, infinity, &rec2)) {
            return false;
        }
    } else {
        return false;
    }

    if (rec1.t < ray_tmin) {
        rec1.t = ray_tmin;
    }
    if (rec2.t > ray_tmax) {
         rec2.t = ray_tmax;
    }

    if (rec1.t >= rec2.t) {
        return false;
    }

    if (rec1.t < 0) {
        rec1.t = 0;
    }

    let distance_inside_boundary: f32 = (rec2.t - rec1.t);
    let hit_cutoff = (v.density * distance_inside_boundary) / (v.density * distance_inside_boundary + 1);
    let random = random_f32();

    if (hit_cutoff < random) {
        return false;
    }

    (*rec).t = rec1.t + random * distance_inside_boundary;
    (*rec).p = ray_at(r, (*rec).t);

    (*rec).normal = vec3f(1, 0, 0);  // arbitrary
    (*rec).front_face = true;     // also arbitrary
    (*rec).mat = v.mat;

    compute_stats.ray_object_intersection_count++;
    return true;
}

fn hit_aabb(box: aabb, r: ray, ray_tmin: f32, ray_tmax: f32) -> bool {
    for (var a: u32 = 0u; a < 3u; a++) {
        let inv_d: f32 = 1.0 / r.direction[a];
        let orig: f32 = r.origin[a];

        var t0: f32 = (box.min[a] - orig) * inv_d;
        var t1: f32 = (box.max[a] - orig) * inv_d;

        if (inv_d < 0.0) {
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
    volume_index: i32,
}

struct background {
    // Workaround for bool members not being copyable via a buffer
    use_sky: u32,
    albedo: color,
}

struct hittable_list {
    // Length fields allow the spheres/meshes underlying the volumes to be stored in the same array without breaking the
    // non-BVH hit calculations.
    spheres: array<sphere, ${sphereCountOrOne}>,
    spheres_length: u32,
    meshes: array<mesh, ${meshCountOrOne}>,
    meshes_length: u32,
    volumes: array<volume, ${volumeCountOrOne}>,
    bvhs: array<bvh, ${bvhCountOrOne}>,
    bg: background,
}

@group(0) @binding(2)
var<storage> world: hittable_list;

fn hit_hittables(sphere_index: i32, mesh_index: i32, volume_index: i32, r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    var hit_anything: bool = false;
    var temp_rec: hit_record;
    var closest_so_far: f32 = ray_tmax;

    if (sphere_index >= 0 && sphere_index < i32(world.spheres_length)) {
        if (hit_sphere(world.spheres[sphere_index], r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    if (mesh_index >= 0 && mesh_index < i32(world.meshes_length)) {
        var current_mesh: mesh = world.meshes[mesh_index];
        if hit_mesh(current_mesh, r, ray_tmin, closest_so_far, &temp_rec) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

     if (volume_index >= 0 && volume_index < ${volumeCount}) {
        if (hit_volume(world.volumes[volume_index], r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    return hit_anything;
}

fn hit_hittable_list(r: ray, ray_tmin: f32, ray_tmax: f32, rec: ptr<function, hit_record>) -> bool {
    var temp_rec: hit_record;
    var hit_anything: bool = false;
    var closest_so_far: f32 = ray_tmax;

    for (var sphere_index: u32 = 0u; sphere_index < world.spheres_length; sphere_index++) {
        if (hit_hittables(i32(sphere_index), -1, -1, r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    for (var mesh_index: u32 = 0u; mesh_index < world.meshes_length; mesh_index++) {
        if (hit_hittables(-1, i32(mesh_index), -1, r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
        }
    }

    for (var volume_index: u32 = 0u; volume_index < ${volumeCount}u; volume_index++) {
        if (hit_hittables(-1, -1, i32(volume_index), r, ray_tmin, closest_so_far, &temp_rec)) {
            hit_anything = true;
            closest_so_far = temp_rec.t;
            (*rec) = temp_rec;
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

    var stack: array<i32, 32>;
    var size: u32 = 1u;
    stack[0] = i32(bvh_index);

    var hit_anything: bool = false;
    var temp_rec: hit_record;
    var closest_so_far: f32 = ray_tmax;

    while (size > 0u) {
        let i = stack[size - 1u];
        if (i < ${bvhCount}) {
            let b: bvh = world.bvhs[i];
            size--;

            compute_stats.ray_cast_count++;
            if (hit_aabb(b.box, r, ray_tmin, ray_tmax)) {
                compute_stats.ray_bv_intersection_count++;
                if (b.left_index < 0 && b.right_index < 0) {
                    // Leaf
                    if (hit_hittables(b.sphere_index, b.mesh_index, b.volume_index, r, ray_tmin, closest_so_far, &temp_rec)) {
                        hit_anything = true;
                        closest_so_far = temp_rec.t;
                        (*rec) = temp_rec;
                    }
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
    (*cam).width = ${width}u;
    (*cam).height = ${height}u;
    (*cam).origin = p.lookfrom;
    (*cam).defocus_angle = p.defocus_angle;
    (*cam).focus_dist = p.focus_dist;

    let aspect_ratio: f32 = ${width}f / ${height}f;

    let focal_length = length(p.lookfrom - p.lookat);
    let h = tan(p.vfov / 2.0);
    let viewport_height = 2.0 * h * focal_length;
    let viewport_width = aspect_ratio * viewport_height;

    // Calculate the u,v,w unit basis vectors for the camera coordinate frame.
    (*cam).w = normalize(p.lookfrom - p.lookat);
    (*cam).u = normalize(cross(p.vup, (*cam).w));
    (*cam).v = cross((*cam).w, (*cam).u);

    // Calculate the vectors across the horizontal and down the vertical viewport edges.
    (*cam).viewport_u = viewport_width * (*cam).u; // Vector across viewport horizontal edge
    (*cam).viewport_v = viewport_height * (*cam).v; // Vector down viewport vertical edge

    // Calculate the horizontal and vertical delta vectors to the next pixel.
    (*cam).pixel_delta_u = (*cam).viewport_u / ${width}f;
    (*cam).pixel_delta_v = (*cam).viewport_v / ${height}f;

    // Calculate the location of the upper left pixel.
    let viewport_upper_left = (*cam).origin - (focal_length * (*cam).w) - (*cam).viewport_u / 2.0 - (*cam).viewport_v / 2.0;
    (*cam).pixel00_loc = viewport_upper_left + 0.5 * ((*cam).pixel_delta_u + (*cam).pixel_delta_v);

    // Calculate the camera defocus disk basis vectors.
    let defocus_radius = p.focus_dist * tan(p.defocus_angle / 2.0);
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
    if ((*cam).defocus_angle <= 0.0) {
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
    var pixel_color = color(0.0, 0.0, 0.0);
    for (var sample: u32 = 0u; sample < samples_per_pixel; sample++) {
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
    // Workaround for bool members not being copyable via a buffer
    use_bvhs: u32
}

@group(0) @binding(4)
var<uniform> config: raytracer_config;

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

const infinity = 3.402823466e+38;

fn ray_color(r: ray) -> color {
    var rec: hit_record;
    var current_ray: ray = r;
    var reflected: color = color(1.0, 1.0, 1.0);
    var source: color = color(0.0, 0.0, 0.0);

    // No recusion available
    for (var depth: u32 = 0u; depth < config.max_depth; depth++) {
        // I don't trust short circuiting for WGSL yet lol
        var hit: bool;
        if (config.use_bvhs > 0u) {
            hit = hit_bvh(0u, current_ray, 0.001, infinity, &rec);
        } else {
            hit = hit_hittable_list(current_ray, 0.001, infinity, &rec);
        }
        if (hit) {
            var scattered: ray;
            var attenuation: color;
            var mat: material = materials[rec.mat];
            if (mat.ty == MATERIAL_TYPE_EMISSIVE) {
                source = mat.emissive.emissivity;
                break;
            } else if (scatter(rec.mat, current_ray, rec, &attenuation, &scattered)) {
                reflected *= attenuation;
                current_ray = scattered;
            } else {
                // Should be unreachable
                break;
            }
        } else {
            if (world.bg.use_sky > 0) {
                // Sky
                let unit_direction = normalize(r.direction);
                let t = 0.5 * (unit_direction.y + 1.0);
                source = (1.0 - t) * color(1.0, 1.0, 1.0) + t * color(0.5, 0.7, 1.0);
                break;
            } else {
                source = world.bg.albedo;
                break;
            }
        }
    }

    return reflected * source;
}

fn color_to_u32(c : color) -> u32 {
    let r = u32(c.r * 255.0);
    let g = u32(c.g * 255.0);
    let b = u32(c.b * 255.0);
    let a = 255u;

    // bgra8unorm
    return (a << 24u) | (r << 16u) | (g << 8u) | b;

    // rgba8unorm
    // return (a << 24) | (b << 16) | (g << 8) | r;
}

fn u32_to_color(c: u32) -> color {
    let r = f32((c >> 16u) & 0xffu) / 255.0;
    let g = f32((c >> 8u) & 0xffu) / 255.0;
    let b = f32((c >> 0u) & 0xffu) / 255.0;
    return color(r, g, b);
}

fn write_color(offset: u32, pixel_color: color) {
    var clamped = vec3f(clamp(pixel_color[0], 0.0, 1.0), clamp(pixel_color[1], 0.0, 1.0), clamp(pixel_color[2], 0.0, 1.0));
    // Gamma correction
    var c = sqrt(clamped);

    var last = u32_to_color(output[offset]);
    var w = config.weight;
    output[offset] = color_to_u32(last * (1.0 - w) + c * w);
}

@compute @workgroup_size(${wgSize})
fn main(
    @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
    ) {
        init_rand(global_invocation_id, vec3u(config.rand_seed.xyz * f32(0x7fffffff)));

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
