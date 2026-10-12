"""Bake reviewed Ocean modifier data into portable morphs + aligned foam/height data.
Run only in an isolated, autoexec-disabled Blender process with the archived source.
Original objects remain in the editable derivative; only the new baked object exports.
"""
import bpy, pathlib, json, math, hashlib
import numpy as np
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT/'asset-sources/user-pack-20261012'
MODELS = ROOT/'assets/models'; DATA = ROOT/'assets/data'; TEXTURES = ROOT/'assets/textures'
for folder in [MODELS,DATA,TEXTURES]: folder.mkdir(parents=True,exist_ok=True)
obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m.type=='OCEAN' for m in o.modifiers))
obj.animation_data_clear()  # copied file only: do not execute embedded driver expressions
ocean = next(m for m in obj.modifiers if m.type=='OCEAN')
ocean.resolution = 10; ocean.viewport_resolution = 10
for mod in obj.modifiers:
    if mod.type == 'NODES': mod.show_viewport = False; mod.show_render = False
frames = [24+15*i for i in range(16)]
positions = []; foam_images = []; counts = []; baked = None; side = 0; uv_bounds = None
for index, frame in enumerate(frames):
    bpy.context.scene.frame_set(frame); ocean.time = frame/20.0
    bpy.context.view_layer.update()
    depgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depgraph),preserve_all_data_layers=True,depsgraph=depgraph)
    xyz = np.array([list(v.co) for v in mesh.vertices],dtype=np.float32)
    side = round(math.sqrt(len(xyz))); assert side*side == len(xyz)
    assert not positions or xyz.shape == positions[0].shape
    positions.append(xyz)
    attribute = mesh.attributes.get('UVMap')
    coords = np.array([list(attribute.data[loop.index].vector)[:2] if attribute else
                       [loop.vertex_index%side/(side-1),loop.vertex_index//side/(side-1)]
                       for loop in mesh.loops],dtype=np.float32)
    # Blender 5 may leave active UV unset on evaluated modifier meshes. Use the
    # named layer explicitly rather than depending on the active-layer getter.
    layer = mesh.uv_layers.new(name='OceanUV')
    layer.data.foreach_set('uv',coords.ravel())
    layer.active_render = True; mesh.uv_layers.active_index = len(mesh.uv_layers)-1
    mesh.update()
    foam = mesh.color_attributes.get('foam')
    values = np.zeros(len(xyz),dtype=np.float32); weights = np.zeros(len(xyz),dtype=np.float32)
    uv = np.zeros((len(xyz),2),dtype=np.float32)
    for loop in mesh.loops:
        vid = loop.vertex_index
        values[vid] += foam.data[loop.index].color[0] if foam else 0
        weights[vid] += 1
        uv[vid] = coords[loop.index]
    values /= np.maximum(1,weights)
    pixels = np.zeros((side,side,4),dtype=np.float32)
    for vid, coords in enumerate(uv):
        col = max(0,min(side-1,round(float(coords[0])*(side-1))))
        row = max(0,min(side-1,round((1-float(coords[1]))*(side-1))))
        pixels[row,col] = (values[vid],values[vid],values[vid],1)
    foam_images.append(pixels)
    counts.append({'source_frame':frame,'time':frame/20.0,'vertices':len(xyz),'polygons':len(mesh.polygons),
                   'height_min':float(xyz[:,2].min()),'height_max':float(xyz[:,2].max()),
                   'foam_min':float(values.min()),'foam_max':float(values.max())})
    if index == 0:
        baked = mesh
        uv_bounds = [uv.min(axis=0).tolist(),uv.max(axis=0).tolist()]
    else: bpy.data.meshes.remove(mesh)
    print('BAKE',index,frame,len(xyz),flush=True)

collection = bpy.data.collections.new('COL-GodotOceanExport'); bpy.context.scene.collection.children.link(collection)
target = bpy.data.objects.new('GEO-SuppliedOcean',baked); collection.objects.link(target)
target.shape_key_add(name='Basis')
for index in range(1,len(positions)):
    key = target.shape_key_add(name=f'OceanPose{index:02d}')
    key.data.foreach_set('co',positions[index].ravel()); key.value = 0
for poly in baked.polygons: poly.use_smooth = True
for name in ['foam','Spray']:
    if baked.attributes.get(name): baked.attributes.remove(baked.attributes[name])
material = bpy.data.materials.new('MAT-OceanPortableBlue'); material.use_nodes = True
material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (0.0115535,0.0358306,0.2434685,1)
material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = 0.7
baked.materials.clear(); baked.materials.append(material)
target['source_asset'] = 'user-supplied ocean-original.blend'
target['runtime_material'] = 'shader.ocean.supplied'
target['foam_data'] = 'texture.ocean.foam'

# Data textures are written without requiring external Python packages in Blender.
atlas = np.zeros((side*4,side*4,4),dtype=np.float32)
for index, image in enumerate(foam_images):
    col,row = index%4,index//4
    atlas[row*side:(row+1)*side,col*side:(col+1)*side,:] = image
image = bpy.data.images.new('TEX-OceanFoamAtlas',width=side*4,height=side*4,alpha=True)
image.colorspace_settings.name = 'Non-Color'
# Blender image buffers start bottom-left; PNG/Godot textures start top-left.
image.pixels.foreach_set(np.flipud(atlas).ravel())
image.filepath_raw = str(TEXTURES/'supplied-ocean-foam.png'); image.file_format='PNG'; image.save()

godot_positions = np.stack(positions)[:,:,[0,2,1]].copy()
godot_positions[:,:,2] *= -1
(DATA/'supplied-ocean-surface.bin').write_bytes(godot_positions.astype('<f4').tobytes())
metadata = {'version':'supplied-ocean-bake-v1','frames':len(frames),'grid_side':side,
            'frame_seconds':15/bpy.context.scene.render.fps,'tile_size':float(ocean.spatial_size*ocean.size),
            'uv_bounds':uv_bounds,'atlas_grid':4,'source_resolution':16,'runtime_resolution':10,
            'source_driver':'frame/20 (manually evaluated; source scripts not run)',
            'poses':counts,'blend_shape_names':[f'OceanPose{i:02d}' for i in range(1,len(frames))],
            'frame0_samples':godot_positions[0,[0,1,side,side*side-1],:].tolist(),
            'palette_linear':[[0.0115535129,0.0358306170,0.2434685230],
                              [0.0197290517,0.0556245632,0.2743761241],
                              [0.0267577171,0.0569837242,0.3052954674],
                              [0.0849153697,0.4026930928,1.0]],
            'foam_threshold':0.3363636434,
            'adaptation':'geometry/morphs sampled from Ocean; foam in aligned data atlas; ShaderToRGB adapted in Godot; no GN spray instances'}
(DATA/'supplied-ocean.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
obj.hide_render = True; obj.hide_set(True)
bpy.ops.object.select_all(action='DESELECT'); target.select_set(True); bpy.context.view_layer.objects.active = target
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'ocean_godot_v001.blend'))
path = MODELS/'supplied-ocean.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
                         export_apply=False,export_animations=False,export_morph=True,export_morph_normal=True,
                         export_yup=True,export_extras=True,export_materials='EXPORT')
assert path.stat().st_size < 15*1024*1024, 'GLB exceeds portable budget'
metadata['glb_bytes'] = path.stat().st_size
metadata['glb_sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
(SOURCE/'ocean-export-report.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
print('EXPORTED',metadata['glb_bytes'],metadata['glb_sha256'],flush=True)
