import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horizonsQuery, polarTile } from '../src/lib/officialResources.ts';
import { compareHorizons } from '../src/science/horizonsValidation.ts';
const period={start:'2026-09-27T00:00',end:'2026-10-04T00:00'};
const fixture=readFileSync(new URL('./fixtures/horizons-lunar-2026.json',import.meta.url),'utf8');
test('Horizons queries preserve UTC period, numeric body identifiers and lunar east-positive coordinates',()=>{
  const q=new URL(horizonsQuery(period)).searchParams;
  assert.equal(q.get('COMMAND'),"'301'");assert.equal(q.get('CENTER'),"'500@399'");assert.equal(q.get('QUANTITIES'),"'14,15'");assert.equal(q.get('TIME_TYPE'),"'UT'");assert.equal(q.get('STEP_SIZE'),"'7'");
  const surface=new URL(horizonsQuery(period,{latitude:-89,longitude:-171},'earth')).searchParams;
  assert.equal(surface.get('SITE_COORD'),"'-171,-89,0'");assert.equal(surface.get('CENTER'),"'coord@301'");assert.equal(surface.get('COMMAND'),"'399'");
  assert.throws(()=>horizonsQuery({...period,end:period.start}));
});
test('polar WMTS projection matches cardinal directions, matrix indices and bounded coverage',()=>{
  const pole=polarTile({latitude:-90,longitude:0},6)!;
  assert.ok(pole.url.endsWith('/6/32/32.png'));assert.equal(pole.x,0);assert.equal(pole.y,0);
  const north=polarTile({latitude:-89,longitude:0},6)!;
  const east=polarTile({latitude:-89,longitude:90},6)!;
  assert.ok(north.url.endsWith('/6/31/32.png'));assert.ok(east.url.endsWith('/6/32/32.png'));
  assert.equal(polarTile({latitude:-80,longitude:0},6),null);assert.equal(polarTile({latitude:90,longitude:0},6),null);
  assert.throws(()=>polarTile({latitude:-90,longitude:0},10));
});
test('Horizons reference import compares all dates without replacing scientific state',()=>{
  const r=compareHorizons(fixture,period);assert.equal(r.rows.length,8);assert.ok(r.maxEarthDeg<0.05);assert.ok(r.maxSunDeg<0.05);
});
test('Horizons import rejects wrong origin, API version, malformed data and stale dates',()=>{
  for(const bad of [fixture.replace('Earth (399)','Mars (499)'),fixture.replace('GEOCENTRIC','TOPOCENTRIC'),fixture.replace('"1.2"','"1.3"'),fixture.replace('355.193311','n.a.'),fixture.replaceAll('2026-Sep-28 00:00','2026-Sep-27 00:00'),fixture.replaceAll('2026-Sep-27 00:00','2026-Sep-32 00:00')]) assert.throws(()=>compareHorizons(bad,period));
  assert.throws(()=>compareHorizons(fixture,{...period,start:'2026-09-28T00:00'}));
  assert.throws(()=>compareHorizons(fixture,{...period,end:'2026-10-05T00:00'}));
});
