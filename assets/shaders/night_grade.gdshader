shader_type canvas_item;
// Cold night grade for the voyage SubViewport only; HUD controls are not affected.
uniform float exposure = 0.96;
uniform float contrast = 1.08;
uniform float contrast_pivot = 0.18;
uniform float saturation = 0.86;
uniform vec3 tint = vec3(0.92, 0.97, 1.08);
uniform float vignette_radius = 0.62;
uniform float vignette_softness = 0.55;
uniform float vignette_strength = 0.62;

void fragment() {
	vec4 source = texture(TEXTURE, UV);
	vec3 col = source.rgb * exposure;
	float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
	col = mix(vec3(luma), col, saturation);
	col = max((col - contrast_pivot) * contrast + contrast_pivot, vec3(0.0));
	col *= tint;
	vec2 centered = (UV - 0.5) * vec2(1.0, 0.82);
	float vignette = smoothstep(vignette_radius, vignette_radius + vignette_softness, length(centered) * 1.4142);
	col *= 1.0 - vignette * vignette_strength;
	COLOR = vec4(clamp(col, 0.0, 1.0), source.a);
}
