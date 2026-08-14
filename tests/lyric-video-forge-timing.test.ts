import assert from "node:assert/strict";
import test from "node:test";

import { alignTranscriptToWordTimestamps } from "../lib/lyric-timing";

test("keeps accurate transcript words while inheriting Whisper timestamps", () => {
  const result = alignTranscriptToWordTimestamps("I made the static sing", [
    { word: "I", start: 1, end: 1.1 },
    { word: "made", start: 1.12, end: 1.35 },
    { word: "static", start: 1.7, end: 2.05 },
    { word: "sing", start: 2.1, end: 2.4 },
  ]);

  assert.deepEqual(result.words.map((word) => word.word), ["I", "made", "the", "static", "sing"]);
  assert.equal(result.words[0].start, 1);
  assert.equal(result.words[3].start, 1.7);
  assert.equal(result.words[4].end, 2.4);
  assert.ok(result.coverage >= 0.8);
});

test("returns monotonic positive word ranges", () => {
  const result = alignTranscriptToWordTimestamps("new exact words right here", [
    { word: "new", start: 4, end: 4.2 },
    { word: "words", start: 4.7, end: 4.9 },
    { word: "here", start: 5.4, end: 5.7 },
  ]);

  for (let index = 0; index < result.words.length; index += 1) {
    const word = result.words[index];
    assert.ok(word.end > word.start);
    if (index > 0) assert.ok(word.start >= result.words[index - 1].end);
  }
});

test("does not invent a timeline when no timestamp pass exists", () => {
  const result = alignTranscriptToWordTimestamps("lyrics without timing", []);
  assert.deepEqual(result.words, []);
  assert.equal(result.coverage, 0);
});
