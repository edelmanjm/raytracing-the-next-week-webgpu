// ----------------------------------------------------------------------------
// Ray

struct ray {
    origin : vec3<f32>,
    direction : vec3<f32>,
}

fn ray_at(r: ray, t: f32) -> vec3<f32> {
    return r.origin + t * r.direction;
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Color

alias color = vec3<f32>;
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Utility functions
fn length_squared(v: vec3<f32>) -> f32 {
    let l = length(v);
    return l * l;
}
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// Main

@group(0) @binding(0)
var<storage, read_write> output : array<u32>;

fn ray_color(r : ray) -> color {
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

        // Camera
        const viewport_height = 2.0;
        const viewport_width = aspect_ratio * viewport_height;
        const focal_length = 1.0;

        const origin = vec3(0.0, 0.0, 0.0);
        const horizontal = vec3(viewport_width, 0.0, 0.0);
        const vertical = vec3(0.0, viewport_height, 0.0);
        const lower_left_corner = origin - horizontal/2 - vertical/2 - vec3(0, 0, focal_length);

        // Render
        let u = x / image_width;
        let v = y / image_height;
        let r = ray(origin, lower_left_corner + u * horizontal + v * vertical - origin);
        let pixel_color = ray_color(r);

        // Store color for current pixel
        output[offset] = color_to_u32(pixel_color);
}
// ----------------------------------------------------------------------------
