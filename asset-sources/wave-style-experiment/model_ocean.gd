extends "res://presentation/supplied_ocean.gd"
## Runtime LOD of the supplied Ocean poses. Near-raft waves are softened to a
## shared tangent waterline, a presentation approximation rather than fluid physics.
const MODEL_SHADER = preload("res://assets/shaders/model_ocean.gdshader")
const FAR_SHADER = preload("res://assets/shaders/stylized_far_ocean.gdshader")
var settings: Dictionary
var plane_height := 0.0
var plane_slope := Vector2.ZERO
var raft_bounds := Vector4(0,0,2.35,2.1)

func create(assets: RefCounted) -> bool:
	if not super.create(assets): return false
	settings = assets.data("data.ocean.model-config")
	var original := surface
	var original_side: int = config.grid_side
	var stride: int = settings.grid_stride
	var side: int = (original_side-1)/stride+1
	var reduced := PackedFloat32Array()
	for frame in range(int(config.frames)):
		for row in range(0,original_side,stride):
			for col in range(0,original_side,stride):
				var index := (frame*original_side*original_side+row*original_side+col)*3
				reduced.append_array(original.slice(index,index+3))
	surface = reduced; config.grid_side = side
	var indices := PackedInt32Array(); var uv := PackedVector2Array()
	for row in range(side):
		for col in range(side): uv.append(Vector2(float(col)/(side-1),float(row)/(side-1)))
	for row in range(side-1):
		for col in range(side-1):
			var a := row*side+col; var b := a+1; var c := a+side; var d := c+1
			indices.append_array(PackedInt32Array([a,c,b,b,c,d]))
	var mesh := ArrayMesh.new(); mesh.blend_shape_mode = Mesh.BLEND_SHAPE_MODE_NORMALIZED
	var poses: Array = []
	for frame in range(int(config.frames)):
		var vertices := PackedVector3Array(); var normals := PackedVector3Array(); var tangents := PackedFloat32Array()
		for index in range(side*side):
			var offset := (frame*side*side+index)*3
			vertices.append(Vector3(surface[offset],surface[offset+1],surface[offset+2]))
		for row in range(side):
			for col in range(side):
				var dx: Vector3 = vertices[row*side+mini(col+1,side-1)]-vertices[row*side+maxi(col-1,0)]
				var dz: Vector3 = vertices[mini(row+1,side-1)*side+col]-vertices[maxi(row-1,0)*side+col]
				var normal := dx.cross(dz).normalized(); normals.append(normal)
				var tangent := (Vector3.RIGHT-normal*normal.x).normalized()
				tangents.append_array(PackedFloat32Array([tangent.x,tangent.y,tangent.z,1.0]))
		var arrays: Array = []; arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = vertices; arrays[Mesh.ARRAY_NORMAL] = normals; arrays[Mesh.ARRAY_TANGENT] = tangents
		poses.append(arrays)
		if frame > 0: mesh.add_blend_shape("OceanPose%02d" % frame)
	var base: Array = poses[0]; base[Mesh.ARRAY_TEX_UV] = uv; base[Mesh.ARRAY_INDEX] = indices
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,base,poses.slice(1))
	material.shader = MODEL_SHADER
	material.set_shader_parameter("foam_breakup",assets.texture("texture.ocean.contact-foam"))
	for key in ["foam_threshold","foam_strength","contact_margin","contact_transition","shade_start","shade_end"]: material.set_shader_parameter(key,settings[key])
	for key in ["flat_color","shadow_color","foam_color"]: material.set_shader_parameter(key,Color(settings[key]))
	for node in meshes:
		node.mesh = mesh
		node.scale = Vector3(settings.horizontal_scale,settings.height_scale,settings.horizontal_scale)
		node.position.x *= float(settings.horizontal_scale); node.position.z *= float(settings.horizontal_scale)
	tick(0.0)
	return true

func backdrop_material() -> ShaderMaterial:
	var result := ShaderMaterial.new(); result.shader = FAR_SHADER
	result.set_shader_parameter("flat_color",Color(settings.flat_color)); return result

func sync_cells(cells: Array) -> void:
	var minimum := Vector2(INF,INF); var maximum := Vector2(-INF,-INF)
	for cell in cells:
		if cell.status == "detached": continue
		var center := Vector2((cell.x-.5)*2.35,(cell.y-.5)*2.1)
		minimum = minimum.min(center-Vector2(1.175,1.05)); maximum = maximum.max(center+Vector2(1.175,1.05))
	if not is_finite(minimum.x): return
	var center := (minimum+maximum)*.5; var half := (maximum-minimum)*.5
	raft_bounds = Vector4(center.x,center.y,half.x,half.y)
	material.set_shader_parameter("raft_bounds",raft_bounds)

func raw_height_at(x: float,z: float) -> float:
	return super.height_at(x/float(settings.horizontal_scale),z/float(settings.horizontal_scale))*float(settings.height_scale)

func plane_at(x: float,z: float) -> float:
	return plane_height+plane_slope.dot(Vector2(x,z))

func height_at(x: float,z: float) -> float:
	var q := (Vector2(x,z)-Vector2(raft_bounds.x,raft_bounds.y)).abs()-Vector2(raft_bounds.z,raft_bounds.w)
	var distance := q.max(Vector2.ZERO).length()
	var blend: float = 1.0-smoothstep(settings.contact_margin,settings.contact_margin+settings.contact_transition,distance)
	var height := lerpf(raw_height_at(x,z),plane_at(x,z),blend)
	return lerpf(height,-.40,smoothstep(27,36,Vector2(x,z).length()))

func tick(time: float) -> void:
	super.tick(time)
	if settings == null or settings.is_empty(): return
	material.set_shader_parameter("visual_time",time)
	var center := Vector2(raft_bounds.x,raft_bounds.y)
	var radius := Vector2(maxf(raft_bounds.z,.5),maxf(raft_bounds.w,.5))
	var left := raw_height_at(center.x-radius.x,center.y); var right := raw_height_at(center.x+radius.x,center.y)
	var front := raw_height_at(center.x,center.y+radius.y); var back := raw_height_at(center.x,center.y-radius.y)
	plane_slope = Vector2(clampf((right-left)/(radius.x*2),-settings.slope_limit,settings.slope_limit),clampf((front-back)/(radius.y*2),-settings.slope_limit,settings.slope_limit))
	plane_height = (left+right+front+back+raw_height_at(center.x,center.y))/5.0-plane_slope.dot(center)
	material.set_shader_parameter("plane_height",plane_height); material.set_shader_parameter("plane_slope",plane_slope)
