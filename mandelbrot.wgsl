
struct VertexOutput {
	@builtin(position) position: vec4<f32>,
	@location(0) fragmentPosition: vec2<f32>,
}

struct Uniforms {
	center: vec2<f32>,
	rectangle: vec2<f32>,
	maxIterations: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@stage(vertex)
fn vertex_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var output: VertexOutput;
	let position2d: vec2<f32> = array<vec2<f32>, 4>(
		vec2<f32>(1.0, -1.0),
		vec2<f32>(1.0, 1.0),
		vec2<f32>(-1.0, -1.0),
		vec2<f32>(-1.0, 1.0),
	)[vertexIndex];
	output.position = vec4<f32>(position2d, 0.0, 1.0);
	output.fragmentPosition = position2d;
	return output;
}

@stage(fragment)
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
	var c: vec2<f32> = uniforms.center + input.fragmentPosition * uniforms.rectangle;
	var z: vec2<f32> = c;
	var iteration: u32 = 0u;
	let maxIterations: u32 = uniforms.maxIterations;

	for (; iteration < maxIterations; iteration = iteration + 1u) {
		z = vec2<f32>(
			z.x * z.x - z.y * z.y + c.x,
			2.0 * z.x * z.y + c.y,
		);

		if (z.x * z.x + z.y * z.y > 4.0) {
			break;
		}

		iteration = iteration + 1u;
	}

	if (iteration < maxIterations) {
		return vec4<f32>(
			sin(f32(iteration) / f32(maxIterations) * 5.0),
			sin(f32(iteration) / f32(maxIterations) * 10.0),
			sin(f32(iteration) / f32(maxIterations) * 15.0),
			1.0,
		);
	} else {
		return vec4<f32>(
			0.0,
			0.0,
			0.0,
			1.0,
		);
	}
}
