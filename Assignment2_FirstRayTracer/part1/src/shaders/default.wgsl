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
// Begin main

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

fn hit_sphere(center : vec3<f32>, radius: f32, r: ray) -> f32 {
    let oc = r.origin - center;
    let a = length_squared(r.direction);
    let half_b = dot(oc, r.direction);
    let c = length_squared(oc) - radius * radius;
    let discriminant = half_b * half_b - a * c;
    if (discriminant < 0) {
        return -1;
    } else {
        return (-half_b - sqrt(discriminant)) / a;
    }
}

fn ray_color(r : ray) -> color {
    var t = hit_sphere(vec3<f32>(0, 0, -1), 0.5, r);
    if (t > 0.0) {
        let n: vec3<f32> = normalize(ray_at(r, t) - vec3<f32>(0, 0, -1));
        return 0.5 * color(n.x + 1, n.y + 1, n.z + 1);
    }

    let unit_direction = normalize(r.direction);
    t = 0.5 * (unit_direction.y + 1.0);
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
        let pixel_color = ray_color(r);

        // Store color for current pixel
        output[offset] = color_to_u32(pixel_color);
}
// End main
// ----------------------------------------------------------------------------
