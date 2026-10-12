shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled, fog_disabled;
// Distant fog bank: horizontal mist sheet, clear near the raft, banded drifting wisps far away.

uniform vec3 mist_color : source_color = vec3(0.412, 0.486, 0.463);
uniform float density = 0.35;
uniform float visual_time = 0.0;
uniform vec2 drift = vec2(0.25, 0.1);
uniform float noise_scale = 0.06;
uniform float layer_seed = 0.0;
uniform vec2 distance_range = vec2(18.0, 40.0);
uniform float base_haze = 0.4;
uniform vec2 band_thresholds = vec2(0.42, 0.6);
uniform float band_softness = 0.08;
uniform vec4 clear_bounds = vec4(0.0,0.0,2.35,2.1);
uniform vec2 clear_fade = vec2(1.6,5.8);

varying vec3 world_pos;

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * value_noise(p);
		p = p * 2.07 + vec2(11.3, 4.7);
		a *= 0.5;
	}
	return v / 0.9375;
}

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float dist = length(CAMERA_POSITION_WORLD - world_pos);
	float reach = smoothstep(distance_range.x, distance_range.y, dist);
	vec2 from_raft = max(abs(world_pos.xz-clear_bounds.xy)-clear_bounds.zw,vec2(0.0));
	float clear_mask = smoothstep(clear_fade.x,clear_fade.y,length(from_raft));
	float n = fbm(world_pos.xz * noise_scale + drift * visual_time + vec2(layer_seed * 17.0, layer_seed * 5.0));
	float wisps = smoothstep(band_thresholds.x, band_thresholds.x + band_softness, n) * 0.55
		+ smoothstep(band_thresholds.y, band_thresholds.y + band_softness, n) * 0.45;
	ALBEDO = mist_color * mix(0.85, 1.15, wisps);
	ALPHA = clamp(density * reach * clear_mask * mix(base_haze, 1.0, wisps), 0.0, 1.0);
}
