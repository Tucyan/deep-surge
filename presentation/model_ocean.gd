extends "res://presentation/supplied_ocean.gd"
## Original full-resolution supplied Ocean. Near-raft waves are softened to a
## shared tangent waterline, a presentation approximation rather than fluid physics.
const MODEL_SHADER = preload("res://assets/shaders/model_ocean.gdshader")
var settings: Dictionary
var plane_height := 0.0
var plane_slope := Vector2.ZERO
var raft_bounds := Vector4(0,0,2.35,2.1)

func create(assets: RefCounted) -> bool:
	if not super.create(assets): return false
	settings = assets.data("data.ocean.model-config")
	# Restore the original GLB meshes, normals, UVs and full-size source waves.
	material.shader = MODEL_SHADER
	for key in ["contact_margin","contact_transition"]: material.set_shader_parameter(key,settings[key])
	tick(0.0)
	return true

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
	return height

func tick(time: float) -> void:
	super.tick(time)
	if settings == null or settings.is_empty(): return
	var center := Vector2(raft_bounds.x,raft_bounds.y)
	var radius := Vector2(maxf(raft_bounds.z,.5),maxf(raft_bounds.w,.5))
	var left := raw_height_at(center.x-radius.x,center.y); var right := raw_height_at(center.x+radius.x,center.y)
	var front := raw_height_at(center.x,center.y+radius.y); var back := raw_height_at(center.x,center.y-radius.y)
	plane_slope = Vector2(clampf((right-left)/(radius.x*2),-settings.slope_limit,settings.slope_limit),clampf((front-back)/(radius.y*2),-settings.slope_limit,settings.slope_limit))
	plane_height = (left+right+front+back+raw_height_at(center.x,center.y))/5.0-plane_slope.dot(center)
	material.set_shader_parameter("plane_height",plane_height); material.set_shader_parameter("plane_slope",plane_slope)
