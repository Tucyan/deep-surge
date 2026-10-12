extends "res://pages/flow_base.gd"
func build() -> void:
	heading("任务与线索","仅显示已经接触的信息")
	var entries: Array = []
	for quest in context.known_quests:
		entries.append({"name":quest.name,"text":quest.description+"\n状态："+{"active":"进行中","completed":"已完成"}[quest.status]+(" · 处理结果"+quest.resolution if quest.resolution != "" else "")})
	for clue in context.known_clues: entries.append({"name":clue.name,"text":clue.text})
	if entries.is_empty(): W.text(self,"尚未接到任务或记录线索。",22,W.MUTED); return
	var index: int = clampi(int(context.ui_state.list_page),0,entries.size()-1)
	var box := W.panel(self); box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	W.text(box,entries[index].name,28,W.GOLD); W.text(box,entries[index].text,21)
	var nav := HBoxContainer.new(); add_child(nav)
	W.button(nav,"上一条",func(): request("list_page",str(index-1)),index == 0)
	W.counter(nav,"%d / %d" % [index+1,entries.size()])
	W.button(nav,"下一条",func(): request("list_page",str(index+1)),index == entries.size()-1)
