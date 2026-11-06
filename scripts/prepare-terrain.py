"""Prepare the local browser DEM from the unmodified NASA PGDA Site04 GeoTIFF.
Run: python scripts/prepare-terrain.py qa/terrain-source/Site04.tif
Dependencies are confined to qa/terrain-tools; source TIFF is not shipped.
"""
import sys, json, hashlib, math
from pathlib import Path
sys.path.insert(0, str(Path('qa/terrain-tools').resolve()))
import numpy as np
import tifffile

source = Path(sys.argv[1])
with tifffile.TiffFile(source) as tif:
    geo = tif.geotiff_metadata
    assert tif.pages[0].shape == (3200, 3200)
    assert geo['ModelPixelScale'][:2] == [5.0, 5.0]
    assert geo['GeogSemiMajorAxisGeoKey'] == 1737400
    assert geo['ProjNatOriginLatGeoKey'] == -90
    assert geo['GTRasterTypeGeoKey'] == 1
    # PixelIsArea ties refer to the upper-left corner: first center +2.5,-2.5 m.
    x0 = geo['ModelTiepoint'][3] + 2.5
    y0 = geo['ModelTiepoint'][4] - 2.5
    data = tif.asarray()[::4, ::4].astype('<f4')
assert np.isfinite(data).all(), 'Missing DEM cells: do not silently fill them'
output = Path('public/terrain'); output.mkdir(parents=True, exist_ok=True)
binary = data.tobytes()
(output / 'shackleton-20m.f32').write_bytes(binary)
# A reproducible central sample, not an optimized or recommended landing site.
row, col = data.shape[0] // 2, data.shape[1] // 2
x, y = x0 + col*20, y0 - row*20
metadata = dict(id='pgda-site04-20m-v1', source='https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif',
    citation='Barker et al. (2021), Planetary and Space Science 203, 105119', frame='MOON_ME / DE421', radiusM=1737400,
    width=int(data.shape[1]), height=int(data.shape[0]), x0=x0, y0=y0, spacingM=20, nativeSpacingM=5,
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), sha256=hashlib.sha256(binary).hexdigest(),
    minM=float(data.min()), maxM=float(data.max()),
    demo=dict(latitude=-90+math.degrees(2*math.atan(math.hypot(x,y)/(2*1737400))), longitude=math.degrees(math.atan2(x,y))))
Path('src/science/terrainMetadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
(output / 'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metadata,indent=2))
