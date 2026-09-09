import assert from "node:assert/strict";
import test from "node:test";

import { analyzeFrame } from "../app/apps/reelworld-go/water-detection-upgrade";

const WIDTH = 40;
const HEIGHT = 28;
const WATER_THRESHOLD = 0.46;

type RGB = readonly [number, number, number];

type BenchmarkCase = {
  name: string;
  expectedWater: boolean;
  frame: Uint8ClampedArray;
  previous?: Uint8ClampedArray;
};

function makeFrame(pixel: (x: number, y: number) => RGB) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const [red, green, blue] = pixel(x, y);
      const offset = (y * WIDTH + x) * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function waterScene(base: RGB, amplitude = 18, phase = 0) {
  return makeFrame((x, y) => {
    if (y < 10) return [122, 96, 70];
    const ripple = ((y + phase) % 4 < 2 ? amplitude : -amplitude) + ((x + phase) % 9 === 0 ? 5 : 0);
    return [
      Math.max(0, Math.min(255, base[0] + ripple)),
      Math.max(0, Math.min(255, base[1] + ripple)),
      Math.max(0, Math.min(255, base[2] + ripple)),
    ];
  });
}

function lumaOf(frame: Uint8ClampedArray) {
  return analyzeFrame(frame, WIDTH, HEIGHT).luma;
}

function reachesProductionLock(frames: Uint8ClampedArray[]) {
  let ema = 0;
  let stableFrames = 0;
  let previousLuma: Float32Array | undefined;
  for (const frame of frames) {
    const analysis = analyzeFrame(frame, WIDTH, HEIGHT, previousLuma);
    const rawScore = analysis.confidence * 100;
    const alpha = rawScore > ema ? 0.34 : 0.2;
    ema += (rawScore - ema) * alpha;
    previousLuma = analysis.luma;
    stableFrames = ema >= 46 ? stableFrames + 1 : 0;
    if (stableFrames >= 3) return true;
  }
  return false;
}

const neutralPrevious = waterScene([128, 132, 136], 12, 0);
const neutralCurrent = waterScene([134, 138, 142], 12, 1);

const cases: BenchmarkCase[] = [
  { name: "deep-blue rippled water", expectedWater: true, frame: waterScene([42, 98, 162], 18) },
  { name: "cyan/teal rippled water", expectedWater: true, frame: waterScene([42, 132, 158], 17) },
  { name: "muddy earthy rippled water", expectedWater: true, frame: waterScene([128, 112, 86], 14) },
  { name: "neutral reflective water with temporal shimmer", expectedWater: true, frame: neutralCurrent, previous: neutralPrevious },
  { name: "dark textured water", expectedWater: true, frame: waterScene([48, 62, 78], 13) },
  { name: "uniform gray wall", expectedWater: false, frame: makeFrame(() => [132, 132, 132]) },
  { name: "uniform blue painted wall", expectedWater: false, frame: makeFrame(() => [54, 112, 178]) },
  { name: "open blue sky", expectedWater: false, frame: makeFrame((x, y) => [76 + (y % 2), 142 + (x % 2), 206]) },
  {
    name: "dense green vegetation texture",
    expectedWater: false,
    frame: makeFrame((x, y) => ((x + y) % 2 === 0 ? [32, 148, 48] : [86, 196, 62])),
  },
  {
    name: "brown dirt/floor texture",
    expectedWater: false,
    frame: makeFrame((x, y) => ((x + y) % 2 === 0 ? [136, 88, 48] : [78, 50, 28])),
  },
];

test("ReelWorld Water Scan classifies at least 9/10 deterministic benchmark scenes", () => {
  const results = cases.map((benchmark) => {
    const previousLuma = benchmark.previous ? lumaOf(benchmark.previous) : undefined;
    const confidence = analyzeFrame(benchmark.frame, WIDTH, HEIGHT, previousLuma).confidence;
    const predictedWater = confidence >= WATER_THRESHOLD;
    return { ...benchmark, confidence, predictedWater, pass: predictedWater === benchmark.expectedWater };
  });

  const passed = results.filter((result) => result.pass).length;
  const falsePositives = results.filter((result) => !result.expectedWater && result.predictedWater).length;
  const falseNegatives = results.filter((result) => result.expectedWater && !result.predictedWater).length;

  for (const result of results) {
    console.log(`[water-scan] ${result.pass ? "PASS" : "FAIL"} ${result.name}: confidence=${result.confidence.toFixed(3)} expected=${result.expectedWater ? "water" : "non-water"}`);
  }
  console.log(`[water-scan] score=${passed}/10 falsePositives=${falsePositives} falseNegatives=${falseNegatives}`);

  assert.ok(passed >= 9, `Water Scan benchmark must reach >=9/10; got ${passed}/10`);
  assert.equal(falsePositives, 0, `Hard-negative benchmark must have zero false positives; got ${falsePositives}`);
});

test("static flat-surface guard suppresses the known neutral-wall false positive", () => {
  const wall = makeFrame(() => [132, 132, 132]);
  const confidence = analyzeFrame(wall, WIDTH, HEIGHT).confidence;
  assert.ok(confidence <= 0.3, `Expected static wall confidence <=0.30; got ${confidence.toFixed(3)}`);
});

test("uniform flickering walls never acquire the production three-frame lock", () => {
  const grayFrames = Array.from({ length: 14 }, (_, index) =>
    makeFrame(() => (index % 2 === 0 ? [132, 132, 132] : [130, 130, 130])),
  );
  const blueFrames = Array.from({ length: 14 }, (_, index) =>
    makeFrame(() => (index % 2 === 0 ? [54, 112, 178] : [52, 110, 176])),
  );

  assert.equal(reachesProductionLock(grayFrames), false, "Flickering gray wall must never lock as water");
  assert.equal(reachesProductionLock(blueFrames), false, "Flickering blue wall must never lock as water");
});
