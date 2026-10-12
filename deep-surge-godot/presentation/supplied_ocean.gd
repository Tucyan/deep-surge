extends Node3D
## Source Ocean poses and foam only. All timing is visual, independent of GameSession.
const SHADER = preload("res://assets/shaders/supplied_ocean.gdshader")
var config: Dictionary = {}
var surface := PackedFloat32Array()
var meshes: Array[MeshInstance3D] = []
var material: ShaderMaterial
var frame_a := 0
var frame_b := 1
var frame_blend := 0.0
var _previous_a := -1
var _previous_b := -1

func create(assets: RefCounted) -> bool:
	config = assets.data("data.ocean.config")
	var source: PackedScene = assets.model("model.ocean")
	surface = assets.bytes("data.ocean.surface").to_float32_array()
	if source == null or config.is_empty() or surface.size() != int(config.frames)*int(config.grid_side)*int(config.grid_side)*3: return false
	material = ShaderMaterial.new(); material.shader = SHADER
	material.set_shader_parameter("foam_atlas",assets.texture("texture.ocean.foam"))
	material.set_shader_parameter("foam_threshold",config.foam_threshold)
	material.set_shader_parameter("atlas_grid",config.atlas_grid)
	for i in range(4):
		var color: Array = config.palette_linear[i]
		material.set_shader_parameter("palette%d" % i,Vector3(color[0],color[1],color[2]))
	for row in range(-1,2):
		for col in range(-1,2):
			var tile := source.instantiate()
			tile.name = "OceanTile_%d_%d" % [col,row]
			tile.position = Vector3(col*config.tile_size,0,row*config.tile_size)
			add_child(tile); collect(tile)
	if meshes.size() != 9: return false
	for mesh in meshes:
		if mesh.mesh.get_blend_shape_count() != int(config.frames)-1: return false
		mesh.material_override = material
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tick(0.0)
	return true

func collect(node: Node) -> void:
	if node is MeshInstance3D: meshes.append(node)
	for child in node.get_children(): collect(child)

func tick(time: float) -> void:
	if meshes.is_empty(): return
	var frame: float = fposmod(time/float(config.frame_seconds),float(config.frames))
	frame_a = int(floor(frame)); frame_b = (frame_a+1)%int(config.frames); frame_blend = frame-floor(frame)
	for mesh in meshes:
		for index in [_previous_a,_previous_b]:
			if index > 0: mesh.set_blend_shape_value(index-1,0.0)
		if frame_a > 0: mesh.set_blend_shape_value(frame_a-1,1.0-frame_blend)
		if frame_b > 0: mesh.set_blend_shape_value(frame_b-1,frame_blend)
	_previous_a = frame_a; _previous_b = frame_b
	material.set_shader_parameter("frame_a",float(frame_a)); material.set_shader_parameter("frame_b",float(frame_b)); material.set_shader_parameter("frame_blend",frame_blend)

func vertex(index: int) -> Vector3:
	var stride: int = int(config.grid_side)*int(config.grid_side)*3
	var a: int = frame_a*stride+index*3; var b: int = frame_b*stride+index*3
	return Vector3(lerpf(surface[a],surface[b],frame_blend),lerpf(surface[a+1],surface[b+1],frame_blend),lerpf(surface[a+2],surface[b+2],frame_blend))

func triangle_height(point: Vector2, a: Vector3, b: Vector3, c: Vector3):
	var edge1 := Vector2(b.x-a.x,b.z-a.z); var edge2 := Vector2(c.x-a.x,c.z-a.z); var relative := point-Vector2(a.x,a.z)
	var determinant: float = edge1.cross(edge2)
	if absf(determinant) < 0.00001: return null
	var u: float = relative.cross(edge2)/determinant; var v: float = edge1.cross(relative)/determinant
	if u < -0.0001 or v < -0.0001 or u+v > 1.0001: return null
	return a.y+u*(b.y-a.y)+v*(c.y-a.y)

func height_at(x: float, z: float) -> float:
	if surface.is_empty(): return 0.0
	var side: int = int(config.grid_side)
	x = fposmod(x+float(config.tile_size)*0.5,float(config.tile_size))-float(config.tile_size)*0.5
	z = fposmod(z+float(config.tile_size)*0.5,float(config.tile_size))-float(config.tile_size)*0.5
	var col: int = clampi(int(floor((x/float(config.tile_size)+0.5)*(side-1))),1,side-2)
	var row: int = clampi(int(floor((0.5-z/float(config.tile_size))*(side-1))),1,side-2)
	var point := Vector2(x,z)
	for radius in range(5):
		for y in range(maxi(0,row-radius),mini(side-1,row+radius+1)):
			for xx in range(maxi(0,col-radius),mini(side-1,col+radius+1)):
				if radius > 0 and absi(y-row) < radius and absi(xx-col) < radius: continue
				var a := vertex(y*side+xx); var b := vertex(y*side+xx+1)
				var c := vertex((y+1)*side+xx); var d := vertex((y+1)*side+xx+1)
				var height = triangle_height(point,a,b,c)
				if height != null: return height
				height = triangle_height(point,b,d,c)
				if height != null: return height
	return vertex(row*side+col).y
