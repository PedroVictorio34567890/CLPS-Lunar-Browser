import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
import { appendSite } from '../src/lib/sites.ts';
import type { ComparisonReport } from '../src/models.ts';
const bundle=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:'src/science/landingAssessment.ts',formats:['es']}}});
if('close' in bundle) throw Error('watch');
const out=(Array.isArray(bundle)?bundle[0]:bundle).output.find(o=>o.type==='chunk');if(!out||out.type!=='chunk')throw Error('bundle');
const {addLandingAssessment}=await import(`data:text/javascript;base64,${Buffer.from(out.code).toString('base64')}`) as {addLandingAssessment:(r:ComparisonReport)=>Promise<void>};
const metadata=JSON.parse(readFileSync(new URL('../src/science/terrainMetadata.json',import.meta.url),'utf8'));
const makeReport=async()=>{
  let sites=appendSite([],metadata.demo,'fine');sites=appendSite(sites,{latitude:-88,longitude:90},'regional');sites=appendSite(sites,{latitude:0,longitude:0},'outside');
  return sphericalEngine.compare(sites,{start:'2060-11-15T00:00',end:'2060-11-16T00:00'},DEFAULT_MISSION);
};
test('static terrain loads verified fine and regional data outside temporal horizon coverage',async t=>{
  t.mock.method(globalThis,'fetch',async(url:string)=>new Response(readFileSync(new URL(`../public${url}`,import.meta.url))));
  const r=await makeReport(),old=structuredClone(r);await addLandingAssessment(r);
  for(const [i,spacing] of [[0,20],[1,80]]){const result=r.sites[i].landing;assert.equal(result?.status,'calculated');if(result?.status==='calculated'){assert.equal(result.spacingM,spacing);assert.ok(result.sampleCount>9);assert.ok(Number.isFinite(result.residualRmsM));}}
  assert.equal(r.sites[2].landing?.status,'outside');r.sites.forEach(s=>delete s.landing);assert.deepEqual(r,old);
});
test('corrupt fine DEM is unavailable, with no fallback; valid regional site still computes',async t=>{
  const fetched:string[]=[];
  t.mock.method(globalThis,'fetch',async(url:string)=>{fetched.push(url);const data=readFileSync(new URL(`../public${url}`,import.meta.url));if(url.endsWith('shackleton-20m.f32'))data[0]^=1;return new Response(data);});
  const r=await makeReport();await addLandingAssessment(r);assert.equal(r.sites[0].landing?.status,'unavailable');assert.equal(r.sites[1].landing?.status,'calculated');assert.equal(fetched.length,2);
});
