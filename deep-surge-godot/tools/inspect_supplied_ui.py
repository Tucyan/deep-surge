import zipfile,json,pathlib,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[1]; SOURCE=ROOT/'asset-sources/user-pack-20261012'
folder=SOURCE/'card-ui'; folder.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGB',(1200,600),'#263c46'); draw=ImageDraw.Draw(sheet); records=[]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
with zipfile.ZipFile(SOURCE/'card-ui-original.zip',metadata_encoding='gbk') as z:
    for i,e in enumerate([e for e in z.infolist() if e.filename.lower().endswith('.png')],1):
        p=folder/f'ui-source-{i:02d}.png'; payload=z.read(e); p.write_bytes(payload)
        image=Image.open(p).convert('RGBA'); records.append({'index':i,'archive_name':e.filename,'file':str(p.relative_to(ROOT)).replace('\\','/'),'size':list(image.size),'alpha_extrema':list(image.getchannel('A').getextrema()),'sha256':hashlib.sha256(payload).hexdigest()})
        image.thumbnail((280,550)); base=Image.new('RGBA',(290,555),'#63737a'); base.alpha_composite(image,((290-image.width)//2,(555-image.height)//2));sheet.paste(base.convert('RGB'),((i-1)*300+5,5));draw.text(((i-1)*300+8,566),f'{i:02d}  {e.filename.split("/")[-1][:12]}',font=font,fill='#eadbb3')
(SOURCE/'ui-inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8');sheet.save(SOURCE/'ui-contact-sheet.jpg',quality=93)
print(json.dumps(records,ensure_ascii=False,indent=2))
