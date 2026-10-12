"""Inventory original PNG bytes and produce a review sheet; never execute ZIP content."""
import zipfile, json, hashlib, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "asset-sources/user-pack-20261012"
RAW = SOURCE / "images"
RAW.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
sheet = Image.new("RGB", (1200, 1200), "#23333c")
draw = ImageDraw.Draw(sheet)
rows = []
with zipfile.ZipFile(SOURCE / "card-original.zip", metadata_encoding="gbk") as archive:
    for i, entry in enumerate([e for e in archive.infolist() if e.filename.lower().endswith('.png')], 1):
        payload = archive.read(entry)
        dest = RAW / f"source-{i:02d}.png"
        dest.write_bytes(payload)
        image = Image.open(dest).convert('RGBA')
        alpha = image.getchannel('A')
        row = {"index":i,"archive_name":entry.filename,"file":str(dest.relative_to(ROOT)).replace('\\','/'),
               "size":list(image.size),"alpha_extrema":list(alpha.getextrema()),"sha256":hashlib.sha256(payload).hexdigest()}
        rows.append(row)
        x, y = ((i-1) % 4)*300, ((i-1)//4)*300
        tile = Image.new('RGBA', (280,250), '#52636b')
        image.thumbnail((270,240))
        tile.alpha_composite(image, ((280-image.width)//2, (250-image.height)//2))
        sheet.paste(tile.convert('RGB'), (x+10,y+10))
        draw.text((x+12,y+264), f"{i:02d}  {entry.filename.split('/')[-1][:14]}",font=font,fill='#ece2ca')
(SOURCE / 'image-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
sheet.save(SOURCE / 'images-contact-sheet.jpg',quality=92)
print(f"PNG inventory: {len(rows)} originals; contact sheet ready")
