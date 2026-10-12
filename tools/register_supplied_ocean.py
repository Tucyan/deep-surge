import pathlib,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
path=ROOT/'assets/manifest.json'; manifest=json.loads(path.read_text(encoding='utf-8'))
defs={
 'model.ocean':('assets/models/supplied-ocean.glb','tools/export_supplied_ocean.py',['data.ocean.config','texture.ocean.foam','shader.ocean.supplied']),
 'data.ocean.config':('assets/data/supplied-ocean.json','tools/export_supplied_ocean.py',['data.ocean.surface']),
 'data.ocean.surface':('assets/data/supplied-ocean-surface.bin','tools/export_supplied_ocean.py',[]),
 'texture.ocean.foam':('assets/textures/supplied-ocean-foam.png','tools/export_supplied_ocean.py',[]),
 'shader.ocean.supplied':('assets/shaders/supplied_ocean.gdshader','source ShaderToRGB/foam ramp adapted to Godot',['texture.ocean.foam','data.ocean.config'])}
for id,(file,source,deps) in defs.items():
    p=ROOT/file; assert p.is_file()
    manifest['assets'][id]={'path':'res://'+file,'version':1,'source':source,'source_asset':'asset-sources/user-pack-20261012/ocean-original.blend',
                            'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'dependencies':deps}
manifest['assets']['texture.ocean.foam'].update(dimensions=[404,404],color_space='data',crop=None,show_label=False)
manifest['assets']['scene.voyage'].update(version=2,dependencies=['model.raft','model.ocean','data.ocean.surface','shader.ocean.supplied'],source='presentation/voyage_world.gd + presentation/supplied_ocean.gd')
manifest['assets']['ui.voyage-hud']['version']=3
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Ocean runtime bundle registered')
