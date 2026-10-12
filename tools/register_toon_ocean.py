"""Register the stylized night ocean (toon) shader/config and the voyage grade."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
path=root/'assets/manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'));assets=manifest['assets']
for id,file in {'data.ocean.toon-config':'assets/data/toon-ocean.json','shader.ocean.toon':'assets/shaders/toon_ocean.gdshader',
                'shader.voyage.night-grade':'assets/shaders/night_grade.gdshader','shader.voyage.night-mist':'assets/shaders/night_mist.gdshader'}.items():
    assets[id]={'path':'res://'+file,'version':2 if id=='data.ocean.toon-config' else 1,'source':file,'sha256':hashlib.sha256((root/file).read_bytes()).hexdigest(),
                'dependencies':[],'license':'project-authored procedural shader/config; no external imagery'}
assets['shader.ocean.toon']['dependencies']=['data.ocean.toon-config']
assets['shader.voyage.night-mist']['dependencies']=['data.ocean.toon-config']
assets['shader.voyage.night-mist']['role']='three low mist planes; clear_bounds follows occupied raft, clear_fade follows view scale'
assets['shader.ocean.toon']['role']='procedural Gerstner waves mirrored by presentation/toon_ocean.gd; visual time only'
assets['scene.voyage'].update(version=8,source=['presentation/voyage_world.gd','presentation/toon_ocean.gd','presentation/model_ocean.gd',
                                                 'presentation/supplied_ocean.gd','presentation/texture_ocean.gd'],
                            dependencies=['model.raft','data.ocean.toon-config','shader.ocean.toon','shader.voyage.night-grade','shader.voyage.night-mist',
                                          'data.ocean.texture-config','texture.ocean.contact-foam','shader.ocean.contact','shader.raft.wet-wood',
                                          'model.ocean','data.ocean.config','data.ocean.surface','data.ocean.model-config','shader.ocean.model','texture.ocean.foam'],
                            role='read-only cells projection; visual time only; toon ocean default, original GLB ocean is fallback')
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('TOON OCEAN ASSETS: registered')
