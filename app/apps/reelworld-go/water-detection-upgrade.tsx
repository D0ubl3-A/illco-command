"use client";

import { useEffect } from "react";

type DetectorState = {
  ema: number;
  stableFrames: number;
  missFrames: number;
  locked: boolean;
  previousLuma?: Float32Array;
};

type FrameAnalysis = {
  confidence: number;
  luma: Float32Array;
};

const detectorState = new WeakMap<HTMLCanvasElement, DetectorState>();
const INSTALL_FLAG = "__reelworldEnhancedWaterDetectorV2";

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function colorDistance(data: Uint8ClampedArray, first: number, second: number) {
  return (
    Math.abs(data[first] - data[second]) +
    Math.abs(data[first + 1] - data[second + 1]) +
    Math.abs(data[first + 2] - data[second + 2])
  ) / 3;
}

export function analyzeFrame(data: Uint8ClampedArray, width: number, height: number, previousLuma?: Float32Array): FrameAnalysis {
  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);
  const roiStart = Math.max(1, Math.floor(height * 0.36));
  const roiRows = Math.max(1, height - roiStart);
  const rowWater = new Float32Array(roiRows);
  const rowLongestRun = new Uint16Array(roiRows);
  let weightedPixels=0, waterWeight=0, colorWeight=0, horizontalWeight=0, smoothWeight=0, vegetationWeight=0, gradientTotal=0;
  let lowerBluePixels=0, lowerPixels=0, lowerBrightness=0, topBluePixels=0, topPixels=0, topBrightness=0, topGradient=0;
  let motionTotal=0, motionSquaredTotal=0, motionPixels=0;
  for (let y=0;y<height;y++) {
    let currentRun=0,longestRun=0;
    for (let x=0;x<width;x++) {
      const pixel=y*width+x,index=pixel*4,red=data[index],green=data[index+1],blue=data[index+2];
      const maximum=Math.max(red,green,blue),minimum=Math.min(red,green,blue),saturation=maximum>0?(maximum-minimum)/maximum:0;
      const brightness=red*.2126+green*.7152+blue*.0722;luma[pixel]=brightness;
      const leftDifference=x>0?colorDistance(data,index,index-4):0,upperDifference=y>0?colorDistance(data,index,index-width*4):leftDifference,gradient=(leftDifference+upperDifference)/2;
      const blueCyan=blue>48&&blue>red*.94&&blue>green*.78&&blue-red>4;
      const teal=green>45&&blue>42&&green>red*1.03&&blue>red*1.02&&Math.abs(green-blue)<96;
      const highSaturationGreen=green>red*1.18&&green>blue*1.12&&saturation>.38;
      if(y<roiStart){topPixels++;topBrightness+=brightness;topGradient+=gradient;if(blueCyan||teal)topBluePixels++;continue;}
      const row=y-roiStart,depthWeight=.72+(row/Math.max(1,roiRows-1))*.56,smooth=leftDifference<34&&upperDifference<48,horizontallyCoherent=leftDifference<=upperDifference*1.28+5;
      const neutralReflection=saturation<.23&&brightness>30&&brightness<218&&smooth&&horizontallyCoherent;
      const darkWater=brightness<105&&blue>=red*.86&&green>=red*.88&&smooth;
      const earthyWater=red>=green&&green>blue&&red-blue<72&&saturation<.48&&brightness<180&&smooth&&horizontallyCoherent;
      const colorWater=blueCyan||teal,waterLike=colorWater?brightness>22&&brightness<242&&(smooth||horizontallyCoherent||saturation<.72):neutralReflection||darkWater||earthyWater;
      weightedPixels+=depthWeight;lowerPixels++;lowerBrightness+=brightness;gradientTotal+=gradient;if(blueCyan||teal)lowerBluePixels++;if(highSaturationGreen)vegetationWeight+=depthWeight;
      if(previousLuma?.length===pixelCount){const motion=Math.abs(brightness-previousLuma[pixel]);motionTotal+=motion;motionSquaredTotal+=motion*motion;motionPixels++;}
      if(waterLike){waterWeight+=depthWeight;rowWater[row]++;currentRun++;longestRun=Math.max(longestRun,currentRun);if(colorWater)colorWeight+=depthWeight;if(horizontallyCoherent)horizontalWeight+=depthWeight;if(smooth)smoothWeight+=depthWeight;}else currentRun=0;
    }
    if(y>=roiStart)rowLongestRun[y-roiStart]=longestRun;
  }
  const coverage=waterWeight/Math.max(1,weightedPixels),colorCoverage=colorWeight/Math.max(1,weightedPixels),horizontalScore=horizontalWeight/Math.max(1,waterWeight),smoothScore=smoothWeight/Math.max(1,waterWeight),vegetationRatio=vegetationWeight/Math.max(1,weightedPixels);
  const averageGradient=gradientTotal/Math.max(1,lowerPixels),averageTopGradient=topGradient/Math.max(1,topPixels),lowerBlueRatio=lowerBluePixels/Math.max(1,lowerPixels),topBlueRatio=topBluePixels/Math.max(1,topPixels),averageLowerBrightness=lowerBrightness/Math.max(1,lowerPixels),averageTopBrightness=topBrightness/Math.max(1,topPixels),averageMotion=motionTotal/Math.max(1,motionPixels);
  const motionVariance=motionPixels>0?Math.max(0,motionSquaredTotal/motionPixels-averageMotion*averageMotion):0,motionStdDev=Math.sqrt(motionVariance);
  let broadRows=0,strongestRow=0,longestRunRatio=0;for(let row=0;row<roiRows;row++){const rowRatio=rowWater[row]/width;strongestRow=Math.max(strongestRow,rowRatio);longestRunRatio=Math.max(longestRunRatio,rowLongestRun[row]/width);if(rowRatio>=.27)broadRows++;}
  const broadness=strongestRow*.54+(broadRows/roiRows)*.46;
  let confidence=coverage*.38+colorCoverage*.14+broadness*.20+longestRunRatio*.12+horizontalScore*.10+smoothScore*.06;
  const hasNaturalShimmer=averageMotion>=1.4&&averageMotion<=22&&motionStdDev>=.8;if(hasNaturalShimmer)confidence+=.065;if(averageMotion>42)confidence-=.14;if(averageGradient>78)confidence-=.13;if(vegetationRatio>.3&&averageGradient>28)confidence-=.2;
  // Reject frames that are uniformly blue from top to bottom (typical open sky), but do not
  // penalize a blue lake merely because sky is visible above it. Real water is commonly
  // materially darker than the sky it reflects, so require similar top/lower luminance before
  // applying the strong sky penalty.
  const similarTopLowerBrightness=Math.abs(averageTopBrightness-averageLowerBrightness)<12;
  const likelyOpenSky=topBlueRatio>.47&&lowerBlueRatio>.42&&averageTopGradient<18&&averageGradient<24&&similarTopLowerBrightness;
  if(likelyOpenSky)confidence-=.55;
  // Dark/green shoreline vegetation can satisfy some neutral/dark-water color rules after the
  // 40x28 camera downsample. If very little of the frame has explicit blue/teal water evidence
  // and only a partial region looks water-like, stay below the production lock threshold.
  const weakColorPartialSurface=colorCoverage<.08&&coverage<.65;
  if(weakColorPartialSurface)confidence=Math.min(confidence,.38);
  if(broadness<.22||longestRunRatio<.2)confidence=Math.min(confidence,.28);if(coverage<.15)confidence=Math.min(confidence,.24);
  const hasSpatialTemporalVariation=motionPixels>0&&motionStdDev>=.8;
  // A truly flat wall/screen has little texture and little top-to-bottom luminance structure.
  // Preserve the false-positive cap for those planes, while allowing low-gradient muddy water
  // and puddles whose upper/lower luminance still differs meaningfully.
  const topLowerBrightnessDelta=Math.abs(averageTopBrightness-averageLowerBrightness);
  const likelyStaticFlatPlane=coverage>.6&&averageTopGradient<5&&averageGradient<5&&topLowerBrightnessDelta<4&&!hasSpatialTemporalVariation;
  if(likelyStaticFlatPlane)confidence=Math.min(confidence,.3);
  return {confidence:clamp(confidence),luma};
}

function encodeConfidenceForLegacyScanner(image:ImageData,score:number){const sampledPixels=Math.ceil(image.data.length/16),positivePixels=Math.round((clamp(score,0,100)/100)*sampledPixels);for(let sample=0;sample<sampledPixels;sample++){const index=sample*16;if(index+2>=image.data.length)break;if(sample<positivePixels){image.data[index]=22;image.data[index+1]=124;image.data[index+2]=176;}else{image.data[index]=142;image.data[index+1]=96;image.data[index+2]=38;}}}

export function WaterDetectionUpgrade(){useEffect(()=>{const globalWindow=window as typeof window&Record<string,unknown>;if(globalWindow[INSTALL_FLAG])return;globalWindow[INSTALL_FLAG]=true;const prototype=CanvasRenderingContext2D.prototype,originalGetImageData=prototype.getImageData;prototype.getImageData=function(this:CanvasRenderingContext2D,sx:number,sy:number,sw:number,sh:number,settings?:ImageDataSettings){const image=originalGetImageData.call(this,sx,sy,sw,sh,settings),canvas=this.canvas;if(sx!==0||sy!==0||sw!==40||sh!==28||canvas.width!==40||canvas.height!==28)return image;const state=detectorState.get(canvas)||{ema:0,stableFrames:0,missFrames:0,locked:false};const analysis=analyzeFrame(image.data,sw,sh,state.previousLuma),rawScore=analysis.confidence*100,alpha=rawScore>state.ema?.34:.2;state.ema+=(rawScore-state.ema)*alpha;state.previousLuma=analysis.luma;if(!state.locked){state.stableFrames=state.ema>=46?state.stableFrames+1:0;if(state.stableFrames>=3){state.locked=true;state.missFrames=0;}}else{state.missFrames=state.ema<32?state.missFrames+1:0;if(state.missFrames>=3){state.locked=false;state.stableFrames=0;}}detectorState.set(canvas,state);encodeConfidenceForLegacyScanner(image,state.locked?Math.max(46,state.ema):Math.min(41,state.ema));return image;} as typeof prototype.getImageData;},[]);return null;}
