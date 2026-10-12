extends SceneTree
# Supplied card/UI regression on the CURRENT model ocean. Source Ocean archive
# import/poses remain covered separately by test_supplied_assets.gd.
var failures := 0
var app: Control
func check(ok: bool, text: String) -> void:
	if not ok: failures += 1; printerr("FAIL: "+text)
func _init() -> void:
	call_deferred("run")
func snapshot_frame(id: String) -> void:
	await process_frame; await process_frame; await RenderingServer.frame_post_draw
	check(root.get_texture().get_image().save_png("res://evidence/supplied-current-"+id+".png") == OK,"保存实际GPU画面")
func run() -> void:
	root.size = Vector2i(1600,900)
	app = load("res://scenes/main.tscn").instantiate(); app.persistence = false; root.add_child(app)
	await process_frame
	app.handle_command("new",{"mode":"story","origin":"strong","seed":22})
	app.handle_command("voyage",{"id":app.session.state.candidates[0].visit_id})
	app.world_view.motion = false
	var saved: Dictionary = app.session.snapshot()
	var ocean = app.world_view.model_ocean
	check(ocean != null,"真实场景使用新海面，未走旧占位回退")
	var samples: Array = []
	var times: Array = [0.0,0.3125,1.25,2.5,5.0,7.5,9.9999,0.0001]
	for i in range(times.size()):
		app.world_view._time = times[i]; app.world_view._process(0.0)
		var position: Vector3 = app.world_view.raft.position
		check(is_finite(position.y) and absf(position.y) < 2,"木筏高度有限")
		check(absf(app.world_view.raft.rotation.x) <= 0.151 and absf(app.world_view.raft.rotation.z) <= 0.151,"木筏倾斜受限")
		var contacts: Array = []
		for local in [Vector3(-2.1,0.13,-1.9),Vector3(2.1,0.13,-1.9),Vector3(-2.1,0.13,1.9),Vector3(2.1,0.13,1.9)]:
			var point: Vector3 = app.world_view.raft.to_global(local)
			contacts.append(point.y-ocean.height_at(point.x,point.z))
		samples.append({"time":times[i],"raft_height":position.y,"center_water":ocean.height_at(0,0),"bottom_clearance_corners":contacts})
		await snapshot_frame("ocean-%02d" % i)
	check(app.session.snapshot() == saved,"海面播放/采样/截图不改变规则和随机流")
	var report := FileAccess.open("res://evidence/supplied-current-motion.json",FileAccess.WRITE); report.store_string(JSON.stringify(samples,"  ")); report.close()
	app.handle_command("panel",{"id":"craft"}); await snapshot_frame("craft")
	app.handle_command("home"); app.handle_command("panel",{"id":"encyclopedia"}); app.handle_ui("category","enemies")
	await snapshot_frame("card-back")
	app.queue_free(); await process_frame
	var gallery := GridContainer.new(); gallery.columns = 7; gallery.add_theme_constant_override("h_separation",14); gallery.add_theme_constant_override("v_separation",15)
	gallery.position = Vector2(20,20); gallery.size = Vector2(1550,820); root.add_child(gallery)
	var assets = load("res://presentation/asset_catalog.gd").new(); var catalog = load("res://content/catalog.gd").new(); catalog.load_catalog()
	for id in ["wood","iron","plastic","rope","cloth","food","water","calm","punch","arrow","spear","lamp","filter","planter","medkit","crossbow","spearRack","repair","dismantle"]:
		var tile = load("res://presentation/item_card.gd").new(); gallery.add_child(tile)
		tile.create(assets,{"id":id,"definition":catalog.entry("cards",id)},"查看",func(): pass,180,245)
	await snapshot_frame("card-gallery")
	gallery.queue_free(); await process_frame
	print("SUPPLIED VISUAL: %s (模型海面8时刻、浮动、图鉴卡背、配方、19卡图与UI)" % ("PASS" if failures == 0 else "FAIL"))
	quit(0 if failures == 0 else 1)
