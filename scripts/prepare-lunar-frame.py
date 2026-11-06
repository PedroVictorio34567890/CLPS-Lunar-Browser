"""Build browser orientation data. Requires numpy and spiceypy in qa/terrain-tools.
Inputs: official NAIF kernels in qa/spice-kernels. No network at runtime.
"""
import sys, json, hashlib
from pathlib import Path
sys.path.insert(0, str(Path('qa/terrain-tools').resolve()))
import numpy as np
import spiceypy as spice

root = Path('qa/spice-kernels')
names = ['naif0012.tls', 'moon_080317.tf', 'moon_pa_de421_1900-2050.bpc']
for name in names:
    spice.furnsh(str(root / name))

start, end, step = -1.0, 18264.0, 0.25 # TT days since J2000 noon
def matrix(day):
    return spice.pxform('J2000', 'MOON_ME_DE421', spice.unitim(day*86400, 'TDT', 'ET'))
days = np.arange(start, end + step/2, step)
quats = np.array([spice.m2q(matrix(day)) for day in days], dtype='<f8')
for i in range(1, len(quats)):
    if np.dot(quats[i-1], quats[i]) < 0:
        quats[i] *= -1

# Check every midpoint against direct SPICE, not only the saved grid nodes.
max_error = 0.0
for i in range(len(quats)-1):
    q = quats[i] + quats[i+1]
    q /= np.linalg.norm(q)
    delta = spice.q2m(q) @ matrix(days[i]+step/2).T
    error = np.arctan2(np.linalg.norm([delta[2,1]-delta[1,2], delta[0,2]-delta[2,0], delta[1,0]-delta[0,1]])/2, (np.trace(delta)-1)/2)
    max_error = max(max_error, float(error*180/np.pi*3600))
assert max_error < 0.1, max_error

output = Path('public/terrain')
binary = quats.tobytes()
(output/'moon-me-de421.f64').write_bytes(binary)
metadata = dict(frame='MOON_ME_DE421', inputFrame='J2000', startTtDays=start, stepDays=step, count=len(quats),
    utcStart='2000-01-01T00:00:00Z', utcEnd='2050-01-01T00:00:00Z',
    sha256=hashlib.sha256(binary).hexdigest(), maxMidpointErrorArcsec=max_error,
    spiceypy=spice.__version__, kernels={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in names})
for dest in [output/'frame-metadata.json', Path('src/science/frameMetadata.json')]:
    dest.write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
# Independent matrices at off-grid epochs, including both supported endpoints.
fixture_days = [-0.49925712962962965, 0, 3652.123, 9766.314159, 12000.72, 18262.50080074074]
fixtures = [dict(ttDays=day, matrix=matrix(day).tolist()) for day in fixture_days]
Path('tests/fixtures/moon-me-de421.json').write_text(json.dumps(fixtures,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metadata,indent=2))
