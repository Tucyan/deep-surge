extends "res://pages/flow_base.gd"
func build() -> void:
	W.text(self,"D E E P   S U R G E",18,W.MUTED)
	heading("深 潮", "准备好下一段航程。")
	var row := HBoxContainer.new()
	add_child(row)
	var ocean := W.panel(row,Vector2(570,430))
	W.art(ocean,assets,"scene.ocean",220)
	W.text(ocean,"木筏、物资与灯火",28,W.GOLD)
	W.text(ocean,"挑战模式：在有限航次中求生，处理事件，面对层末遭遇。",21)
	var menu := W.panel(row,Vector2(450,430))
	W.button(menu,"剧情模式",func(): request("setup","story"),context.active)
	W.button(menu,"挑战模式",func(): request("setup","challenge"),context.active)
	action(menu,"继续游戏","resume",{},not context.has_run,"没有有效存档")
	action(menu,"图鉴","panel",{"id":"encyclopedia"})
	action(menu,"局外商店","panel",{"id":"meta_shop"})
	W.button(menu,"退出游戏",func(): request("quit"))
	if context.active:
		W.text(menu,"已有活动航程，请继续；局外购买锁定。",16,W.MUTED)
