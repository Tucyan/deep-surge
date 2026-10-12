shader_type spatial;
uniform vec4 wood_color : source_color = vec4(0.35, 0.24, 0.14, 1.0);
uniform float wet_line = 0.06;
uniform float water_height = 0.0;
uniform vec2 water_slope = vec2(0.0);
varying float world_height;
void vertex() {
	vec3 world = (MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;
	world_height = world.y-water_height-dot(water_slope,world.xz);
}
void fragment() {
	float wetness = 1.0 - smoothstep(wet_line - 0.04, wet_line + 0.025, world_height);
	ALBEDO = wood_color.rgb * mix(1.0, 0.47, wetness);
	ROUGHNESS = mix(0.76, 0.35, wetness);
}
