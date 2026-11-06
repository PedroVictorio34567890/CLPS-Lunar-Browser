"""Crop official LOLA LDEM_80S_80M, preserving the native 80 m samples.
Run from repo root: python scripts/prepare-regional-terrain.py
Inputs are downloaded into ignored qa/terrain-source; numpy in qa/terrain-tools.
"""
import sys, re, json, hashlib
from pathlib import Path
sys.path.insert(0, str(Path('qa/terrain-tools').resolve()))
import numpy as np

root = Path('qa/terrain-source')
source, label = root/'LDEM_80S_80M.IMG', root/'LDEM_80S_80M.LBL'
text = label.read_text()
def value(key):
    return re.search(r'^\s*'+key+r'\s*=\s*([^\r\n]+)', text, re.M).group(1).strip()
for key, expected in {'LINES':'7600', 'LINE_SAMPLES':'7600', 'SAMPLE_TYPE':'LSB_INTEGER',
    'SAMPLE_BITS':'16', 'SCALING_FACTOR':'0.5', 'OFFSET':'1737400.',
    'MAP_SCALE':'80 <m/pix>', 'CENTER_LATITUDE':'-90 <deg>', 'CENTER_LONGITUDE':'0 <deg>',
    'LINE_PROJECTION_OFFSET':'3799.5 <pix>', 'SAMPLE_PROJECTION_OFFSET':'3799.5 <pix>',
    'COORDINATE_SYSTEM_NAME':'"MEAN EARTH/POLAR AXIS OF DE421"'}.items():
    assert value(key) == expected, (key, value(key))
assert source.stat().st_size == 7600*7600*2
original = np.memmap(source, dtype='<i2', mode='r', shape=(7600,7600))
# Pixel-registered PDS coordinates: x=(sample-offset-1)*80 for 1-based sample.
# Crop [-120 km,+120 km] edges, no averaging, rescaling or decimation.
start, stop = 2300, 5300
data = np.array(original[start:stop,start:stop], dtype='<i2')
assert data.min() >= -14592 and data.max() <= 14052, 'Invalid/special height sample'
binary = data.tobytes()
out = Path('public/terrain')
(out/'south-pole-80m.i16').write_bytes(binary)
(out/'LDEM_80S_80M.LBL').write_bytes(label.read_bytes())
meta = dict(id='lola-80s-80m-crop-v1', source='https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.IMG',
    label='https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.LBL', frame='MOON_ME / DE421',
    radiusM=1737400, width=3000, height=3000, x0=(start-3799.5)*80, y0=(3799.5-start)*80,
    spacingM=80, scaleM=0.5, format='Int16LE', cropStartRow=start, cropStartColumn=start,
    sourceWidth=7600, rangeM=100000, minM=float(data.min()*0.5), maxM=float(data.max()*0.5),
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    labelSha256=hashlib.sha256(label.read_bytes()).hexdigest(), sha256=hashlib.sha256(binary).hexdigest())
for path in [out/'regional-metadata.json',Path('src/science/regionalMetadata.json')]:
    path.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print(json.dumps(meta,indent=2))
