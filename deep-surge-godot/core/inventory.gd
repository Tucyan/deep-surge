extends RefCounted
const RESOURCES := ["wood", "iron", "plastic", "rope", "cloth"]

static func count(state: Dictionary, id: String) -> int:
	if id == "coin":
		return state.coins
	var total := 0
	for card in state.hand:
		if card.id == id and not card.temporary:
			total += 1
	return total

static func give(state: Dictionary, id: String, amount: int = 1, temporary: bool = false, source: String = "reward") -> void:
	if id == "coin":
		state.coins += amount
		return
	for i in range(amount):
		state.hand.append({"uid": "card-%d" % state.next_id, "id":id, "temporary":temporary, "source":source})
		state.next_id += 1

static func consume(state: Dictionary, id: String, amount: int) -> bool:
	if count(state, id) < amount:
		return false
	if id == "coin":
		state.coins -= amount
		return true
	for i in range(amount):
		for index in range(state.hand.size()):
			if state.hand[index].id == id and not state.hand[index].temporary:
				state.hand.remove_at(index)
				break
	return true

static func capacity(state: Dictionary) -> int:
	var ordinary := 0
	var arrow_groups := {}
	for card in state.hand:
		if card.id == "arrow" and int(card.get("stack_limit",1)) > 1:
			var limit: int = int(card.stack_limit)
			arrow_groups[limit] = int(arrow_groups.get(limit,0)) + 1
		else: ordinary += 1
	for limit in arrow_groups: ordinary += ceili(float(arrow_groups[limit])/float(limit))
	return ordinary + (1 if state.coins > 0 else 0)

static func find(state: Dictionary, uid: String) -> Dictionary:
	for card in state.hand:
		if card.uid == uid:
			return card
	return {}

static func remove(state: Dictionary, uid: String) -> void:
	for i in range(state.hand.size()):
		if state.hand[i].uid == uid:
			state.hand.remove_at(i)
			return
