import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
import type { ComparisonReport } from '../src/models.ts';
import { activeAnalysis } from '../src/lib/activeAnalysis.ts';
import { summarizeScenario } from '../src/lib/scenarioComparison.ts';
import { makeScenario } from '../src/lib/scenarios.ts';
import { nextEvents } from '../src/science/nextEvents.ts';
import { terrainSkyAt } from '../src/science/terrainView.ts';
import { appendSite } from '../src/lib/sites.ts';

// Exercise the same bundled module and binary loading used by the web worker.
const bundle = await build({configFile:false, logLevel:'silent', build:{write:false, minify:false,
  lib:{entry:'src/science/terrainAssessment.ts',formats:['es']}}});
if ('close' in bundle) throw new Error('Unexpected watch build');
const output = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(item=>item.type==='chunk');
if (!output || output.type!=='chunk') throw new Error('Missing worker bundle');
const { addTerrainAssessment } = await import(`data:text/javascript;base64,${Buffer.from(output.code).toString('base64')}`) as {addTerrainAssessment:(report:ComparisonReport)=>Promise<void>};
const metadata = JSON.parse(readFileSync(new URL('../src/science/terrainMetadata.json',import.meta.url),'utf8'));
const candidate = appendSite([],metadata.demo,'lola')[0];
const report = (year=2026) => sphericalEngine.compare([candidate],{start:`${year}-11-06T00:00`,end:`${year}-11-07T00:00`},DEFAULT_MISSION);
const asset = (url: string) => new Response(readFileSync(new URL(`../public${url}`,import.meta.url)));

test('terrain worker loads verified orientation and DEM without altering spherical results', async t => {
  t.mock.method(globalThis,'fetch',async (url:string)=>asset(url));
  const result = await report(), original = structuredClone(result);
  await addTerrainAssessment(result);
  const local = result.sites[0].terrain;
  assert.equal(local?.status,'local');
  if (local?.status==='local') {
    assert.ok(Number.isFinite(local.accessPercent) && local.accessPercent>=0 && local.accessPercent<=100);
    assert.equal(local.profile.length,720);
    assert.equal(local.rangeM,100000);
    assert.ok(local.accessPercent <= local.nearAccessPercent + 1e-9);
    assert.ok(local.geometricOutageHours >= local.nearOutageHours - 1e-9);
    const active=activeAnalysis(result.sites[0],result.mission);
    assert.equal(active.model,'terrain');
    assert.equal(active.series,local.series);
    assert.equal(active.energy,local.energy);
    assert.equal(active.accessWindows,local.accessWindows);
    assert.equal(local.sky.length,local.series.samples.length);
    const sky=terrainSkyAt(local.sky,local.sky[0].time)!;
    assert.ok(Math.abs(sky.sun.elevation-local.series.samples[0].sun)<1e-10);
    assert.deepEqual(nextEvents(active.series!.sunlight,local.sky[0].time),nextEvents(local.series.sunlight,local.sky[0].time));
    const scenario=makeScenario({sites:[candidate],period:result.period,mission:DEFAULT_MISSION},'LOLA','lola','2026-11-06T00:00:00Z');
    const [row]=summarizeScenario(scenario,result);
    assert.equal(row.model,'terrain');
    assert.equal(row.geometricPercent,local.accessPercent);
    assert.equal(row.jointPercent,local.jointPercent);
    assert.equal(row.minChargePercent,local.minChargePercent);
    assert.equal(row.energyPass,local.energy.unservedWh<=1e-9 && local.energy.firstReserveViolation===null);
  }
  delete result.sites[0].terrain;
  assert.deepEqual(result,original);
});

test('terrain worker refuses a failed regional download instead of silently showing a 3 km result', async t => {
  t.mock.method(globalThis,'fetch',async (url:string)=>url.endsWith('.i16') ? new Response(null,{status:404}) : asset(url));
  const result=await report();
  await addTerrainAssessment(result);
  assert.equal(result.sites[0].terrain?.status,'unavailable');
  assert.equal(activeAnalysis(result.sites[0],result.mission).reason,'unavailable');
  assert.equal(activeAnalysis(result.sites[0],result.mission).model,'sphere');
});

test('terrain worker rejects a corrupted regional map', async t => {
  t.mock.method(globalThis,'fetch',async (url:string)=>{
    if (!url.endsWith('.i16')) return asset(url);
    const bytes=readFileSync(new URL(`../public${url}`,import.meta.url)); bytes[0]^=1;
    return new Response(bytes);
  });
  const result=await report();
  await addTerrainAssessment(result);
  assert.equal(result.sites[0].terrain?.status,'unavailable');
});
test('terrain worker refuses periods beyond orientation coverage without fetching or fallback', async t => {
  const fetch = t.mock.method(globalThis,'fetch',async ()=>{ throw new Error('must not fetch'); });
  const result = await report(2051);
  await addTerrainAssessment(result);
  assert.equal(result.sites[0].terrain?.status,'frame-outside');
  assert.equal(fetch.mock.callCount(),0);
});
test('terrain worker rejects a same-length corrupted orientation table', async t => {
  t.mock.method(globalThis,'fetch',async (url:string)=>{
    if (!url.endsWith('.f64')) return asset(url);
    const bytes = readFileSync(new URL(`../public${url}`,import.meta.url)); bytes[0]^=1;
    return new Response(bytes);
  });
  const result = await report();
  await addTerrainAssessment(result);
  assert.equal(result.sites[0].terrain?.status,'unavailable');
});
