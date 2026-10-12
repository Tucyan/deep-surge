extends "res://pages/flow_base.gd"
func build() -> void:
	if not context.get("scene",{}).is_empty():
		campaign_story()
		return
	heading(context.node.name,"当前事件")
	var row := HBoxContainer.new(); row.size_flags_vertical = Control.SIZE_EXPAND_FILL; add_child(row)
	var narrative := W.panel(row,Vector2(350,0)); narrative.get_parent().size_flags_horizontal = 0
	W.art(narrative,assets,"node."+context.node.id,105)
	W.text(narrative,context.result_text if context.story_step == "result" else context.node.description,20)
	var choices := W.panel(row)
	match context.story_step:
		"intro":
			W.text(choices,"海上遭遇",27,W.GOLD)
			action(choices,"继续","advance")
			action(choices,"跳过文字","skip")
		"choice":
			W.text(choices,"作出选择",27,W.GOLD)
			if context.node.has("monster"):
				var enemy: Dictionary = catalog.entry("enemies",context.node.monster)
				W.text(choices,"%s · 生命%d" % [enemy.name,enemy.hp],22)
				W.text(choices,enemy.intent,18,W.MUTED)
				action(choices,"迎战","fight")
				action(choices,"离开遭遇","leave_encounter")
			if context.node.kind == "shop": action(choices,"进入商店","shop_enter")
			choices.add_theme_constant_override("separation",6)
			for option in context.node.get("options",[]):
				var reason: String = option.get("disabled_reason","")
				action(choices,option.name,"option",{"id":option.id},not reason.is_empty(),reason if reason != "" else option.description)
				var costs := PackedStringArray()
				if option.get("cost",0) > 0: costs.append("%d AP" % option.cost)
				for id in option.get("cardCosts",{}): costs.append(catalog.entry("cards",id).name+"×%d" % option.cardCosts[id])
				for stat in option.get("statCosts",{}): costs.append({"hp":"生命","sanity":"SAN"}.get(stat,stat)+"%d" % option.statCosts[stat])
				if not costs.is_empty(): W.text(choices," · ".join(costs),13,W.MUTED)
		"result":
			W.text(choices,"事件结果",27,W.GOLD)
			action(choices,"结束节点","advance")

func campaign_story() -> void:
	var scene: Dictionary = context.scene
	heading(scene.name,"测试剧情 · 第一层")
	var row := HBoxContainer.new(); row.size_flags_vertical = Control.SIZE_EXPAND_FILL; add_child(row)
	var narrative := W.panel(row); narrative.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	W.art(narrative,assets,scene.art,90)
	W.text(narrative,context.result_text if context.story_step == "result" else scene.text,21)
	var choices := W.panel(row,Vector2(370,0)); choices.get_parent().size_flags_horizontal = 0
	match context.story_step:
		"intro":
			W.text(choices,"%d / %d" % [scene.index+1,scene.line_count],18,W.MUTED)
			action(choices,"继续","advance")
			action(choices,"跳过文字","skip")
		"choice":
			W.text(choices,"作出选择",25,W.GOLD)
			if scene.combat:
				W.text(choices,"实际赢下教学战斗后继续。",18)
				action(choices,"迎战","fight")
			for option in scene.choices:
				var reason: String = option.disabled_reason
				action(choices,option.name,"option",{"id":option.id},reason != "",reason if reason != "" else option.description)
				W.text(choices,reason if reason != "" else option.description,15,W.MUTED)
		"result":
			W.text(choices,"已记录结果",25,W.GOLD)
			action(choices,"继续剧情" if scene.id == "ST.L1.F15" else "完成这段剧情","advance")
