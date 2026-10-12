extends "res://pages/flow_base.gd"
const PHASES := {"navigation":"航行导航","preparation":"航行准备","story":"当前事件","interaction":"商店交易","battle":"战斗进行中","aftermath":"航行收尾","discard":"轮末整理","finished":"航程结束","nightHub":"夜间安排","chapterComplete":"第一层结束"}
const ItemCard = preload("res://presentation/item_card.gd")

func rect(control: Control, anchors: Vector4, offsets: Vector4) -> void:
	control.anchor_left = anchors.x; control.anchor_top = anchors.y
	control.anchor_right = anchors.z; control.anchor_bottom = anchors.w
	control.offset_left = offsets.x; control.offset_top = offsets.y
	control.offset_right = offsets.z; control.offset_bottom = offsets.w

func build() -> void:
	var stage := Control.new(); stage.size_flags_vertical = Control.SIZE_EXPAND_FILL; add_child(stage)
	var title := VBoxContainer.new(); stage.add_child(title); rect(title,Vector4.ZERO,Vector4(28,20,820,168))
	W.text(title,"深 潮",46,W.INK)
	W.text(title,"D E E P   S U R G E  ·  第一层"+("  /  测试剧情" if context.mode == "story" else "  /  挑战"),14,W.MUTED)
	var menu := HBoxContainer.new(); title.add_child(menu)
	if context.can_base and context.get("tutorial_operation","") in ["","craft"]: action(menu,"合成","panel",{"id":"craft"})
	action(menu,"木筏详情","panel",{"id":"raft"})
	action(menu,"航行日志","panel",{"id":"logs"})
	if context.mode == "story" and (not context.known_quests.is_empty() or not context.known_clues.is_empty()): action(menu,"任务与线索","panel",{"id":"journal"})
	W.button(menu,"玩法",func(): request("local_panel","help"))
	W.button(menu,"设置",func(): request("local_panel","settings"))
	action(menu,"返回首页","home")
	for child in menu.get_children(): child.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	W.text(title,"第 %d / %d 次航行    %s" % [context.voyage,context.length,PHASES[context.phase]],17,W.GOLD)
	var status := W.panel(stage); rect(status.get_parent(),Vector4(1,0,1,0),Vector4(-356,24,-24,184))
	status.add_theme_constant_override("separation",8)
	var names := {"hp":"生命","hunger":"饱食","hydration":"水分","sanity":"SAN"}
	var colors := {"hp":Color("c58d68"),"hunger":Color("c8ab69"),"hydration":Color("88b9c5"),"sanity":Color("aaa1cd")}
	for key in names:
		var row := HBoxContainer.new(); row.add_theme_constant_override("separation",8); status.add_child(row)
		var label := W.text(row,names[key],15); label.custom_minimum_size.x = 44; label.size_flags_horizontal = 0
		var bar := ProgressBar.new(); bar.custom_minimum_size = Vector2(0,8); bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER; bar.max_value = context.player[key+"_max"]; bar.value = context.player[key]; bar.show_percentage = false
		var fill := StyleBoxFlat.new(); fill.bg_color = colors[key]; fill.set_corner_radius_all(4); bar.add_theme_stylebox_override("fill",fill)
		var back := StyleBoxFlat.new(); back.bg_color = Color("344b55"); back.set_corner_radius_all(4); bar.add_theme_stylebox_override("background",back)
		row.add_child(bar)
		var number := W.text(row,"%d/%d" % [context.player[key],context.player[key+"_max"]],14); number.custom_minimum_size.x = 64; number.size_flags_horizontal = 0
	if context.phase not in ["chapterComplete","finished"]:
		var ap := W.panel(stage); rect(ap.get_parent(),Vector4(1,0,1,0),Vector4(-174,200,-24,252))
		ap.get_parent().add_theme_stylebox_override("panel",compact_style())
		var night: Dictionary = context.get("night",{})
		if not night.is_empty() and night.voyage == context.voyage and context.phase in ["nightHub","story"]:
			W.text(ap,"今晚机会  %d" % night.budget,20,W.GOLD)
		else: W.text(ap,"行动点  %d/%d" % [context.battle.ap if context.phase == "battle" else context.ap,context.player.battle_ap if context.phase == "battle" else context.player.base_ap],20,W.GOLD)
	var operation := W.panel(stage); rect(operation.get_parent(),Vector4(1,0,1,1),Vector4(-356,270,-24,-326))
	operation.add_theme_constant_override("separation",9)
	operation_content(operation)
	var tray := VBoxContainer.new(); stage.add_child(tray); tray.add_theme_constant_override("separation",7)
	rect(tray,Vector4(0,1,1,1),Vector4(28,-302,-28,-18))
	hand(tray)

func compact_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new(); style.bg_color = Color(0.05,0.105,0.135,0.93); style.border_color = Color("6e6c57"); style.set_border_width_all(1)
	style.content_margin_left = 12; style.content_margin_right = 12; style.content_margin_top = 10; style.content_margin_bottom = 10
	return style

func operation_content(box: Node) -> void:
	var selected: String = context.ui_state.get("card","")
	if selected != "":
		for card in context.hand:
			if card.uid != selected: continue
			W.text(box,card.definition.name,25,W.GOLD)
			W.text(box,card.definition.description,18)
			if context.can_base and card.definition.kind == "survival": action(box,"使用 · "+card.definition.name,"play",{"uid":card.uid})
			if card.definition.kind in ["equipment","action"]: action(box,"在木筏上使用","panel",{"id":"raft"},not context.can_base)
			W.button(box,"返回当前阶段",func(): request("card",""))
			return
	W.text(box,PHASES[context.phase],25,W.GOLD)
	match context.phase:
		"navigation":
			W.text(box,"选择本轮目的地，出发时支付航耗。",16,W.MUTED)
			for node in context.candidates:
				var button := W.button(box,"出发 · "+node.name,func(): send("voyage",{"id":node.visit_id}))
				button.tooltip_text = node.description
		"preparation":
			W.text(box,"已抵达："+context.node.name,18)
			W.text(box,"可使用物资、制造与管理设备。",16,W.MUTED)
			var reason: String = context.get("tutorial_reason","")
			if reason != "": W.text(box,reason,17,W.GOLD)
			action(box,"进入节点","enter",{},reason != "",reason)
			W.primary(box.get_child(box.get_child_count()-1))
		"story","interaction","battle":
			W.text(box,context.node.name,20)
			W.text(box,"处理完当前事件后再结束航行。",16,W.MUTED)
			action(box,"处理当前事件","event")
			W.primary(box.get_child(box.get_child_count()-1))
		"aftermath":
			W.text(box,"节点已完成，可继续使用剩余AP。",17,W.MUTED)
			action(box,"结束白天" if context.mode == "story" and context.voyage >= 5 and context.voyage < 15 else "结束航行","end_voyage")
			W.primary(box.get_child(box.get_child_count()-1))
		"discard": W.text(box,"手牌超限，选择要弃置的物资；达标后自动进入导航。",18)
		"nightHub":
			W.text(box,"今晚的服务、事件或主要行动尚待完成。",18)
			action(box,"处理夜间安排","event")
		"chapterComplete":
			var resolution: Dictionary = context.campaign_summary.resolution
			W.text(box,{"A":"成功封闭","B":"付出代价后处理","C":"紧急撤离","SOLO":"独航出口"}.get(resolution.outcome,"已完成"),23,W.GOLD)
			W.text(box,"本章成果已保存。第二层尚未开放。",18)
			W.text(box,"继续游戏可查看当前木筏、日志与任务。",16,W.MUTED)
			action(box,"返回首页","home")
		"finished":
			W.text(box,{"survived":"灯火未熄","withdrawn":"离开潮眼","dead":"沉入深潮","mad":"迷失潮声","abandon":"返回岸边"}.get(context.result,context.result),24,W.GOLD)
			W.text(box,"完成 %d 个节点" % context.completed,18)
			W.text(box,"本局涌潮点 %d" % context.completed,16,W.MUTED)

func hand(parent: Node) -> void:
	var header := HBoxContainer.new(); parent.add_child(header)
	W.text(header,"手牌 %d/%d   ·   贝币 %d" % [context.capacity,context.player.limit,context.coins],16,W.MUTED)
	W.text(header,"选择查看用途",14,W.MUTED).horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	var pages: int = maxi(1,ceili(float(context.hand.size())/10.0))
	var page_index: int = clampi(int(context.ui_state.get("hand_page",0)),0,pages-1)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation",8); parent.add_child(row)
	var width: float = maxf(105.0,(get_viewport_rect().size.x-56.0-72.0)/10.0)
	for index in range(page_index*10,mini(context.hand.size(),(page_index+1)*10)):
		var card: Dictionary = context.hand[index]
		var tile := ItemCard.new(); row.add_child(tile); tile.size_flags_horizontal = 0
		if context.phase == "discard":
			tile.create(assets,card,"弃置 · "+card.definition.name,func(): send("discard",{"uid":card.uid}),width,202,card.id in ["punch","pollution"])
		elif context.can_base and card.definition.kind == "survival":
			tile.create(assets,card,"使用 · "+card.definition.name,func(): send("play",{"uid":card.uid}),width,202)
		else: tile.create(assets,card,"查看",func(): request("card",card.uid),width,202)
	var footer := HBoxContainer.new(); parent.add_child(footer)
	if pages > 1:
		W.button(footer,"上一组手牌",func(): request("hand_page",str(page_index-1)),page_index == 0).size_flags_horizontal = 0
		W.counter(footer,"%d/%d" % [page_index+1,pages])
		W.button(footer,"下一组手牌",func(): request("hand_page",str(page_index+1)),page_index == pages-1).size_flags_horizontal = 0
	if context.phase == "discard" and context.coins > 0: action(footer,"弃置全部贝币（%d）" % context.coins,"discard",{"uid":"coins"})
