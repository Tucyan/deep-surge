import bpy, json, pathlib
OUT = pathlib.Path(__file__).resolve().parents[1] / "asset-sources/user-pack-20261012"
def value(v):
    if isinstance(v,(str,int,float,bool)): return v
    try: return list(v)
    except TypeError: return str(v)
def tree_info(tree):
    result = {"name":tree.name,"nodes":[],"links":[]}
    for node in tree.nodes:
        n = {"name":node.name,"type":node.bl_idname,"operation":getattr(node,"operation",None),
             "attribute":getattr(node,"attribute_name",None),"inputs":[{"name":s.name,"value":value(s.default_value)} for s in node.inputs if hasattr(s,'default_value')]}
        if hasattr(node,'color_ramp'): n['ramp'] = [{'position':e.position,'color':list(e.color)} for e in node.color_ramp.elements]; n['interpolation'] = node.color_ramp.interpolation
        result['nodes'].append(n)
    result['links'] = [(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links]
    return result
obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
report = {"materials":[tree_info(m.node_tree) for m in obj.data.materials if m and m.node_tree],
          "groups":[tree_info(m.node_group) for m in obj.modifiers if m.type=='NODES' and m.node_group],
          "drivers":[],"evaluated":{}}
if obj.animation_data:
    for driver in obj.animation_data.drivers:
        report['drivers'].append({'data_path':driver.data_path,'expression':driver.driver.expression})
obj_eval = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh = obj_eval.to_mesh()
report['evaluated'] = {'vertices':len(mesh.vertices),'polygons':len(mesh.polygons),'attributes':[(a.name,a.data_type,a.domain) for a in mesh.attributes]}
obj_eval.to_mesh_clear()
(OUT/'ocean-details.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
# Evidence from source scene, with no permanent mutation or autoexec.
scene = bpy.context.scene
scene.render.resolution_x = 900; scene.render.resolution_y = 600; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT/'ocean-source-preview.png')
scene.render.engine = 'BLENDER_EEVEE'
bpy.ops.render.render(write_still=True)
