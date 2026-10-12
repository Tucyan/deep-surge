extends RefCounted
## Only this adapter knows physical art paths. No texture enters PageSession.
var _definitions: Dictionary = {}
var _cache: Dictionary = {}
var _placeholders: Dictionary = {}
var _models: Dictionary = {}
var _data: Dictionary = {}

func _init() -> void:
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://assets/manifest.json"))
	if data is Dictionary:
		_definitions = data.get("assets", {})

func texture(asset_id: String) -> Texture2D:
	if _cache.has(asset_id):
		return _cache[asset_id]
	var definition: Dictionary = _definitions.get(asset_id, {})
	var path: String = definition.get("path", "")
	if path.begins_with("res://assets/") and ".." not in path and ResourceLoader.exists(path):
		var resource = load(path)
		if resource is Texture2D:
			if definition.get("region") is Array and definition.region.size() == 4:
				var region: Array = definition.region
				var atlas := AtlasTexture.new(); atlas.atlas = resource
				atlas.region = Rect2(region[0],region[1],region[2],region[3]); atlas.filter_clip = true
				resource = atlas
			_cache[asset_id] = resource
			_placeholders[asset_id] = false
			return resource
	var image := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	image.fill(Color.from_string(definition.get("color", "#244b5b"), Color.DARK_SLATE_GRAY))
	var result := ImageTexture.create_from_image(image)
	_cache[asset_id] = result
	_placeholders[asset_id] = true
	return result

func label(asset_id: String) -> String:
	return _definitions.get(asset_id, {}).get("label", asset_id)

func show_label(asset_id: String) -> bool:
	texture(asset_id)
	return _definitions.get(asset_id, {}).get("show_label", _placeholders.get(asset_id, true))

func model(asset_id: String) -> PackedScene:
	if _models.has(asset_id): return _models[asset_id]
	var path: String = _definitions.get(asset_id,{}).get("path","")
	if path.begins_with("res://assets/") and ".." not in path and ResourceLoader.exists(path):
		var resource = load(path)
		if resource is PackedScene:
			_models[asset_id] = resource
			return resource
	return null

func data(asset_id: String) -> Dictionary:
	if _data.has(asset_id): return _data[asset_id].duplicate(true)
	var path: String = _definitions.get(asset_id,{}).get("path","")
	if path.begins_with("res://assets/data/") and ".." not in path:
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
		if parsed is Dictionary: _data[asset_id] = parsed; return parsed.duplicate(true)
	return {}

func bytes(asset_id: String) -> PackedByteArray:
	var path: String = _definitions.get(asset_id,{}).get("path","")
	if path.begins_with("res://assets/data/") and ".." not in path: return FileAccess.get_file_as_bytes(path)
	return PackedByteArray()
