import demoVideoSnapshot from "@/data/demo-videos.json";

export type DemoVideoRecord = {
  youtubeVideoId?: string | null;
  youtubeUrl?: string | null;
  embedUrl?: string | null;
  title?: string | null;
  resultProofYoutubeVideoId?: string | null;
  resultProofYoutubeUrl?: string | null;
  resultProofEmbedUrl?: string | null;
  resultProofTitle?: string | null;
  resultProofDurationSeconds?: number | null;
  resultProofSummary?: string | null;
  tutorialYoutubeVideoId?: string | null;
  tutorialYoutubeUrl?: string | null;
  tutorialEmbedUrl?: string | null;
  tutorialTitle?: string | null;
  tutorialDurationSeconds?: number | null;
  tutorialLocalVideoPath?: string | null;
  tutorialTranscriptPath?: string | null;
  tutorialCaptionPath?: string | null;
  tutorialManifestPath?: string | null;
  tutorialUpdatedAt?: string | null;
  tutorialIncludesCaptions?: boolean | null;
  tutorialIncludesHighlights?: boolean | null;
  tutorialIncludesNarration?: boolean | null;
  tutorialPacing?: string | null;
  tutorialSceneCount?: number | null;
  tutorialPacingFloorSeconds?: number | null;
  tutorialUploadState?: "pending-credentials" | "uploaded" | "failed" | null;
  tutorialUploadPendingReason?: string | null;
  tutorialUploadPendingAt?: string | null;
  tutorialUploadError?: string | null;
  tutorialUploadErrorAt?: string | null;
  twoMinuteProofLocalVideoPath?: string | null;
  twoMinuteProofLocalVideoBytes?: number | null;
  twoMinuteProofRecordedAt?: string | null;
  twoMinuteProofDurationSeconds?: number | null;
  twoMinuteProofSourceUrl?: string | null;
  twoMinuteProofStatus?: "recorded" | "uploaded" | "failed" | null;
  twoMinuteProofYoutubeVideoId?: string | null;
  twoMinuteProofYoutubeUrl?: string | null;
  twoMinuteProofEmbedUrl?: string | null;
  twoMinuteProofUploadState?: "pending-credentials" | "uploaded" | "failed" | null;
  twoMinuteProofUploadedAt?: string | null;
  twoMinuteProofUploadError?: string | null;
  twoMinuteProofUploadErrorAt?: string | null;
  twoMinuteProofReusedExisting?: boolean | null;
  twoMinuteProofAssembly?: string | null;
  source: "youtube-search" | "uploaded" | "manual";
  updatedAt: string;
};

type DemoVideoSnapshot = {
  generatedAt: string | null;
  projects: Record<string, DemoVideoRecord>;
};

export const demoVideos = demoVideoSnapshot as DemoVideoSnapshot;
export const minimumTutorialDurationSeconds = 120;

export type ShowcaseVideo = {
  youtubeVideoId: string;
  youtubeUrl: string;
  embedUrl: string;
  title: string;
  durationSeconds: number | null;
  mode: "route-proof" | "result-proof" | "full-walkthrough";
};

export type ProofState = {
  ready: boolean;
  label: string;
  detail: string;
  requiresResultProof: boolean;
  primaryVideo: ShowcaseVideo | null;
  quickDemoVideo: ShowcaseVideo | null;
  resultProofVideo: ShowcaseVideo | null;
  tutorialVideo: ShowcaseVideo | null;
};

export function getDemoVideo(projectId: string) {
  return demoVideos.projects[projectId] || null;
}

function buildVideo(
  youtubeVideoId: string,
  youtubeUrl: string | null | undefined,
  embedUrl: string,
  title: string,
  durationSeconds: number | null,
  mode: ShowcaseVideo["mode"],
) {
  return {
    youtubeVideoId,
    youtubeUrl: youtubeUrl || `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    embedUrl,
    title,
    durationSeconds,
    mode,
  } satisfies ShowcaseVideo;
}

function requiresResultProof(projectId: string) {
  return /mastering/.test(projectId);
}

export function getQuickDemoVideo(projectId: string) {
  const record = getDemoVideo(projectId);
  if (!record?.youtubeVideoId || !record.embedUrl) return null;

  return buildVideo(
    record.youtubeVideoId,
    record.youtubeUrl,
    record.embedUrl,
    record.title || "Preview clip",
    null,
    "route-proof",
  );
}

export function getResultProofVideo(projectId: string) {
  const record = getDemoVideo(projectId);
  if (!record?.resultProofYoutubeVideoId || !record.resultProofEmbedUrl) return null;

  return buildVideo(
    record.resultProofYoutubeVideoId,
    record.resultProofYoutubeUrl,
    record.resultProofEmbedUrl,
    record.resultProofTitle || record.title || "Result proof",
    record.resultProofDurationSeconds || null,
    "result-proof",
  );
}

export function isTutorialReady(record: DemoVideoRecord | null) {
  if (!record?.tutorialYoutubeVideoId || !record.tutorialEmbedUrl) return false;
  if (!record.tutorialIncludesCaptions || !record.tutorialIncludesHighlights || !record.tutorialIncludesNarration) {
    return false;
  }
  if (record.tutorialPacing !== "slow") return false;
  return (record.tutorialDurationSeconds || 0) >= minimumTutorialDurationSeconds;
}

export function getTutorialVideo(projectId: string) {
  const record = getDemoVideo(projectId);
  if (!isTutorialReady(record)) return null;

  return buildVideo(
    record.tutorialYoutubeVideoId as string,
    record.tutorialYoutubeUrl,
    record.tutorialEmbedUrl as string,
    record.tutorialTitle || record.title || "Full tutorial",
    record.tutorialDurationSeconds || null,
    "full-walkthrough",
  );
}

export function getTwoMinuteProofVideo(projectId: string) {
  const record = getDemoVideo(projectId);
  if (!record?.twoMinuteProofYoutubeVideoId || !record.twoMinuteProofEmbedUrl) return null;

  return buildVideo(
    record.twoMinuteProofYoutubeVideoId,
    record.twoMinuteProofYoutubeUrl,
    record.twoMinuteProofEmbedUrl,
    `${record.title || "Product"} two-minute proof`,
    record.twoMinuteProofDurationSeconds || null,
    "full-walkthrough",
  );
}

export function getProofState(projectId: string): ProofState {
  const quickDemoVideo = getQuickDemoVideo(projectId);
  const resultProofVideo = getResultProofVideo(projectId);
  const tutorialVideo = getTutorialVideo(projectId);
  const twoMinuteProofVideo = getTwoMinuteProofVideo(projectId);
  const needsResultProof = requiresResultProof(projectId);
  const record = getDemoVideo(projectId);

  if (projectId === "lyric-video-forge" && record?.twoMinuteProofSourceUrl) {
    return {
      ready: true,
      label: "Master lyric proof ready",
      detail: record.resultProofSummary || "Shows a finished master lyric video output from the Forge lane.",
      requiresResultProof: false,
      primaryVideo: twoMinuteProofVideo || quickDemoVideo || tutorialVideo,
      quickDemoVideo,
      resultProofVideo,
      tutorialVideo: tutorialVideo || twoMinuteProofVideo,
    };
  }

  if (needsResultProof) {
    if (resultProofVideo) {
      return {
        ready: true,
        label: "Result proof ready",
        detail: "Shows the app producing the promised output, not just the route shell.",
        requiresResultProof: true,
        primaryVideo: resultProofVideo,
        quickDemoVideo,
        resultProofVideo,
        tutorialVideo: tutorialVideo || twoMinuteProofVideo,
      };
    }

    return {
      ready: false,
      label: quickDemoVideo || tutorialVideo || twoMinuteProofVideo ? "Result proof pending" : "Proof pending",
      detail: "Mastering apps must show a source song and the mastered output before they count as public proof.",
      requiresResultProof: true,
      primaryVideo: tutorialVideo || twoMinuteProofVideo || quickDemoVideo,
      quickDemoVideo,
      resultProofVideo,
      tutorialVideo: tutorialVideo || twoMinuteProofVideo,
    };
  }

  if (twoMinuteProofVideo) {
    return {
      ready: true,
      label: "Two-minute proof ready",
      detail: "Shows the system being used for a real workflow instead of only previewing the route shell.",
      requiresResultProof: false,
      primaryVideo: twoMinuteProofVideo,
      quickDemoVideo,
      resultProofVideo,
      tutorialVideo: tutorialVideo || twoMinuteProofVideo,
    };
  }

  if (tutorialVideo) {
    return {
      ready: true,
      label: "Tutorial ready",
      detail: "Full tutorial has been uploaded with narration, captions, highlights, and slow pacing.",
      requiresResultProof: false,
      primaryVideo: tutorialVideo,
      quickDemoVideo,
      resultProofVideo,
      tutorialVideo,
    };
  }

  if (quickDemoVideo) {
    return {
      ready: false,
      label: "Preview available",
      detail: "This is a preview clip, not proof of a finished working output. Request live proof before buying.",
      requiresResultProof: false,
      primaryVideo: quickDemoVideo,
      quickDemoVideo,
      resultProofVideo,
      tutorialVideo,
    };
  }

  return {
    ready: false,
    label: "Tutorial pending",
    detail: "Full tutorial has not been uploaded yet.",
    requiresResultProof: false,
    primaryVideo: null,
    quickDemoVideo,
    resultProofVideo,
    tutorialVideo,
  };
}

export function getPreferredShowcaseVideo(projectId: string) {
  return getProofState(projectId).primaryVideo;
}
