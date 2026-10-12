extends SceneTree
## Real GPU captures of the toon night ocean. Visual-only; game state must stay unchanged.
var failures := 0
var app: Control
func check(ok: bool,message: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+message)
func _init() -> void: call_deferred("run")
func capture(id: String) -> void:
	await process_frame; await process_frame; await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png("res://evidence/toon-ocean-"+id+".png") == OK,"保存GPU截图")
func run() -> void:
	root.size = Vector2i(1600,900)
	app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22})
	app.handle_command("voyage",{"id":app.session.state.candidates[0].visit_id})
	app.world_view.motion = false
	var ocean = app.world_view.toon_ocean; check(ocean != null and app.world_view.ocean == ocean,"默认使用风格化夜海")
	var saved: Dictionary = app.session.snapshot(); var contacts: Array = []
	for time in [0.0,1.5,3.0,4.5,6.0,9.0]:
		app.world_view._time = time; app.world_view._process(0)
		var clearance: Array = []
		for tile in app.world_view.cells.get_children():
			for corner in [Vector3(-1.1,-.25,-1),Vector3(1.1,-.25,-1),Vector3(-1.1,-.25,1),Vector3(1.1,-.25,1)]:
				var point: Vector3 = tile.to_global(corner)
				var gap: float = point.y-ocean.height_at(point.x,point.z); clearance.append(gap)
				check(gap < -.1 and gap > -.3,"筏底浸水幅度稳定")
		contacts.append({"time":time,"raft_height":app.world_view.raft.position.y,"clearance":clearance})
		await capture("t%.1f" % time)
	root.size = Vector2i(1280,720); await capture("1280"); root.size = Vector2i(1600,900)
	var view: Dictionary = app.session.view().duplicate(true); view.cells[0].status = "detached"
	app.world_view.sync(view); app.world_view._process(0); await capture("detached")
	app.world_view.sync(app.session.view()); app.world_view._process(0)
	check(app.session.snapshot() == saved,"图形验证不改变游戏状态")
	var begin := Time.get_ticks_usec()
	for i in range(1000): app.world_view._process(.016)
	var cpu: float = (Time.get_ticks_usec()-begin)/1000.0
	Engine.max_fps = 0; var frames: Array = []
	for i in range(180):
		var start := Time.get_ticks_usec(); await process_frame
		if i>=60: frames.append((Time.get_ticks_usec()-start)/1000.0)
	frames.sort()
	var near_mesh: PlaneMesh = ocean.near.mesh
	var report := {"renderer":RenderingServer.get_current_rendering_method(),"gpu":RenderingServer.get_video_adapter_name(),
		"near_triangles":near_mesh.get_mesh_arrays()[Mesh.ARRAY_INDEX].size()/3,"far_triangles":2,
		"cpu_update_us":cpu,"app_frame_median_ms":frames[frames.size()/2],"app_frame_p95_ms":frames[int(frames.size()*.95)],
		"contacts":contacts,"scope":"Whole app wall time, not isolated GPU timing; visual-only waterline approximation, no physical fluid simulation."}
	var file := FileAccess.open("res://evidence/toon-ocean-metrics.json",FileAccess.WRITE); file.store_string(JSON.stringify(report,"  ")); file.close()
	app.queue_free(); await process_frame
	print("TOON OCEAN GPU: %s" % ("PASS" if failures == 0 else "FAIL")); print(JSON.stringify(report)); quit(0 if failures == 0 else 1)
