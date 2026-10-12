shader_type spatial;
render_mode unshaded, cull_disabled;

uniform sampler2D foam_atlas : filter_linear, repeat_disable;
uniform float frame_a = 0.0;
uniform float frame_b = 1.0;
uniform float frame_blend = 0.0;
uniform float foam_threshold = 0.33636364;
uniform float atlas_grid = 4.0;
uniform vec3 palette0 = vec3(0.0115535,0.0358306,0.2434685);
uniform vec3 palette1 = vec3(0.0197291,0.0556246,0.2743761);
uniform vec3 palette2 = vec3(0.0267577,0.0569837,0.3052955);
uniform vec3 palette3 = vec3(0.0849154,0.4026931,1.0);
varying vec3 ocean_world_normal;

uniform vec4 raft_bounds = vec4(0.0,0.0,2.35,2.1);
uniform float contact_margin = 1.2;
uniform float contact_transition = 2.4;
uniform float plane_height = 0.0;
uniform vec2 plane_slope = vec2(0.0);
void vertex() {
	vec3 world = (MODEL_MATRIX * vec4(VERTEX,1.0)).xyz;
	vec2 q = max(abs(world.xz-raft_bounds.xy)-raft_bounds.zw,vec2(0.0));
	float contact_blend = 1.0-smoothstep(contact_margin,contact_margin+contact_transition,length(q));
	world.y = mix(world.y,plane_height+dot(plane_slope,world.xz),contact_blend);
	VERTEX = (inverse(MODEL_MATRIX)*vec4(world,1.0)).xyz;
	vec3 original_normal = normalize(MODEL_NORMAL_MATRIX*NORMAL);
	vec3 flat_normal = normalize(vec3(-plane_slope.x,1.0,-plane_slope.y));
	ocean_world_normal = normalize(mix(original_normal,flat_normal,contact_blend));
}
vec2 atlas_uv(vec2 uv, float frame) {
	vec2 tile = vec2(mod(frame,atlas_grid),floor(frame/atlas_grid));
	vec2 half_pixel = vec2(0.5) / vec2(textureSize(foam_atlas,0));
	return clamp((tile+clamp(uv,vec2(0.0),vec2(1.0)))/atlas_grid,
		tile/atlas_grid+half_pixel,(tile+vec2(1.0))/atlas_grid-half_pixel);
}
void fragment() {
	float shade = 0.74+0.26*pow(max(dot(normalize(ocean_world_normal),normalize(vec3(-0.5,0.8,-0.3))),0.0),2.0);
	vec3 blue = mix(palette0,palette1,clamp((shade-0.772727)/0.054546,0.0,1.0));
	blue = mix(blue,palette2,clamp((shade-0.827273)/0.090909,0.0,1.0));
	blue = mix(blue,palette3,clamp((shade-0.918182)/0.059091,0.0,1.0));
	float foam = mix(texture(foam_atlas,atlas_uv(UV,frame_a)).r,texture(foam_atlas,atlas_uv(UV,frame_b)).r,frame_blend);
	float crest = smoothstep(foam_threshold-0.02,foam_threshold+0.02,foam);
	ALBEDO = mix(blue,vec3(0.88,0.96,1.0),crest);
}
