shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;
uniform float visual_time = 0.0;
uniform vec3 deep_color : source_color = vec3(0.018, 0.068, 0.09);
uniform vec3 crest_color : source_color = vec3(0.12, 0.25, 0.29);
varying vec3 ocean_position;
float wave(vec2 p) {
    return sin(p.x * 1.12 + p.y * 0.65 + visual_time * 0.85) * 0.10
         + sin(p.y * 1.58 - p.x * 0.42 - visual_time * 0.72) * 0.055
         + sin(p.x * 3.5 + p.y * 2.8 + visual_time * 1.2) * 0.018;
}
void vertex() {
    vec2 p = VERTEX.xz;
    VERTEX.y += wave(p);
    float dx = (wave(p + vec2(0.04, 0.0)) - wave(p - vec2(0.04, 0.0))) / 0.08;
    float dz = (wave(p + vec2(0.0, 0.04)) - wave(p - vec2(0.0, 0.04))) / 0.08;
    NORMAL = normalize(vec3(-dx, 1.0, -dz));
    ocean_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
void fragment() {
    vec2 p = ocean_position.xz;
    float ripples = sin(p.x * 13.0 + sin(p.y * 5.2) * 1.2 + visual_time * 1.1)
                  * sin(p.y * 9.7 - visual_time * 0.9);
    float sparkle = pow(max(0.0, ripples), 12.0);
    float crest = smoothstep(0.08, 0.16, ocean_position.y);
    ALBEDO = mix(deep_color, crest_color, crest * 0.7 + sparkle * 0.30);
    ROUGHNESS = 0.20 + (1.0 - sparkle) * 0.08;
    SPECULAR = 0.82;
    METALLIC = 0.16;
    EMISSION = crest_color * sparkle * 0.10;
}
