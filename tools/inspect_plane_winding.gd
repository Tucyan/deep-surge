extends SceneTree
func _init() -> void:
	var arrays: Array = PlaneMesh.new().surface_get_arrays(0)
	var v: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var i: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
	print("GODOT PLANE wind=",(v[i[1]]-v[i[0]]).cross(v[i[2]]-v[i[0]])," normal=",arrays[Mesh.ARRAY_NORMAL][0])
	quit()
