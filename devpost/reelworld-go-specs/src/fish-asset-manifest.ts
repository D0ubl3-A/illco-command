/**
 * ReelWorld GO original fish asset manifest validator.
 * Explicitly blocks substitute fish from being treated as production assets.
 */
export type FishAsset = {
  speciesId: string;
  displayName: string;
  modelUri: string;
  textureUris: string[];
  animationClips: string[];
  sourceGame: "reelworld-go-online";
  provenance: string;
  approvedForReuse: boolean;
};
export type FishManifest = { version: 1; fish: FishAsset[] };
export type FishValidation = { valid: boolean; errors: string[] };
const safeRelative = (s:string) => s.length>0 && !s.startsWith("/") && !s.includes("..") && !/^[a-z]+:\/\//i.test(s);
export function validateFishManifest(manifest: FishManifest): FishValidation {
 const errors:string[]=[];
 if(manifest.version!==1)errors.push("Unsupported manifest version");
 if(!manifest.fish.length)errors.push("No original fish assets supplied");
 const ids=new Set<string>();
 for(const fish of manifest.fish){
  if(!fish.speciesId.trim())errors.push("Missing species ID");
  if(ids.has(fish.speciesId))errors.push("Duplicate species ID: "+fish.speciesId);
  ids.add(fish.speciesId);
  if(fish.sourceGame!=="reelworld-go-online")errors.push("Unverified fish source: "+fish.speciesId);
  if(!fish.approvedForReuse)errors.push("Reuse approval missing: "+fish.speciesId);
  if(!fish.provenance.trim())errors.push("Source provenance missing: "+fish.speciesId);
  if(!safeRelative(fish.modelUri))errors.push("Invalid local model path: "+fish.speciesId);
  if(!fish.textureUris.length || fish.textureUris.some(x=>!safeRelative(x)))errors.push("Missing/invalid textures: "+fish.speciesId);
  if(!fish.animationClips.length)errors.push("Animation clips missing: "+fish.speciesId);
 }
 return {valid:errors.length===0,errors};
}
export function getApprovedFish(manifest: FishManifest,speciesId:string):FishAsset|null{
 if(!validateFishManifest(manifest).valid)return null;
 return manifest.fish.find(x=>x.speciesId===speciesId)??null;
}
