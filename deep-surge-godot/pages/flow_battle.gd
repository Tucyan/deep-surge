extends "res://pages/flow_base.gd"
const ItemCard = preload("res://presentation/item_card.gd")
func build() -> void:
	var enemy: Dictionary = catalog.entry("enemies",context.battle.id)
	heading("战斗 · 第%d回合" % context.battle.turn,"生命 %d/%d · 战斗AP %d/%d" % [context.player.hp,context.player.hp_max,context.battle.ap,context.player.battle_ap])
	var row := HBoxContainer.new(); row.size_flags_vertical = Control.SIZE_EXPAND_FILL; add_child(row)
	var target := W.panel(row,Vector2(310,0)); target.get_parent().size_flags_horizontal = 0
	W.art(target,assets,"enemy."+context.battle.id,125)
	W.text(target,enemy.name,26,W.GOLD)
	W.text(target,"生命 %d/%d" % [context.battle.hp,enemy.hp],23)
	W.text(target,enemy.intent,18,W.MUTED)
	action(target,"结束战斗回合","battle_end")
	if context.get("scene",{}).get("combat",false): W.text(target,"教学战斗需要胜利后继续。",16,W.MUTED)
	else: action(target,"撤退","retreat",{},context.battle.turn < 2,"第二回合起可撤退")
	var hand := VBoxContainer.new(); hand.size_flags_horizontal = Control.SIZE_EXPAND_FILL; row.add_child(hand)
	var cards: Array = context.hand.filter(func(card): return card.definition.kind in ["combat","survival","negative"])
	var pages: int = maxi(1,ceili(float(cards.size())/6.0))
	var page_index: int = clampi(int(context.ui_state.get("list_page",0)),0,pages-1)
	var items := W.grid(hand,3)
	for card in cards.slice(page_index*6,mini(cards.size(),page_index*6+6)):
		var tile := ItemCard.new(); items.add_child(tile)
		tile.create(assets,card,"使用 · "+card.definition.name,func(): send("play",{"uid":card.uid}),112,170,card.definition.cost > context.battle.ap)
	if pages > 1:
		var pager := HBoxContainer.new(); hand.add_child(pager)
		W.button(pager,"上一页",func(): request("list_page",str(page_index-1)),page_index == 0)
		W.counter(pager,"%d/%d" % [page_index+1,pages])
		W.button(pager,"下一页",func(): request("list_page",str(page_index+1)),page_index == pages-1)

func compact_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new(); style.bg_color = Color("142d38"); style.border_color = W.GOLD; style.set_border_width_all(1)
	style.content_margin_left = 10; style.content_margin_right = 10; style.content_margin_top = 10; style.content_margin_bottom = 10
	return style
