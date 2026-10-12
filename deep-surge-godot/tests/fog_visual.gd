extends SceneTree
var app: Control
var failures := 0
func _init() -> void: call_deferred("run")
func capture(id: String) -> void:
	await process_frame; await process_frame; await RenderingServer.frame_post_draw
	if root.get_texture().get_image().save_png("res://evidence/fog-"+id+".png") != OK: failures += 1
func run() -> void:
	root.size = Vector2i(1600,900)
	app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app); await process_frame
	app.handle_command("new",{"mode":"challenge","origin":"strong","seed":22})
	app.handle_command("voyage",{"id":app.session.state.candidates[0].visit_id})
	app.world_view.motion = false; var saved: Dictionary = app.session.snapshot()
	for time in [0.0,6.0]:
		app.world_view._time = time; app.world_view._process(0); await capture("t%d" % int(time))
	var fixture: Dictionary = app.session.view().duplicate(true); fixture.cells = []
	for x in range(4):
		for y in range(3): fixture.cells.append({"id":"fog-fixture-%d-%d" % [x,y],"x":x,"y":y,"status":"intact","equipment":{}})
	app.world_view.sync(fixture); app.world_view._process(0); await capture("wide-raft")
	root.size = Vector2i(1280,720); await capture("wide-raft-1280")
	if app.session.snapshot() != saved: failures += 1; printerr("FAIL: 雾表现修改了真实游戏状态")
	app.queue_free(); await process_frame
	print("FOG GPU: %s (4x3 visual fixture, scaled fog, 2 resolutions, state independent)" % ("PASS" if failures == 0 else "FAIL")); quit(0 if failures == 0 else 1)
