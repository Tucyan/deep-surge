"""Read-only inspection in an isolated Blender background process (autoexec off)."""
import bpy, json, pathlib
from mathutils import Vector

OUT = pathlib.Path(__file__).resolve().parents[1] / "asset-sources/user-pack-20261012"
OUT.mkdir(parents=True, exist_ok=True)
report = {"blender": bpy.app.version_string, "source": bpy.data.filepath,
          "scenes": [], "images": [], "materials": [], "texts": []}
for scene in bpy.data.scenes:
    record = {"name": scene.name, "engine": scene.render.engine,
              "frame_range": [scene.frame_start, scene.frame_end], "objects": []}
    for obj in scene.objects:
        bounds = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
        info = {"name": obj.name, "type": obj.type, "location": list(obj.location),
                "scale": list(obj.scale), "rotation": list(obj.rotation_euler),
                "dimensions": list(obj.dimensions), "hide_render": obj.hide_render,
                "modifiers": [], "materials": [m.name for m in obj.data.materials if m] if obj.type == 'MESH' else []}
        if obj.type == 'MESH':
            info.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                        uv_layers=[uv.name for uv in obj.data.uv_layers],
                        bounds_min=[min(v[i] for v in bounds) for i in range(3)],
                        bounds_max=[max(v[i] for v in bounds) for i in range(3)])
        for mod in obj.modifiers:
            info["modifiers"].append({"name": mod.name, "type": mod.type,
                "properties": {p.identifier: str(getattr(mod, p.identifier)) for p in mod.bl_rna.properties
                               if p.type in {'INT','FLOAT','BOOLEAN','ENUM'} and p.identifier != 'rna_type'}})
        if obj.animation_data:
            info["animation"] = {"action": obj.animation_data.action.name if obj.animation_data.action else None,
                                  "drivers": len(obj.animation_data.drivers)}
        record["objects"].append(info)
    report["scenes"].append(record)
for mat in bpy.data.materials:
    nodes = []
    if mat.use_nodes and mat.node_tree:
        for node in mat.node_tree.nodes:
            nodes.append({"name":node.name,"type":node.bl_idname,
                          "inputs":{s.name: str(s.default_value) for s in node.inputs if hasattr(s,'default_value')}})
    report["materials"].append({"name":mat.name,"nodes":nodes})
for img in bpy.data.images:
    report["images"].append({"name":img.name,"path":img.filepath,"size":list(img.size),"packed":bool(img.packed_file)})
for text in bpy.data.texts:
    report["texts"].append({"name":text.name,"content":text.as_string()})
(OUT / "blend-inspection.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print("INSPECT", json.dumps({"objects": [(s['name'], [(o['name'], o['type']) for o in s['objects']]) for s in report['scenes']],
                              "images":len(report['images']),"materials":len(report['materials']),"texts":[t['name'] for t in report['texts']]},ensure_ascii=False))
