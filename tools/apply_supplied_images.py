"""Bind verified original PNGs by stable AssetId, with hashes and no pixel edits."""
import pathlib, json, shutil, hashlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'asset-sources/user-pack-20261012'
inventory = json.loads((SOURCE/'image-inventory.json').read_text(encoding='utf-8'))
mapping = {1:['card.lamp','card.calm'],2:['card.spear','card.spearRack'],3:['card.plastic'],
           4:['card.food'],5:['card.medkit'],6:['card.cloth'],7:['card.punch'],8:['card.planter'],
           9:['card.wood'],10:['card.repair','card.dismantle','tool.handtool'],11:['card.filter'],
           12:['card.crossbow','card.arrow'],13:['card.water'],14:['card.iron'],15:['card.rope'],16:['ui.unavailable']}
dest = ROOT/'assets/images/supplied-20261012'
dest.mkdir(parents=True,exist_ok=True)
manifest_path = ROOT/'assets/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
bindings = []
for row in inventory:
    index = row['index']
    target = dest/f'asset-{index:02d}.png'
    shutil.copyfile(ROOT/row['file'],target)
    assert hashlib.sha256(target.read_bytes()).hexdigest() == row['sha256']
    runtime = 'res://'+str(target.relative_to(ROOT)).replace('\\','/')
    for asset_id in mapping[index]:
        definition = manifest['assets'].setdefault(asset_id,{'label':'禁止使用工具' if index==16 else '手工工具'})
        definition.update(path=runtime,version=2,source='user-supplied/card(5).zip/'+row['archive_name'],
                          sha256=row['sha256'],dimensions=row['size'],crop=None,show_label=False,
                          dependencies=[],license='user-supplied; no additional license assertion')
    bindings.append({**row,'asset_ids':mapping[index],'runtime_path':runtime,'status':'integrated'})
(SOURCE/'image-bindings.json').write_text(json.dumps(bindings,ensure_ascii=False,indent=2),encoding='utf-8')
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Applied 16 original PNGs / 21 stable AssetIds (19 card IDs, tool, unavailable icon)')
