shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never;
uniform sampler2D foam_pattern : repeat_enable, filter_linear_mipmap;
uniform float visual_time = 0.0;
uniform vec3 foam_color : source_color = vec3(0.61, 0.72, 0.71);
uniform vec3 contact_color : source_color = vec3(0.018, 0.04, 0.045);
uniform float foam_opacity = 0.55;
uniform float foam_speed = 0.09;
uniform float plane_height = 0.0;
uniform vec2 plane_slope = vec2(0.0);
void vertex() {
	vec2 world = (MODEL_MATRIX*vec4(VERTEX,1.0)).xz;
	VERTEX.y += plane_height+dot(plane_slope,world);
}
void fragment() {
	float phase = COLOR.r * 6.283185;
	float movement = visual_time * foam_speed;
	float noise = texture(foam_pattern, vec2(UV.x * 1.8 + movement + COLOR.r, UV.y * 0.8 - movement * 0.45)).r;
	float pulse = 0.70 + 0.30 * sin(visual_time * 1.35 + phase + UV.x * 2.0);
	float broken = smoothstep(0.28, 0.68, noise);
	float rim = (1.0 - smoothstep(0.22, 0.94, UV.y)) * smoothstep(0.01, 0.13, UV.y);
	float foam = broken * rim * pulse;
	float shadow = (1.0 - smoothstep(0.0, 0.24, UV.y)) * 0.43;
	ALBEDO = mix(contact_color, foam_color, smoothstep(0.02, 0.2, foam));
	ALPHA = max(shadow, foam * foam_opacity);
}
