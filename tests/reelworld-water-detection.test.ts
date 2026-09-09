import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFrame } from "../app/apps/reelworld-go/water-detection-upgrade";
const WIDTH=40,HEIGHT=28,WATER_THRESHOLD=.46; type RGB=readonly[number,number,number];
function makeFrame(pixel:(x:number,y:number)=>RGB){const data=new Uint8ClampedArray(WIDTH*HEIGHT*4);for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){const [r,g,b]=pixel(x,y),o=(y*WIDTH+x)*4;data[o]=r;data[o+1]=g;data[o+2]=b;data[o+3]=255;}return data;}
function waterScene(base:RGB,amplitude=18,phase=0){return makeFrame((x,y)=>{if(y<10)return[122,96,70];const ripple=((y+phase)%4<2?amplitude:-amplitude)+((x+phase)%9===0?5:0);return base.map(v=>Math.max(0,Math.min(255,v+ripple))) as unknown as RGB;});}
function lumaOf(frame:Uint8ClampedArray){return analyzeFrame(frame,WIDTH,HEIGHT).luma;}
function reachesProductionLock(frames:Uint8ClampedArray[]){let ema=0,stable=0,previous:Float32Array|undefined;for(const frame of frames){const a=analyzeFrame(frame,WIDTH,HEIGHT,previous),raw=a.confidence*100,alpha=raw>ema?.34:.2;ema+=(raw-ema)*alpha;previous=a.luma;stable=ema>=46?stable+1:0;if(stable>=3)return true;}return false;}
const neutralPrevious=waterScene([128,132,136],12,0),neutralCurrent=waterScene([134,138,142],12,1);
const cases=[
["deep-blue rippled water",true,waterScene([42,98,162],18)], ["cyan/teal rippled water",true,waterScene([42,132,158],17)], ["muddy earthy rippled water",true,waterScene([128,112,86],14)], ["neutral reflective water",true,neutralCurrent,neutralPrevious], ["dark textured water",true,waterScene([48,62,78],13)], ["uniform gray wall",false,makeFrame(()=>[132,132,132])], ["uniform blue painted wall",false,makeFrame(()=>[54,112,178])], ["open blue sky",false,makeFrame((x,y)=>[76+(y%2),142+(x%2),206])], ["dense green vegetation",false,makeFrame((x,y)=>(x+y)%2===0?[32,148,48]:[86,196,62])], ["brown dirt/floor",false,makeFrame((x,y)=>(x+y)%2===0?[136,88,48]:[78,50,28])]
] as const;
test("Water Scan >=9/10 and zero hard-negative false positives",()=>{let passed=0,fp=0;for(const [name,expected,frame,previous] of cases){const confidence=analyzeFrame(frame,WIDTH,HEIGHT,previous?lumaOf(previous):undefined).confidence,predicted=confidence>=WATER_THRESHOLD;if(predicted===expected)passed++;if(!expected&&predicted)fp++;console.log(name,confidence,predicted);}assert.ok(passed>=9,`got ${passed}/10`);assert.equal(fp,0);});
test("static flat plane is capped",()=>assert.ok(analyzeFrame(makeFrame(()=>[132,132,132]),WIDTH,HEIGHT).confidence<=.3));
test("flickering flat walls never lock",()=>{const gray=Array.from({length:14},(_,i)=>makeFrame(()=>i%2?[130,130,130]:[132,132,132]));const blue=Array.from({length:14},(_,i)=>makeFrame(()=>i%2?[52,110,176]:[54,112,178]));assert.equal(reachesProductionLock(gray),false);assert.equal(reachesProductionLock(blue),false);});
