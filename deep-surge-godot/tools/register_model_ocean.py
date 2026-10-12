"""Register source-derived runtime LOD, model shading and shared contact shaders."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
path=root/'assets/manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'));assets=manifest['assets']
for id,file in {'data.ocean.model-config':'assets/data/model-ocean.json','shader.ocean.model':'assets/shaders/model_ocean.gdshader','shader.ocean.stylized-far':'assets/shaders/stylized_far_ocean.gdshader',
                'shader.ocean.contact':'assets/shaders/contact_foam.gdshader','shader.raft.wet-wood':'assets/shaders/wet_wood.gdshader'}.items():
    assets[id]={'path':'res://'+file,'version':3 if id in ['data.ocean.model-config','shader.ocean.model'] else 2,'source':file,
                'sha256':hashlib.sha256((root/file).read_bytes()).hexdigest(),'dependencies':[],
                'license':'project-authored shader/config; source Ocean stays user-supplied'}
assets['scene.voyage'].update(version=6,source=['presentation/voyage_world.gd','presentation/model_ocean.gd','presentation/supplied_ocean.gd','presentation/texture_ocean.gd'],
                            dependencies=['model.raft','model.ocean','data.ocean.config','data.ocean.surface','data.ocean.model-config','shader.ocean.model','texture.ocean.foam',
                                          'data.ocean.texture-config','texture.ocean.contact-foam','shader.ocean.contact','shader.raft.wet-wood'])
assets['geometry.ocean.lod']={'version':1,'source':'asset-sources/wave-style-experiment/model_ocean.gd','dependencies':['model.ocean','data.ocean.surface'],
                            'runtime':None,'status':'archived; original GLB restored'}
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('MODEL ASSETS: original GLB/palette/foam restored, contact repair retained')
