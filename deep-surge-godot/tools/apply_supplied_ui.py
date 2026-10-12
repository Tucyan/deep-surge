"""Keep original UI PNG bytes. Sprite rectangles are declarative atlas regions."""
import pathlib,json,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]; SOURCE=ROOT/'asset-sources/user-pack-20261012'
inventory=json.loads((SOURCE/'ui-inventory.json').read_text(encoding='utf-8'))
out=ROOT/'assets/images/supplied-ui-20261012';out.mkdir(parents=True,exist_ok=True)
path=ROOT/'assets/manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'))
mapping={1:[('ui.card.type.combat',None)],2:[('ui.card.type.survival',None)],3:[('ui.card.type.material',None)],
         4:[('ui.card.front',[90,28,654,1004]),('ui.card.back',[750,28,610,1000])]}
bindings=[]
for row in inventory:
    target=out/f'ui-{row["index"]:02d}.png';shutil.copyfile(ROOT/row['file'],target)
    for id,region in mapping[row['index']]:
        manifest['assets'][id]={'path':'res://'+str(target.relative_to(ROOT)).replace('\\','/'),'version':1,
                               'source':'user-supplied/card-ui-original.zip/'+row['archive_name'],
                               'sha256':row['sha256'],'dimensions':row['size'],'region':region,
                               'show_label':False,'dependencies':[]}
        bindings.append({'asset_id':id,'source':row['archive_name'],'region':region,'sha256':row['sha256']})
manifest['assets']['ui.voyage-hud']['dependencies'] += ['ui.card.front','ui.card.type.*','card.*']
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(SOURCE/'ui-bindings.json').write_text(json.dumps(bindings,ensure_ascii=False,indent=2),encoding='utf-8')
print('Applied card front/back and combat/survival/material emblems; original bytes unchanged')
