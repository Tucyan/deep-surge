shader_type spatial;
render_mode unshaded, cull_back;
uniform sampler2D foam_atlas : filter_linear, repeat_disable;
uniform sampler2D foam_breakup : repeat_enable, filter_linear_mipmap;
uniform float visual_time = 0.0;
uniform float frame_a = 0.0;
uniform float frame_b = 1.0;
uniform float frame_blend = 0.0;
uniform float atlas_grid = 4.0;
uniform float foam_threshold = 0.70;
uniform float foam_strength = 0.20;
uniform vec3 flat_color : source_color = vec3(0.325,0.737,0.933);
uniform vec3 shadow_color : source_color = vec3(0.149,0.227,0.592);
uniform vec3 foam_color : source_color = vec3(0.929,0.969,1.0);
uniform float shade_start = 0.035;
uniform float shade_end = 0.09;
uniform vec4 raft_bounds = vec4(0.0,0.0,2.35,2.1);
uniform float contact_margin = 0.7;
uniform float contact_transition = 2.4;
uniform float plane_height = 0.0;
uniform vec2 plane_slope = vec2(0.0);
varying float wave_height;
varying float contact_blend;
varying vec2 water_position;
varying vec3 source_normal;
void vertex() {
	vec3 world = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz;
	water_position = world.xz;
	source_normal = normalize(NORMAL);
	vec2 q = max(abs(world.xz-raft_bounds.xy)-raft_bounds.zw,vec2(0.0));
	contact_blend = 1.0-smoothstep(contact_margin,contact_margin+contact_transition,length(q));
	float waterline = plane_height+dot(plane_slope,world.xz);
	world.y = mix(world.y,waterline,contact_blend);
	float far_blend = smoothstep(27.0,36.0,length(world.xz));
	world.y = mix(world.y,-0.40,far_blend);
	VERTEX = (inverse(MODEL_MATRIX)*vec4(world,1.0)).xyz;
	vec3 flat_normal = normalize(vec3(-plane_slope.x,1.0,-plane_slope.y));
	vec3 world_normal = normalize(MODEL_NORMAL_MATRIX*NORMAL);
	NORMAL = normalize(inverse(MODEL_NORMAL_MATRIX)*mix(world_normal,flat_normal,contact_blend));
	wave_height = world.y;
}
vec2 atlas_uv(vec2 uv,float frame) {
	vec2 tile = vec2(mod(frame,atlas_grid),floor(frame/atlas_grid));
	vec2 half_pixel = vec2(0.5)/vec2(textureSize(foam_atlas,0));
	return clamp((tile+clamp(uv,vec2(0.0),vec2(1.0)))/atlas_grid,tile/atlas_grid+half_pixel,(tile+vec2(1.0))/atlas_grid-half_pixel);
}
void fragment() {
	float foam = mix(texture(foam_atlas,atlas_uv(UV,frame_a)).r,texture(foam_atlas,atlas_uv(UV,frame_b)).r,frame_blend);
	float crest = smoothstep(foam_threshold,foam_threshold+0.14,foam)*(1.0-contact_blend);
	float facing = dot(normalize(source_normal).xz,normalize(vec2(-0.25,0.97)));
	float shade = smoothstep(shade_start,shade_end,facing)*(1.0-contact_blend);
	float breakup = texture(foam_breakup,water_position*0.55+vec2(visual_time*0.03,0.0)).r;
	float white = crest*smoothstep(0.35,0.50,breakup)*foam_strength;
	vec3 water = mix(flat_color,shadow_color,shade);
	ALBEDO = mix(water,foam_color,white);
}
