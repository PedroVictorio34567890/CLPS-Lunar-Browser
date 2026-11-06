# NASA LOLA local terrain derivative

Source: NASA Goddard PGDA, Site04 (Shackleton rim), Barker et al. (2021),
Planetary and Space Science 203, 105119, DOI 10.1016/j.pss.2020.105119.
https://pgda.gsfc.nasa.gov/products/78
https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README

Original: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif
Downloaded 2026-11-06. Original SHA-256 and derivative SHA-256 are in metadata.json.

The original 3200 x 3200 GeoTIFF is 5 m/pixel, south polar stereographic,
MOON_ME / DE421, sphere radius 1737400 m. Height samples are meters relative
to this reference sphere. PixelIsArea: original upper-left corner (-9000,1000)
m; first pixel center (-8997.5,997.5) m. Longitude origin 0°, latitude -90°,
scale 1, no false easting/northing. NASA specifies pixel-center coordinates.

shackleton-20m.f32 is 800 x 800 little-endian Float32, row-major, every fourth
original sample starting at (0,0); no synthesized relief. Coordinates:
x = -8997.5 + column * 20; y = 997.5 - row * 20 meters.
This is decimation, NOT a new 5 m product or an uncertainty estimate.
Fine ridges can be lost; interpolated source cells are not independent laser shots.

Reproduce with scripts/prepare-terrain.py. Tool versions used:
Python 3.14, numpy 2.5.4, tifffile 2026.10.15, imagecodecs 2026.10.10.
Only this derivative and metadata are shipped; the original remains in ignored qa/.
Runtime checks byte count and SHA-256 before computing. No runtime NASA request.

Use is exploratory: detailed rays to 3 km, extended with the regional DEM below
to 100 km, 0.5° azimuth, 20/80 m radial spacing, +2 m observer,
floor at 0°; no terrain beyond the tile/ray range is assumed to be certified clear.
Local J2000 vectors are rotated into MOON_ME_DE421 using the SPICE-derived
table documented below. Results must not be used as validated polar
landing or radio-link feasibility. Countdowns, scenario metrics and surface horizon use terrain where available; the report retains an explicit spherical reference and the orbital Moon is spherical.

## SPICE-derived lunar orientation

`moon-me-de421.f64`: scalar-first Hamilton quaternions, Float64 little-endian,
J2000 -> MOON_ME_DE421. Six-hour TT grid; shortest-arc SLERP in the browser.
`frame-metadata.json` records grid bounds, SHA-256, kernel hashes and midpoint validation.
Product coverage: 2000-01-01 through 2050-01-01 UTC. No extrapolation or IAU fallback.
Translational ephemerides remain Astronomy Engine; the table only supplies orientation.
Future UTC conversion assumes no leap seconds after those recorded in NAIF0012.

Reproduce: download the following unchanged official kernels into `qa/spice-kernels`,
install SpiceyPy 8.3.0 and numpy in `qa/terrain-tools`, then run
`python scripts/prepare-lunar-frame.py` from the repository root. Originals are ignored.

- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc

Generator uses `unitim(TDT, ET)`, `pxform(J2000, MOON_ME_DE421)`, `m2q`.
It validates every midpoint against direct SPICE (observed max 0.02256 arcsec),
and exports separate off-grid matrices for TypeScript regression tests.
This interpolation check is not a bound on DEM or full communication accuracy.

## Regional horizon: native 80 m LOLA GDR

Source: LRO-L-LOLA-4-GDR-V1.0, LDEM_80S_80M V2.0, LOLA Team (2017).
https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.IMG
https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_80S_80M.LBL
Downloaded 2026-11-06; original label shipped alongside this file.

`south-pole-80m.i16` is a lossless spatial crop of the native 7600 × 7600 grid:
rows and columns [2300,5300), zero-based. 3000 × 3000 Int16 little-endian samples,
18 MB. Elevation in meters = DN × 0.5; do NOT add the radius to this height.
MOON_ME/DE421, south polar stereographic, reference radius 1737400 m,
x0=-119960 m, y0=119960 m at the first pixel center, 80 m spacing.
No averaging, invented heights or further downsampling. Source grid was already
interpolated by the LOLA team; pixels are not independent laser observations.

Reproduce with `python scripts/prepare-regional-terrain.py` using original IMG/LBL
in `qa/terrain-source`. Original, label and derivative hashes are recorded in
`regional-metadata.json`. Runtime verifies size and SHA-256 before calculation.
The source is 115520000 bytes and is not shipped. This dataset is distinct from
the adjusted PGDA Site04 map; differences at their 3 km join are not corrected.

Regional rays run from 3 to 100 km at 80 m steps, explicitly including both ends.
Missing samples invalidate the result rather than being filled with zero.
The observer still needs local Site04 coverage. Beyond 100 km is unassessed;
0.5° ray spacing can miss narrow peaks (about 873 m transverse spacing at 100 km).
