/**
 * Portable procedural lake geometry for ReelWorld GO SPECS prototype.
 * Units: meters. Y-up. No runtime-specific API dependencies.
 * Native CLAD/Lens Studio adapter must convert buffers to supported meshes.
 */
export type MeshBuffers = { positions: number[]; normals: number[]; uvs: number[]; indices: number[] };
export type LakeGeometry = { water: MeshBuffers; shoreline: MeshBuffers; bobber: { position: [number,number,number]; radius: number }; fishPath: [number,number,number][] };
const empty = (): MeshBuffers => ({positions:[],normals:[],uvs:[],indices:[]});
function ring(inner:number,outer:number,segments:number,height:number):MeshBuffers {
 const mesh=empty();
 for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
   for(const r of [inner,outer]){
     mesh.positions.push(r*c,height,r*s);
     mesh.normals.push(0,1,0);
     mesh.uvs.push((r*c/outer+1)/2,(r*s/outer+1)/2);
   }
 }
 for(let i=0;i<segments;i++){
   const k=i*2;
   mesh.indices.push(k,k+2,k+1,k+1,k+2,k+3);
 }
 return mesh;
}
function disk(radius:number,segments:number):MeshBuffers{
 const m=empty();
 m.positions.push(0,0,0);m.normals.push(0,1,0);m.uvs.push(0.5,0.5);
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2;
  const x=Math.cos(a),z=Math.sin(a);
  m.positions.push(radius*x,0,radius*z);
  m.normals.push(0,1,0);
  m.uvs.push((x+1)/2,(z+1)/2);
 }
 for(let i=1;i<=segments;i++)m.indices.push(0,i,i+1);
 return m;
}
export function createLakeGeometry(radiusMeters=1.2,segments=48):LakeGeometry {
 if(!Number.isFinite(radiusMeters)||radiusMeters<0.4||radiusMeters>2.5)throw new Error("Lake radius must be between 0.4 and 2.5 meters");
 if(!Number.isInteger(segments)||segments<12||segments>128)throw new Error("Segments must be 12–128");
 const fishPath:[number,number,number][]=[];
 for(let i=0;i<64;i++){
  const a=i/64*Math.PI*2;
  fishPath.push([Math.cos(a)*radiusMeters*0.48,-0.12,Math.sin(a)*radiusMeters*0.48]);
 }
 return {
  water:disk(radiusMeters,segments),
  shoreline:ring(radiusMeters,radiusMeters*1.12,segments,0.012),
  bobber:{position:[0,0.06,-radiusMeters*0.3],radius:0.045},
  fishPath
 };
}
