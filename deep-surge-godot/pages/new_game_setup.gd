extends "res://pages/flow_base.gd"
func build() -> void:
	var center := CenterContainer.new()
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(center)
	var box := W.panel(center,Vector2(640,390))
	W.text(box,"新局准备",34,W.GOLD)
	W.text(box,"剧情模式 · 第一层15站（测试剧本）" if context.setup_mode == "story" else "挑战模式 · 选择出身与航程种子",18,W.MUTED)
	W.text(box,"出身",18)
	var choices := OptionButton.new()
	var ids: Array = context.origins.keys()
	for id in ids: choices.add_item(context.origins[id].name + " · " + context.origins[id].description)
	box.add_child(choices)
	W.text(box,"航程种子",18)
	var seed_input := LineEdit.new()
	seed_input.text = "22"; seed_input.placeholder_text = "0～4294967295"
	box.add_child(seed_input)
	var start := W.button(box,"开始航程",func(): send("new",{"mode":context.setup_mode,"origin":ids[choices.selected],"seed":int(seed_input.text) if seed_input.text.is_valid_int() else -1}))
	W.primary(start)
	W.text(box,"教学、夜间调查和最终危机已开放；第二层尚未开放。" if context.setup_mode == "story" else "起手六张基础资源，首次无涌泉。",16,W.MUTED)
	W.button(box,"返回模式选择",func(): request("setup",""))
