extends SceneTree
var failures := 0
func check(ok: bool,message: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+message)
func _init() -> void: call_deferred("run")
func run() -> void:
	var app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22}); await process_frame
	var ocean = app.world_view.toon_ocean; var saved: Dictionary = app.session.snapshot()
	check(ocean.mist_layers.size() == 3,"保留三层雾，不增加透明层")
	for material in ocean.mist_materials:
		var bounds = material.get_shader_parameter("clear_bounds")
		check(bounds is Vector4 and bounds == ocean.raft_bounds,"雾遮罩随真实木筏范围同步")
	var expanded: Dictionary = app.session.view().duplicate(true)
	expanded.cells = []
	for x in range(4):
		for y in range(3): expanded.cells.append({"id":"fog-fixture-%d-%d" % [x,y],"x":x,"y":y,"status":"intact","equipment":{}})
	app.world_view.sync(expanded)
	for material in ocean.mist_materials:
		check(material.get_shader_parameter("clear_bounds") == ocean.raft_bounds,"扩展木筏仍受透明区保护")
	app.world_view.apply_view_scale(2.0)
	check(is_equal_approx(app.world_view._env.fog_depth_begin,28) and is_equal_approx(app.world_view._env.fog_depth_end,76),"深度雾保留14/38米并按镜头缩放")
	for material in ocean.mist_materials:
		var reach = material.get_shader_parameter("clear_fade")
		check(reach is Vector2 and reach.x > 2.0,"近筏过渡宽度也随镜头拉远扩大")
	check(app.session.snapshot() == saved,"雾和镜头同步不改变玩法/随机/存档")
	app.queue_free(); await process_frame
	print("FOG: %s" % ("PASS" if failures == 0 else "FAIL")); quit(0 if failures == 0 else 1)
