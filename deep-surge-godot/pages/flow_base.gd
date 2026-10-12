extends "res://pages/base_page.gd"
signal command_requested(command: String, args: Dictionary)
func send(command: String, args: Dictionary = {}) -> void:
	args["revision"] = context.revision
	command_requested.emit(command,args)
func amount(id: String) -> int:
	if id == "coin": return context.get("coins",0)
	var total := 0
	for card in context.get("hand",[]):
		if card.id == id and not card.temporary: total += 1
	return total
func action(parent: Node, title: String, command: String, args: Dictionary = {}, disabled: bool = false, reason: String = "") -> void:
	var button := W.button(parent,title,func(): send(command,args.duplicate(true)),disabled,reason)
	if disabled and command in ["craft","install","upgrade","expand","heal","repair_cell","action_card"]:
		button.icon = assets.texture("ui.unavailable")
		button.expand_icon = true
		button.add_theme_constant_override("icon_max_width",18)
func unavailable(parent: Node, title: String, reason: String) -> void:
	W.button(parent,title,func(): pass,true,reason)
	W.text(parent,reason,15,W.MUTED)
