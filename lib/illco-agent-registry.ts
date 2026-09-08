export type IllcoAgentTarget = {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  mcpUrl?: string;
  widgetUrl?: string;
  launchHref: string;
  tools: string[];
  status: "live" | "partial" | "external";
};

const origin = "https://illcoai.tech";

export const illcoAgentTargets: IllcoAgentTarget[] = [
  {
    id: "autotube",
    name: "AutoTube",
    description: "Render branded videos, scene sequences, narration, and creator media workflows.",
    keywords: ["video", "autotube", "chase", "short", "reel", "render", "youtube", "footage", "narration", "montage"],
    mcpUrl: `${origin}/api/chatgpt/autotube/mcp`,
    widgetUrl: `${origin}/api/chatgpt/autotube/widget`,
    launchHref: "/autotube",
    tools: ["autotube_render_video", "autotube_openmontage_reference"],
    status: "live",
  },
  {
    id: "debate-intelligence",
    name: "Debate Intelligence",
    description: "Analyze debates, map arguments, transcribe media, fact-check claims, and open the evidence studio.",
    keywords: ["debate", "argument", "fact check", "fact-check", "claim", "transcript", "speaker", "evidence", "podcast"],
    mcpUrl: `${origin}/api/chatgpt/debate-intelligence/mcp`,
    widgetUrl: `${origin}/api/chatgpt/debate-intelligence/widget`,
    launchHref: "/tools/debate-intelligence",
    tools: [
      "create_debate_project",
      "analyze_debate_transcript",
      "fact_check_debate_claims",
      "render_debate_studio",
      "transcribe_debate_media",
      "run_debate_youtube_pipeline",
    ],
    status: "live",
  },
  {
    id: "lyric-video-forge",
    name: "Lyric Video Forge",
    description: "Transcribe songs, review timed lyrics, generate captions, plan visuals, and render lyric videos.",
    keywords: ["lyric", "lyrics", "song", "music video", "caption", "srt", "ass", "transcribe", "karaoke", "forge"],
    mcpUrl: `${origin}/api/chatgpt/lyric-video-forge/mcp`,
    widgetUrl: `${origin}/api/chatgpt/lyric-video-forge/widget`,
    launchHref: "/tools/lyric-video-forge",
    tools: [
      "lyric_video_forge_start",
      "lyric_video_forge_transcript_review",
      "lyric_video_forge_visual_plan",
      "lyric_video_forge_choose_stt_model",
      "lyric_video_forge_transcribe_audio",
      "lyric_video_forge_export_srt",
      "lyric_video_forge_export_ass",
      "lyric_video_forge_render_lyric_video",
    ],
    status: "live",
  },
  {
    id: "meme-forge",
    name: "Meme Forge",
    description: "Generate meme concepts and finished social image variants with monetization-aware quota handling.",
    keywords: ["meme", "viral image", "social image", "reaction image", "caption meme"],
    mcpUrl: `${origin}/api/chatgpt/meme-image-forge/mcp`,
    widgetUrl: `${origin}/api/chatgpt/meme-image-forge/widget`,
    launchHref: "/tools/meme-mcp-server",
    tools: ["generate_memes", "record_conversion", "get_rewarded_ad_offer", "get_monetization_status"],
    status: "live",
  },
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Turn a project intake into a validated command center, timeline, deliverables, roles, risks, and first-week plan.",
    keywords: ["project", "kickoff", "roadmap", "timeline", "deliverables", "contributors", "plan", "command center"],
    launchHref: "/commander",
    tools: ["build_project_kickoff"],
    status: "live",
  },
  {
    id: "voice",
    name: "AI Voice",
    description: "Create natural voiceovers and audio assets for production workflows.",
    keywords: ["voice", "voiceover", "tts", "speech", "audio", "narrator", "narration"],
    launchHref: "/tools",
    tools: ["create_audio"],
    status: "external",
  },
  {
    id: "transcription",
    name: "AccurateScribe",
    description: "Transcribe audio/video and generate subtitle deliverables.",
    keywords: ["transcribe", "transcription", "subtitle", "subtitles", "speech to text", "audio text"],
    launchHref: "/tools",
    tools: ["transcribe", "subtitle_generator", "get_transcription_result"],
    status: "external",
  },
  {
    id: "publishing",
    name: "Upload Post",
    description: "Publish, schedule, analyze, and manage social media content across connected channels.",
    keywords: ["publish", "post", "schedule post", "social", "instagram", "facebook", "linkedin", "reddit", "upload"],
    launchHref: "/tools",
    tools: ["upload_video", "upload_photos", "upload_text", "upload_document", "get_analytics"],
    status: "external",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Inspect, repair, update, and ship repositories, issues, pull requests, and workflows.",
    keywords: ["github", "repo", "repository", "code", "bug", "fix code", "pull request", "commit", "deploy"],
    launchHref: "/commander",
    tools: ["search", "fetch_file", "update_file", "create_pull_request", "fetch_workflow_run_jobs"],
    status: "external",
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Search and work across connected Docs, Sheets, Slides, and Drive files.",
    keywords: ["drive", "google doc", "google sheet", "slides", "document", "spreadsheet", "file"],
    launchHref: "/commander",
    tools: ["search", "get_document", "get_spreadsheet_range", "get_presentation", "upload_file"],
    status: "external",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search, create, update, and organize project knowledge, pages, databases, and sessions.",
    keywords: ["notion", "wiki", "database", "notes", "project docs", "knowledge base"],
    launchHref: "/commander",
    tools: ["search", "fetch", "notion_create_pages", "notion_update_page", "query_data_sources"],
    status: "external",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Plan, inspect, and operate Stripe integrations, products, prices, and payment flows.",
    keywords: ["stripe", "payment", "checkout", "subscription", "price", "billing", "revenue"],
    launchHref: "/commander",
    tools: ["stripe_implementation_planner", "stripe_api_search", "stripe_api_read", "stripe_api_write"],
    status: "external",
  },
  {
    id: "ads",
    name: "Ads Manager",
    description: "Manage ad accounts, campaigns, ad groups, creatives, conversion settings, and performance.",
    keywords: ["ads", "advertising", "campaign", "creative", "conversion", "ad group", "marketing"],
    launchHref: "/commander",
    tools: ["create_campaign", "create_ad_group", "create_ad", "get_campaign_insights", "get_conversion_insights"],
    status: "external",
  },
  {
    id: "heygen",
    name: "HeyGen",
    description: "Generate avatar video, lip sync, translations, clips, speech, voices, and other AI video assets.",
    keywords: ["heygen", "avatar", "lip sync", "lipsync", "translation video", "digital twin", "talking avatar"],
    launchHref: "/tools",
    tools: ["video_agent_generate", "create_lipsync", "create_video_from_avatar", "create_speech", "show_video"],
    status: "external",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function routeIllcoAgent(message: string) {
  const normalized = normalize(message);
  const ranked = illcoAgentTargets
    .map((target) => {
      let score = 0;
      const evidence: string[] = [];
      for (const keyword of target.keywords) {
        const normalizedKeyword = normalize(keyword);
        if (!normalizedKeyword || !normalized.includes(normalizedKeyword)) continue;
        score += normalizedKeyword.includes(" ") ? 8 : 5;
        evidence.push(`Matched ${keyword}`);
      }
      if (target.status === "live") score += 1;
      return { ...target, score, evidence };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const best = ranked[0];
  return {
    best,
    alternatives: ranked.slice(1, 4),
    all: ranked,
  };
}
