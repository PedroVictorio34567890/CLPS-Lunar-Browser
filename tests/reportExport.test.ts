import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
import { createReportExport, reportCsv, validateReport } from '../src/lib/reportExport.ts';
const site={id:'site-1',slot:0,color:'#fff',latitude:-85,longitude:0};
const period={start:'2026-09-27T00:00',end:'2026-09-28T00:00'};
const example=()=>sphericalEngine.compare([site],period,DEFAULT_MISSION);
test('export preserves complete inputs and series independently with explicit coverage warnings',async()=>{
  const r=await example(),out=createReportExport(r,{source:'test'},'2026-11-15T00:00:00Z');
  assert.deepEqual(out.report,r);assert.equal(out.schema,'lunar-mission-report-v1');
  assert.ok(out.checks.some(c=>c.code==='terrain-coverage'&&c.status==='warning'));
  assert.ok(!out.checks.some(c=>c.status==='error'));
  r.mission!.batteryWh=123;assert.equal(out.report.mission!.batteryWh,DEFAULT_MISSION.batteryWh);
  assert.deepEqual(JSON.parse(JSON.stringify(out)).report,out.report);
});
test('nonfinite numbers, energy imbalance and broken windows block export',async()=>{
  for(const mutate of [(r:Awaited<ReturnType<typeof example>>)=>{r.sites[0].energy!.generatedWh=NaN;},(r:Awaited<ReturnType<typeof example>>)=>{r.sites[0].energy!.finalChargeWh+=10;},(r:Awaited<ReturnType<typeof example>>)=>{r.sites[0].series!.sunlight[0].start+=1;}]){
    const r=await example();mutate(r);assert.throws(()=>createReportExport(r,{}));assert.throws(()=>reportCsv(r));
  }
});
test('CSV distinguishes unavailable from zero and prevents formula cells',async()=>{
  const r=await example();r.sites[0].site.id='=HYPERLINK("bad")';
  const csv=reportCsv(r);assert.ok(csv.startsWith('\uFEFF"site_id"'));assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"not-calculated","","",""'));assert.ok(csv.includes('"0"'));
});
test('terrain energy is validated separately, not replaced by spherical energy',async()=>{
  const r=await example();
  r.sites[0].terrain={status:'local',series:r.sites[0].series!,energy:structuredClone(r.sites[0].energy!),accessWindows:[],sky:[],rangeM:100000,localProfile:[],profile:[],nearAccessPercent:0,nearOutageHours:24,geometricOutageHours:24,elevationM:0,sunlightPercent:0,accessPercent:0,longestOutageHours:24,minChargePercent:0,unservedWh:0,jointPercent:0};
  r.sites[0].terrain.energy.finalChargeWh+=20;
  assert.ok(validateReport(r).some(c=>c.code==='terrain-energy'&&c.status==='error'));
});
