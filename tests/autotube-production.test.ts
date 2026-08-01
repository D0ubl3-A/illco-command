import assert from "node:assert/strict";
import test from "node:test";

import {
  frameSize,
  normalizeAutoTubeRequest,
  permittedRemoteMediaUrl,
} from "../lib/autotube/contracts";
import {
  createArtifactToken,
  getAutoTubeConfigurationStatus,
  verifyArtifactToken,
} from "../lib/autotube/server";

test("AutoTube normalizes a prospect request into a complete production specification", () => {
  const request = normalizeAutoTubeRequest({
    prospect: "Dan's Tax LV",
    offer: "AI intake and appointment follow-up",
    pain_point: "after-hours callers wait until the office reopens",
    call_to_action: "Book a ten-minute workflow review.",
    duration_seconds: 118,
    brand_colors: ["#061A17", "#16E0A5"],
  });

  assert.equal(request.prospect, "Dan's Tax LV");
  assert.equal(request.durationSeconds, 118);
  assert.equal(request.aspectRatio, "landscape");
  assert.equal(request.scenes.length, 5);
  assert(request.narrationScript.includes("Dan's Tax LV"));
  assert.deepEqual(frameSize(request.aspectRatio), { width: 1920, height: 1080 });
});

test("AutoTube clamps unsafe dimensions and ignores invalid colors and media schemes", () => {
  const request = normalizeAutoTubeRequest({
    prospect: "Example",
    offer: "Example workflow",
    duration_seconds: 999,
    aspect_ratio: "unsupported",
    brand_colors: ["red", "javascript:alert(1)"],
    narration_audio_url: "file:///tmp/audio.mp3",
    scenes: [{ title: "One", on_screen_text: "Proof", image_url: "javascript:alert(1)" }],
  });

  assert.equal(request.durationSeconds, 120);
  assert.equal(request.aspectRatio, "landscape");
  assert.deepEqual(request.brandColors, ["#061A17", "#16E0A5"]);
  assert.equal(request.narrationAudioUrl, "");
  assert.equal(request.scenes[0]?.imageUrl, "");
});

test("AutoTube permits required production media hosts but blocks arbitrary hosts", () => {
  assert.equal(permittedRemoteMediaUrl("https://resource2.heygen.ai/audio/example.mp3"), true);
  assert.equal(permittedRemoteMediaUrl("https://files.oaiusercontent.com/video/example.mp4"), true);
  assert.equal(permittedRemoteMediaUrl("https://attacker.example/audio.mp3"), false);
  assert.equal(permittedRemoteMediaUrl("http://illcoai.tech/audio.mp3"), false);
  assert.equal(
    permittedRemoteMediaUrl("https://media.customer-cdn.example/audio.mp3", [
      "media.customer-cdn.example",
    ]),
    true,
  );
});

test("AutoTube artifact links are signed and expire", () => {
  const previous = process.env.AUTOTUBE_DOWNLOAD_SIGNING_SECRET;
  process.env.AUTOTUBE_DOWNLOAD_SIGNING_SECRET = "test-signing-secret-with-enough-entropy";
  try {
    const jobId = "job_123456789";
    const token = createArtifactToken(jobId, Date.now() + 60_000);
    assert.equal(verifyArtifactToken(jobId, token), true);
    assert.equal(verifyArtifactToken("job_different", token), false);

    const expired = createArtifactToken(jobId, Date.now() - 1);
    assert.equal(verifyArtifactToken(jobId, expired), false);
  } finally {
    if (previous === undefined) delete process.env.AUTOTUBE_DOWNLOAD_SIGNING_SECRET;
    else process.env.AUTOTUBE_DOWNLOAD_SIGNING_SECRET = previous;
  }
});

test("AutoTube health never reports configured without render, narration, and delivery secrets", () => {
  const names = [
    "AUTOTUBE_RENDER_SERVICE_URL",
    "AUTOTUBE_RENDER_SERVICE_TOKEN",
    "AUTOTUBE_DOWNLOAD_SIGNING_SECRET",
    "ELEVENLABS_API_KEY",
    "AUTOTUBE_ELEVENLABS_VOICE_ID",
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    assert.equal(getAutoTubeConfigurationStatus().configured, false);

    process.env.AUTOTUBE_RENDER_SERVICE_URL = "https://renderer.example/";
    process.env.AUTOTUBE_RENDER_SERVICE_TOKEN = "render-secret";
    process.env.AUTOTUBE_DOWNLOAD_SIGNING_SECRET = "download-secret";
    process.env.ELEVENLABS_API_KEY = "elevenlabs-secret";
    process.env.AUTOTUBE_ELEVENLABS_VOICE_ID = "voice-id";
    const status = getAutoTubeConfigurationStatus();
    assert.equal(status.configured, true);
    assert.equal(status.browserEncodingDisabled, true);
    assert.equal(status.output.container, "mp4");
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
