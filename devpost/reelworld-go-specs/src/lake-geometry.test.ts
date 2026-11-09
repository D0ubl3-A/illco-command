import test from "node:test";
import assert from "node:assert/strict";
import { createLakeGeometry } from "./lake-geometry";
test("lake mesh buffers are indexed consistently",()=>{
 const g=createLakeGeometry();
 for(const m of [g.water,g.shoreline]){
  assert.equal(m.positions.length%3,0);
  assert.equal(m.normals.length,m.positions.length);
  assert.equal(m.uvs.length,m.positions.length/3*2);
  assert.ok(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<m.positions.length/3));
 }
 assert.equal(g.fishPath.length,64);
});
test("invalid radius and segment count rejected",()=>{
 assert.throws(()=>createLakeGeometry(0.1));
 assert.throws(()=>createLakeGeometry(1.2,5));
});
