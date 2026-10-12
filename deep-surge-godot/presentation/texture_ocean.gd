extends Node3D
## Visual-only texture ocean. Geometry rebuilds only when the footprint changes.
const SEA_SHADER = preload("res://assets/shaders/texture_ocean.gdshader")
const FOAM_SHADER = preload("res://assets/shaders/contact_foam.gdshader")
var sea: MeshInstance3D
var contact: MeshInstance3D
var material: ShaderMaterial
var foam_material: ShaderMaterial
var contact_edges: Array = []
var config: Dictionary
var _signature := ""

func create(assets: RefCounted) -> void:
	config = assets.data("data.ocean.texture-config")
	material = ShaderMaterial.new(); material.shader = SEA_SHADER
	material.set_shader_parameter("water_pattern", assets.texture("texture.ocean.ripples"))
	for key in ["pattern_scale", "normal_strength"]: material.set_shader_parameter(key, config[key])
	for key in ["flow_a", "flow_b"]: material.set_shader_parameter(key, Vector2(config[key][0], config[key][1]))
	for key in ["deep_color", "ripple_color"]: material.set_shader_parameter(key, Color(config[key]))
	sea = MeshInstance3D.new(); sea.name = "TextureSea"
	var plane := PlaneMesh.new(); plane.size = Vector2(config.sea_size, config.sea_size)
	sea.mesh = plane; sea.material_override = material
	sea.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; add_child(sea)
	foam_material = ShaderMaterial.new(); foam_material.shader = FOAM_SHADER
	foam_material.set_shader_parameter("foam_pattern", assets.texture("texture.ocean.contact-foam"))
	for key in ["foam_opacity", "foam_speed"]: foam_material.set_shader_parameter(key, config[key])
	foam_material.set_shader_parameter("foam_color", Color(config.foam_color))
	contact = MeshInstance3D.new(); contact.name = "RaftContactFoam"; contact.position.y = 0.006
	contact.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	contact.material_override = foam_material; contact.visible = false; add_child(contact)

func sync_cells(cells: Array) -> void:
	var occupied: Dictionary = {}
	for cell in cells:
		if cell.status != "detached": occupied[Vector2i(cell.x,cell.y)] = true
	var signature := str(occupied.keys())
	if signature == _signature: return
	_signature = signature; contact_edges.clear()
	var vertices := PackedVector3Array(); var uvs := PackedVector2Array(); var colors := PackedColorArray(); var indices := PackedInt32Array()
	var spacing := Vector2(float(config.cell_spacing[0]),float(config.cell_spacing[1]))
	var width: float = config.foam_width
	for cell in occupied:
		var center := Vector3((cell.x-0.5)*spacing.x,0,(cell.y-0.5)*spacing.y)
		for direction in [Vector2i.LEFT,Vector2i.RIGHT,Vector2i.UP,Vector2i.DOWN]:
			if occupied.has(cell+direction): continue
			var outward := Vector3(direction.x,0,direction.y)
			var along := Vector3(-direction.y,0,direction.x)
			var half_length: float = spacing.y*0.5 if direction.x != 0 else spacing.x*0.5
			var half_depth: float = spacing.x*0.5 if direction.x != 0 else spacing.y*0.5
			var edge_center: Vector3 = center+outward*(half_depth-0.08)
			var a: Vector3 = edge_center-along*half_length
			var b: Vector3 = edge_center+along*half_length
			var start := vertices.size()
			vertices.append_array(PackedVector3Array([a,b,b+outward*width,a+outward*width]))
			uvs.append_array(PackedVector2Array([Vector2(0,0),Vector2(half_length*2,0),Vector2(half_length*2,1),Vector2(0,1)]))
			var phase: float = fposmod(float(cell.x*17+cell.y*31+direction.x*7+direction.y*11)*0.137,1)
			for i in range(4): colors.append(Color(phase,1,1,1))
			indices.append_array(PackedInt32Array([start,start+1,start+2,start,start+2,start+3]))
			contact_edges.append({"cell":cell,"direction":direction,"a":a,"b":b})
	contact.visible = not vertices.is_empty()
	if vertices.is_empty(): contact.mesh = null; return
	var arrays: Array = []; arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices; arrays[Mesh.ARRAY_TEX_UV] = uvs; arrays[Mesh.ARRAY_COLOR] = colors; arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new(); mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	contact.mesh = mesh

func tick(time: float) -> void:
	material.set_shader_parameter("visual_time",time)
	foam_material.set_shader_parameter("visual_time",time)
