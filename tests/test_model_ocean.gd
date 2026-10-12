extends SceneTree
var failures := 0
func check(ok: bool, message: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+message)
func _init() -> void: call_deferred("run")
func run() -> void:
	check(FileAccess.file_exists("res://presentation/model_ocean.gd"),"需要校准尺度与水线的3D模型海面组件")
	if failures: quit(1); return
	var app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22}); await process_frame
	var ocean = app.world_view.model_ocean
	check(ocean != null,"默认航行使用3D模型海面")
	check(ocean.meshes[0].mesh.get_blend_shape_count() == 15,"保留用户源的16姿态动画")
	check(ocean.meshes[0].mesh.surface_get_arrays(0)[Mesh.ARRAY_INDEX].size()/3 == 20000,"恢复第一版原GLB每块20000三角形")
	check(ocean.meshes[0].mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX].size() == 10201,"恢复第一版完整源顶点")
	check(ocean.meshes[0].scale.is_equal_approx(Vector3.ONE),"恢复第一版浪的水平尺度和高度")
	var arrays: Array = ocean.meshes[0].mesh.surface_get_arrays(0)
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]; var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
	var winding: Vector3 = (vertices[indices[1]]-vertices[indices[0]]).cross(vertices[indices[2]]-vertices[indices[0]])
	check(winding.dot(arrays[Mesh.ARRAY_NORMAL][indices[0]]) < 0,"网格采用Godot正面顺时针绕序，避免背面翻转照明")
	var saved: Dictionary = app.session.snapshot()
	for time in [0.0,0.3125,1.25,2.5,5.0,7.5,9.9999,0.0001]:
		app.world_view._time = time; app.world_view.motion = false; app.world_view._process(0)
		for tile in app.world_view.cells.get_children():
			for corner in [Vector3(-1.1,-0.25,-1.0),Vector3(1.1,-0.25,-1.0),Vector3(-1.1,-0.25,1.0),Vector3(1.1,-0.25,1.0)]:
				var point: Vector3 = tile.to_global(corner)
				check(point.y-ocean.height_at(point.x,point.z) < -0.1,"各格筏底持续浸水，不悬空")
		for edge in app.world_view.texture_ocean.contact_edges:
			var a: Vector3 = edge.a
			check(absf(ocean.height_at(a.x,a.z)-ocean.plane_at(a.x,a.z)) < .005,"泡沫边与船边实际水面一致")
		check(absf(app.world_view.raft.rotation.x) < .026 and absf(app.world_view.raft.rotation.z) < .026,"木筏倾斜不过量")
	check(app.session.snapshot() == saved,"模型播放/水线/泡沫不改变规则与随机")
	var period: float = float(ocean.config.frames)*float(ocean.config.frame_seconds)
	ocean.tick(period-.0001); var tail: float = ocean.height_at(7,2)
	ocean.tick(.0001); check(absf(tail-ocean.height_at(7,2)) < .01,"动画接缝水位连续")
	app.queue_free(); await process_frame
	print("MODEL OCEAN: %s" % ("PASS" if failures == 0 else "FAIL")); quit(0 if failures == 0 else 1)
