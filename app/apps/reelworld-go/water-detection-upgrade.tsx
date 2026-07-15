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

function analyzeFrame(data: Uint8ClampedArray, width: number, height: number, previousLuma?: Float32Array): FrameAnalysis {
  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);
  const roiStart = Math.max(1, Math.floor(height * 0.36));
  const roiRows = Math.max(1, height - roiStart);
  const rowWater = new Float32Array(roiRows);
  const rowLongestRun = new Uint16Array(roiRows);

  let weightedPixels = 0;
  let waterWeight = 0;
  let colorWeight = 0;
  let horizontalWeight = 0;
  let smoothWeight = 0;
  let vegetationWeight = 0;
  let gradientTotal = 0;
  let lowerBluePixels = 0;
  let lowerPixels = 0;
  let lowerBrightness = 0;
  let topBluePixels = 0;
  let topPixels = 0;
  let topBrightness = 0;
  let topGradient = 0;
  let motionTotal = 0;
  let motionPixels = 0;

  for (let y = 0; y < height; y += 1) {
    let currentRun = 0;
    let longestRun = 0;

    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const index = pixel * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const saturation = maximum > 0 ? (maximum - minimum) / maximum : 0;
      const brightness = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      luma[pixel] = brightness;

      const leftDifference = x > 0 ? colorDistance(data, index, index - 4) : 0;
      const upperDifference = y > 0 ? colorDistance(data, index, index - width * 4) : leftDifference;
      const gradient = (leftDifference + upperDifference) / 2;

      const blueCyan = blue > 48 && blue > red * 0.94 && blue > green * 0.78 && blue - red > 4;
      const teal = green > 45 && blue > 42 && green > red * 1.03 && blue > red * 1.02 && Math.abs(green - blue) < 96;
      const highSaturationGreen = green > red * 1.18 && green > blue * 1.12 && saturation > 0.38;

      if (y < roiStart) {
        topPixels += 1;
        topBrightness += brightness;
        topGradient += gradient;
        if (blueCyan || teal) topBluePixels += 1;
        continue;
      }

      const row = y - roiStart;
      const depthWeight = 0.72 + (row / Math.max(1, roiRows - 1)) * 0.56;
      const smooth = leftDifference < 34 && upperDifference < 48;
      const horizontallyCoherent = leftDifference <= upperDifference * 1.28 + 5;
      const neutralReflection = saturation < 0.23 && brightness > 30 && brightness < 218 && smooth && horizontallyCoherent;
      const darkWater = brightness < 105 && blue >= red * 0.86 && green >= red * 0.88 && smooth;
      const earthyWater = red >= green && green > blue && red - blue < 72 && saturation < 0.48 && brightness < 180 && smooth && horizontallyCoherent;
      const colorWater = blueCyan || teal;
      const waterLike = colorWater
        ? brightness > 22 && brightness < 242 && (smooth || horizontallyCoherent || saturation < 0.72)
        : neutralReflection || darkWater || earthyWater;

      weightedPixels += depthWeight;
      lowerPixels += 1;
      lowerBrightness += brightness;
      gradientTotal += gradient;
      if (blueCyan || teal) lowerBluePixels += 1;
      if (highSaturationGreen) vegetationWeight += depthWeight;

      if (previousLuma?.length === pixelCount) {
        motionTotal += Math.abs(brightness - previousLuma[pixel]);
        motionPixels += 1;
      }

      if (waterLike) {
        waterWeight += depthWeight;
        rowWater[row] += 1;
        currentRun += 1;
        longestRun = Math.max(longestRun, currentRun);
        if (colorWater) colorWeight += depthWeight;
        if (horizontallyCoherent) horizontalWeight += depthWeight;
        if (smooth) smoothWeight += depthWeight;
      } else {
        currentRun = 0;
      }
    }

    if (y >= roiStart) rowLongestRun[y - roiStart] = longestRun;
  }

  const coverage = waterWeight / Math.max(1, weightedPixels);
  const colorCoverage = colorWeight / Math.max(1, weightedPixels);
  const horizontalScore = horizontalWeight / Math.max(1, waterWeight);
  const smoothScore = smoothWeight / Math.max(1, waterWeight);
  const vegetationRatio = vegetationWeight / Math.max(1, weightedPixels);
  const averageGradient = gradientTotal / Math.max(1, lowerPixels);
  const averageTopGradient = topGradient / Math.max(1, topPixels);
  const lowerBlueRatio = lowerBluePixels / Math.max(1, lowerPixels);
  const topBlueRatio = topBluePixels / Math.max(1, topPixels);
  const averageLowerBrightness = lowerBrightness / Math.max(1, lowerPixels);
  const averageTopBrightness = topBrightness / Math.max(1, topPixels);
  const averageMotion = motionTotal / Math.max(1, motionPixels);

  let broadRows = 0;
  let strongestRow = 0;
  let longestRunRatio = 0;
  for (let row = 0; row < roiRows; row += 1) {
    const rowRatio = rowWater[row] / width;
    strongestRow = Math.max(strongestRow, rowRatio);
    longestRunRatio = Math.max(longestRunRatio, rowLongestRun[row] / width);
    if (rowRatio >= 0.27) broadRows += 1;
  }
  const broadness = strongestRow * 0.54 + (broadRows / roiRows) * 0.46;

  let confidence =
    coverage * 0.38 +
    colorCoverage * 0.14 +
    broadness * 0.20 +
    longestRunRatio * 0.12 +
    horizontalScore * 0.10 +
    smoothScore * 0.06;

  const hasNaturalShimmer = averageMotion >= 1.4 && averageMotion <= 22;
  if (hasNaturalShimmer) confidence += 0.065;
  if (averageMotion > 42) confidence -= 0.14;
  if (averageGradient > 78) confidence -= 0.13;
  if (vegetationRatio > 0.3 && averageGradient > 28) confidence -= 0.2;

  const likelyOpenSky =
    topBlueRatio > 0.47 &&
    lowerBlueRatio > 0.42 &&
    averageTopGradient < 18 &&
    averageGradient < 24 &&
    averageTopBrightness >= averageLowerBrightness - 8;
  if (likelyOpenSky) confidence -= 0.55;

  const lacksSurfaceShape = broadness < 0.22 || longestRunRatio < 0.2;
  if (lacksSurfaceShape) confidence = Math.min(confidence, 0.28);
  if (coverage < 0.15) confidence = Math.min(confidence, 0.24);
  if (averageTopGradient < 5 && averageGradient < 5 && averageMotion < 1) confidence -= 0.12;

  return { confidence: clamp(confidence), luma };
}

function encodeConfidenceForLegacyScanner(image: ImageData, score: number) {
  const sampledPixels = Math.ceil(image.data.length / 16);
  const positivePixels = Math.round((clamp(score, 0, 100) / 100) * sampledPixels);

  for (let sample = 0; sample < sampledPixels; sample += 1) {
    const index = sample * 16;
    if (index + 2 >= image.data.length) break;
    if (sample < positivePixels) {
      image.data[index] = 22;
      image.data[index + 1] = 124;
      image.data[index + 2] = 176;
    } else {
      image.data[index] = 142;
      image.data[index + 1] = 96;
      image.data[index + 2] = 38;
    }
  }
}

export function WaterDetectionUpgrade() {
  useEffect(() => {
    const globalWindow = window as typeof window & Record<string, unknown>;
    if (globalWindow[INSTALL_FLAG]) return;
    globalWindow[INSTALL_FLAG] = true;

    const prototype = CanvasRenderingContext2D.prototype;
    const originalGetImageData = prototype.getImageData;

    prototype.getImageData = function enhancedGetImageData(
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      settings?: ImageDataSettings,
    ) {
      const image = originalGetImageData.call(this, sx, sy, sw, sh, settings);
      const canvas = this.canvas;

      if (sx !== 0 || sy !== 0 || sw !== 40 || sh !== 28 || canvas.width !== 40 || canvas.height !== 28) {
        return image;
      }

      const state = detectorState.get(canvas) || {
        ema: 0,
        stableFrames: 0,
        missFrames: 0,
        locked: false,
      };
      const analysis = analyzeFrame(image.data, sw, sh, state.previousLuma);
      const rawScore = analysis.confidence * 100;
      const alpha = rawScore > state.ema ? 0.34 : 0.2;
      state.ema += (rawScore - state.ema) * alpha;
      state.previousLuma = analysis.luma;

      if (!state.locked) {
        state.stableFrames = state.ema >= 46 ? state.stableFrames + 1 : 0;
        if (state.stableFrames >= 3) {
          state.locked = true;
          state.missFrames = 0;
        }
      } else {
        state.missFrames = state.ema < 32 ? state.missFrames + 1 : 0;
        if (state.missFrames >= 3) {
          state.locked = false;
          state.stableFrames = 0;
        }
      }

      detectorState.set(canvas, state);
      const displayedScore = state.locked ? Math.max(46, state.ema) : Math.min(41, state.ema);
      encodeConfidenceForLegacyScanner(image, displayedScore);
      return image;
    } as typeof prototype.getImageData;
  }, []);

  return null;
}
