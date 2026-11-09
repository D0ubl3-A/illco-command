import test from "node:test";
import assert from "node:assert/strict";
import { validateFishManifest,getApprovedFish,type FishManifest } from "./fish-asset-manifest";
const approved:FishManifest={version:1,fish:[{speciesId:"bass",displayName:"Bass",modelUri:"assets/fish/bass.glb",textureUris:["assets/fish/bass.png"],animationClips:["swim"],sourceGame:"reelworld-go-online",provenance:"Verified game asset export",approvedForReuse:true}]};
test("approved original fish accepted",()=>{
 assert.equal(validateFishManifest(approved).valid,true);
 assert.equal(getApprovedFish(approved,"bass")?.speciesId,"bass");
});
test("unapproved fish rejected",()=>{
 const altered:FishManifest=JSON.parse(JSON.stringify(approved));
 altered.fish[0].approvedForReuse=false;
 assert.equal(validateFishManifest(altered).valid,false);
 assert.equal(getApprovedFish(altered,"bass"),null);
});
test("external and traversal asset paths rejected",()=>{
 const altered:FishManifest=JSON.parse(JSON.stringify(approved));
 altered.fish[0].modelUri="../secret.glb";
 assert.equal(validateFishManifest(altered).valid,false);
});
