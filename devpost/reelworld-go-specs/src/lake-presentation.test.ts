import test from "node:test";
import assert from "node:assert/strict";
import { initialState, transition } from "./create-water-controller";
import { presentLake } from "./lake-presentation";

test("placement scene has transparent background and no artificial scenery", () => {
 const view=presentLake(initialState);
 assert.equal(view.transparentBackground,true);
 assert.equal(view.waterOnly,true);
 assert.deepEqual(view.nodes.map(n=>n.id),["water","bobber","fish","line","splash"]);
 assert.equal(view.nodes.find(n=>n.id==="water")?.visible,false);
});
test("original fish asset required before showing fish", () => {
 let s=transition(initialState,{type:"PLACE_LAKE",position:{x:0,y:0,z:0}});
 s=transition(s,{type:"CAST"});
 for(let i=0;i<13;i++)s=transition(s,{type:"TICK",deltaSeconds:0.2});
 s=transition(s,{type:"HOOK"});
 assert.equal(presentLake(s).nodes.find(n=>n.id==="fish")?.visible,false);
 const view=presentLake(s,"original-reelworld-bass");
 assert.equal(view.fishAssetStatus,"provided-original-assets");
 assert.equal(view.nodes.find(n=>n.id==="fish")?.visible,true);
});
