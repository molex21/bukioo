import test from "node:test";
import assert from "node:assert/strict";
import {isScheduleDate,schedulePage,updateScheduleSearch} from "../src/lib/scheduling-view.ts";
import {loadScheduleEmployeeVersions} from "../src/lib/schedule-selection.ts";
test("schedule dates reject impossible dates and malformed URLs",()=>{
  assert.equal(isScheduleDate("2028-02-29"),true);assert.equal(isScheduleDate("2027-02-29"),false);assert.equal(isScheduleDate("2026-13-01"),false);assert.equal(isScheduleDate(null),false);assert.equal(isScheduleDate("08/11/2026"),false);
});
test("team query changes preserve company scope and unrelated state",()=>{
  const before=new URLSearchParams("business=qa-norte&teamView=quadrant&week=2026-11-09&employee=person-a&teamPage=2");
  const after=updateScheduleSearch(before,{week:"2026-11-16",teamPage:null,day:null});
  assert.equal(after.get("business"),"qa-norte");assert.equal(after.get("employee"),"person-a");assert.equal(after.get("teamView"),"quadrant");assert.equal(after.has("teamPage"),false);assert.equal(before.get("teamPage"),"2");
  const restored=new URLSearchParams(after.toString());assert.equal(restored.get("week"),"2026-11-16");
});
test("invalid pagination cannot produce a negative or infinite offset",()=>{
 for(const value of [null,"0","-1","NaN","Infinity","1.5","10001"])assert.equal(schedulePage(value),1);
 assert.equal(schedulePage("3"),3);
});
test("all selected employees receive their own versions beyond a ten-person page",async()=>{
 const ids=Array.from({length:12},(_,i)=>`employee-${i}`),lookups=[];
 const versions=await loadScheduleEmployeeVersions(ids,async id=>{lookups.push(id);return{id,version:ids.indexOf(id)+1};});
 assert.equal(Object.keys(versions).length,12);assert.equal(versions["employee-11"],12);assert.deepEqual(lookups,ids);
});
test("an unavailable employee prevents incomplete assignment versions",async()=>{
 await assert.rejects(loadScheduleEmployeeVersions(["a","b"],async id=>id==="a"?{id,version:1}:undefined),/equipo ha cambiado/);
 await assert.rejects(loadScheduleEmployeeVersions(["a"],async()=>({id:"other-company-person",version:1})),/equipo ha cambiado/);
 await assert.rejects(loadScheduleEmployeeVersions(["a"],async()=>({id:"a",version:-1})),/equipo ha cambiado/);
});
test("employee selection deduplicates and respects the backend batch limit",async()=>{
 let calls=0;assert.deepEqual(await loadScheduleEmployeeVersions(["a","a"],async id=>{calls++;return{id,version:0};}),{a:0});assert.equal(calls,1);
 await assert.rejects(loadScheduleEmployeeVersions(Array.from({length:51},(_,i)=>String(i)),async()=>{throw new Error("must not fetch");}),/50 empleados/);
});
