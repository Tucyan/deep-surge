shader_type spatial;
render_mode cull_back;
// Two reads of one periodic RGBA normal/height texture. Opaque, no screen/depth copy.
uniform sampler2D water_pattern : hint_normal, repeat_enable, filter_linear_mipmap;
uniform float visual_time = 0.0;
uniform float pattern_scale = 0.28;
uniform vec2 flow_a = vec2(0.012, 0.008);
uniform vec2 flow_b = vec2(-0.009, 0.014);
uniform vec3 deep_color : source_color = vec3(0.035, 0.115, 0.155);
uniform vec3 ripple_color : source_color = vec3(0.11, 0.25, 0.30);
uniform float normal_strength = 0.45;
varying vec2 water_position;
void vertex() {
	water_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}
void fragment() {
	vec2 p = water_position * pattern_scale;
	vec4 a = texture(water_pattern, p + flow_a * visual_time);
	vec4 b = texture(water_pattern, vec2(-p.y, p.x) * 1.37 + flow_b * visual_time);
	vec2 normal_a = a.rg * 2.0 - 1.0;
	vec2 normal_b = vec2(-b.g, b.r) * 2.0 + vec2(1.0, -1.0);
	vec2 slope = (normal_a + normal_b) * normal_strength;
	NORMAL_MAP = normalize(vec3(slope, 1.0)) * 0.5 + 0.5;
	float water_detail = smoothstep(0.25, 0.8, (a.a + b.a) * 0.5);
	ALBEDO = mix(deep_color, ripple_color, water_detail * 0.58);
	ROUGHNESS = 0.34;
	METALLIC = 0.25;
	SPECULAR = 0.55;
}
