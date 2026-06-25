import assert from "node:assert/strict";
import test from "node:test";

import { getPreferredShowcaseVideo, getProofState, getTutorialVideo, getTwoMinuteProofVideo } from "../lib/demo-videos";

test("full tutorials are preferred over proof clips for public demos", () => {
  const video = getPreferredShowcaseVideo("uap-ai-lab");
  const proof = getProofState("uap-ai-lab");

  assert.ok(video);
  assert.equal(video.mode, "full-walkthrough");
  assert.equal(proof.ready, true);
  assert.equal(proof.label, "Tutorial ready");
  assert.ok(getTutorialVideo("uap-ai-lab"));
});

test("mastering products prefer real result proof output when it exists", () => {
  const proof = getProofState("mastering-studio-platform");

  assert.equal(proof.requiresResultProof, true);
  assert.equal(proof.ready, true);
  assert.equal(proof.label, "Result proof ready");
  assert.equal(proof.primaryVideo?.mode, "result-proof");
});

test("products without uploaded public video proof stay pending", () => {
  const proof = getProofState("why-not-me-ai");

  assert.equal(proof.ready, false);
  assert.equal(proof.label, "Tutorial pending");
  assert.equal(proof.primaryVideo, null);
});

test("uploaded two-minute product proof counts as walkthrough proof", () => {
  const proofVideo = getTwoMinuteProofVideo("think-for-me-mode");
  assert.ok(proofVideo);
  assert.equal(proofVideo.mode, "full-walkthrough");
  assert.equal(proofVideo.durationSeconds, 120);

  const proof = getProofState("think-for-me-mode");
  assert.equal(proof.ready, true);
  assert.equal(proof.label, "Two-minute proof ready");
  assert.equal(getPreferredShowcaseVideo("think-for-me-mode")?.youtubeVideoId, proofVideo.youtubeVideoId);
});
