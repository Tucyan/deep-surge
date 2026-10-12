"""Deterministic periodic signals, not game RNG. Regenerates standalone water assets.
Concept references: immaculate-lift-studio/Godot-Ocean-Shader (dual UV flow),
taillight-games/godot-4-pixelated-water-shader (local foam mask).
Original implementation: no third-party shader code or demo artwork copied.
"""
import hashlib,json,pathlib
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
SEED=20261012
rng=np.random.default_rng(SEED)
out=ROOT/'assets/textures';out.mkdir(exist_ok=True)
def periodic_noise(size,cutoff):
    white=rng.normal(size=(size,size))
    f=np.fft.fftfreq(size)*size
    radius=np.hypot(f[:,None],f[None,:])
    filt=np.exp(-(radius/cutoff)**2)*np.minimum(radius,1)
    signal=np.fft.ifft2(np.fft.fft2(white)*filt).real
    return signal/np.std(signal)
size=512
y,x=np.mgrid[:size,:size]*(2*np.pi/size)
height=0.65*np.sin(4*x+3*y)+0.25*np.sin(9*x-4*y)+0.15*np.sin(13*x+7*y)+0.22*periodic_noise(size,24)
height=np.clip((height+2)/4,0,1)
dx=(np.roll(height,-1,1)-np.roll(height,1,1))*12
dy=(np.roll(height,-1,0)-np.roll(height,1,0))*12
normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
rgba=np.concatenate([normal*.5+.5,height[...,None]],axis=-1)
Image.fromarray(np.uint8(np.clip(rgba,0,1)*255),'RGBA').save(out/'ocean-ripples-v1.png')
foam=periodic_noise(256,16)*0.7+periodic_noise(256,45)*0.3
foam=np.clip(.5+foam*.20,0,1)
Image.fromarray(np.uint8(foam*255),'L').convert('RGBA').save(out/'ocean-contact-foam-v1.png')
config={'sea_size':110,'pattern_scale':.12,'flow_a':[.020,.014],'flow_b':[-.016,.023],
        'deep_color':'#092332','ripple_color':'#315c69','normal_strength':1.8,
        'cell_spacing':[2.35,2.1],'foam_width':.38,'foam_color':'#9cb4b3','foam_opacity':.60,'foam_speed':.09,
        'raft_base_height':-.055,'bob_amplitude':.025,'tilt_amplitude':.006,'visual_seed':SEED}
(ROOT/'assets/data/texture-ocean.json').write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
path=ROOT/'assets/manifest.json';manifest=json.loads(path.read_text(encoding='utf-8')); assets=manifest['assets']
entries={
 'texture.ocean.ripples':'assets/textures/ocean-ripples-v1.png',
 'texture.ocean.contact-foam':'assets/textures/ocean-contact-foam-v1.png',
 'data.ocean.texture-config':'assets/data/texture-ocean.json',
 'shader.ocean.texture':'assets/shaders/texture_ocean.gdshader',
 'shader.ocean.contact':'assets/shaders/contact_foam.gdshader',
 'shader.raft.wet-wood':'assets/shaders/wet_wood.gdshader'}
for id,file in entries.items():
    p=ROOT/file
    d={'path':'res://'+file,'version':2 if id=='data.ocean.texture-config' else 1,'source':'tools/generate_texture_ocean.py' if p.suffix in ['.png','.json'] else file,
       'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dependencies':[],
       'license':'project-authored procedural asset; no external imagery','visual_seed':SEED}
    if p.suffix=='.png': d.update(dimensions=list(Image.open(p).size),crop=None)
    assets[id]=d
if assets['scene.voyage'].get('version',0)<=3:
    assets['scene.voyage'].update(version=3,source=['presentation/voyage_world.gd','presentation/texture_ocean.gd'],dependencies=list(entries)+['model.raft'])
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('TEXTURE ASSETS: generated 512px periodic normal/height + 256px foam, seed',SEED)
