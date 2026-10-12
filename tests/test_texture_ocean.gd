extends SceneTree
var failures := 0
func check(ok: bool, message: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+message)
func meshes(node: Node) -> Array:
	var result: Array = []
	if node is MeshInstance3D: result.append(node)
	for child in node.get_children(): result.append_array(meshes(child))
	return result
func _init() -> void:
	call_deferred("run")
func run() -> void:
	var app = load("res://scenes/main.tscn").instantiate()
	app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22})
	await process_frame
	var ocean = app.world_view.texture_ocean
	var triangles := 0
	for mesh in meshes(ocean):
		for surface in range(mesh.mesh.get_surface_count()):
			triangles += mesh.mesh.surface_get_arrays(surface)[Mesh.ARRAY_INDEX].size()/3
	check(triangles <= 100,"纹理回退组件与接触泡沫合计最多100三角形，当前：%d" % triangles)
	check(ocean.has_method("sync_cells"),"海面支持按真实筏格更新外缘")
	if ocean.has_method("sync_cells"):
		check(ocean.contact_edges.size() == 8,"四格共享边不产生内侧泡沫")
		var snapshot: Dictionary = app.session.snapshot()
		var saved_mesh = ocean.contact.mesh
		app.world_view.sync(app.session.view())
		check(ocean.contact.mesh == saved_mesh,"不变的筏格不重建网格")
		var fixture: Array = app.session.view().cells.duplicate(true)
		fixture[0].status = "detached"; ocean.sync_cells(fixture)
		check(ocean.contact_edges.size() == 8,"L形木筏更新凹角外缘")
		fixture[1].status = "detached"; fixture[2].status = "detached"; ocean.sync_cells(fixture)
		check(ocean.contact_edges.size() == 4,"单格仅保留四条泡沫边")
		fixture[3].status = "detached"; ocean.sync_cells(fixture)
		check(ocean.contact_edges.is_empty() and not ocean.contact.visible,"全部脱落后清除接触效果")
		var holed: Array = []
		for x in range(3):
			for y in range(3): holed.append({"x":x,"y":y,"status":"detached" if x == 1 and y == 1 else "intact"})
		ocean.sync_cells(holed)
		check(ocean.contact_edges.size() == 16,"扩展木筏保留中心洞口的四条边")
		ocean.sync_cells(app.session.view().cells)
		for time in [0.0,2.0,5.0,9.0]:
			app.world_view._time = time; app.world_view.motion = false; app.world_view._process(0)
			var baseline: float = app.world_view.model_ocean.plane_height if app.world_view.model_ocean != null else 0.0
			check(absf(app.world_view.raft.position.y-baseline+0.055) <= 0.026,"木筏保持水面下的固定吃水")
			check(is_equal_approx(ocean.contact.position.y,0.006),"泡沫留在水面，不随木筏升降")
		check(app.session.snapshot() == snapshot,"视觉播放与外缘更新不改变规则及随机状态")
		app.handle_command("home"); var stopped: float = app.world_view._time
		app.world_view._process(1)
		check(app.world_view._time == stopped,"首页暂停视觉计算")
	app.queue_free(); await process_frame
	print("TEXTURE OCEAN: %s" % ("PASS" if failures == 0 else "FAIL")); quit(0 if failures == 0 else 1)
