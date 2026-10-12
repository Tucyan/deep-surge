shader_type spatial;
render_mode unshaded, cull_back;
uniform vec3 flat_color : source_color = vec3(0.325,0.737,0.933);
void fragment() { ALBEDO = flat_color; }
