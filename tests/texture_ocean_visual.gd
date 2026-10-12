extends SceneTree
var failures := 0
var app: Control
func check(ok: bool, message: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+message)
func _init() -> void: call_deferred("run")
func capture(id: String) -> void:
	await process_frame; await process_frame; await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png("res://evidence/texture-ocean-"+id+".png") == OK,"截图保存")
func run() -> void:
	root.size = Vector2i(1600,900)
	app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22})
	app.handle_command("voyage",{"id":app.session.state.candidates[0].visit_id})
	# Explicitly preview the retained texture fallback; the game's default is 3D.
	if app.world_view.model_ocean != null:
		app.world_view.model_ocean.queue_free(); app.world_view.model_ocean = null
	app.world_view.texture_ocean.sea.position.y = 0.0
	app.world_view.texture_ocean.sea.visible = true
	app.world_view.texture_ocean.sea.material_override = app.world_view.texture_ocean.material
	app.world_view.texture_ocean.foam_material.set_shader_parameter("plane_height",0.0)
	app.world_view.texture_ocean.foam_material.set_shader_parameter("plane_slope",Vector2.ZERO)
	for key in app.world_view._materials:
		if key.begins_with("wet:"):
			app.world_view._materials[key].set_shader_parameter("water_height",0.0)
			app.world_view._materials[key].set_shader_parameter("water_slope",Vector2.ZERO)
	app.world_view.motion = false
	var saved: Dictionary = app.session.snapshot()
	var contacts: Array = []
	for time in [0.0,2.0,5.0,8.0]:
		app.world_view._time = time; app.world_view._process(0)
		var clearance: Array = []
		for point in [Vector3(-2.1,-0.12,-1.9),Vector3(2.1,-0.12,-1.9),Vector3(-2.1,-0.12,1.9),Vector3(2.1,-0.12,1.9)]:
			var height: float = app.world_view.raft.to_global(point).y
			check(height < -0.10,"筏底持续浸水，不悬空")
			clearance.append(height)
		contacts.append({"time":time,"bottom_height_corners":clearance})
		await capture("t%d" % int(time))
	root.size = Vector2i(1280,720); await capture("1280")
	root.size = Vector2i(1600,900)
	var fixture: Array = app.session.view().cells.duplicate(true)
	fixture[0].status = "detached"
	var preview: Dictionary = app.session.view().duplicate(true); preview.cells = fixture
	app.world_view.sync(preview); await capture("detached")
	app.world_view.sync(app.session.view())
	check(app.session.snapshot() == saved,"视觉检查不修改游戏状态")
	var begin := Time.get_ticks_usec()
	for i in range(10000): app.world_view._process(0.016)
	var cpu_us: float = (Time.get_ticks_usec()-begin)/10000.0
	Engine.max_fps = 0
	var frames: Array = []
	for i in range(180):
		var start := Time.get_ticks_usec(); await process_frame
		if i >= 60: frames.append((Time.get_ticks_usec()-start)/1000.0)
	frames.sort()
	var report := {"renderer":RenderingServer.get_current_rendering_method(),"gpu":RenderingServer.get_video_adapter_name(),
		"sea_triangles":2,"contact_triangles":app.world_view.texture_ocean.contact_edges.size()*2,
		"visual_update_cpu_us":cpu_us,"whole_app_frame_median_ms":frames[frames.size()/2],
		"whole_app_frame_p95_ms":frames[int(frames.size()*.95)],"contacts":contacts,
		"scope":"Whole app wall time; includes UI, raft and display pacing, not isolated GPU timing. No FPS percentage claim."}
	var file := FileAccess.open("res://evidence/texture-ocean-metrics.json",FileAccess.WRITE); file.store_string(JSON.stringify(report,"  ")); file.close()
	app.queue_free(); await process_frame
	print("TEXTURE OCEAN GPU: %s" % ("PASS" if failures == 0 else "FAIL")); print(JSON.stringify(report)); quit(0 if failures == 0 else 1)
