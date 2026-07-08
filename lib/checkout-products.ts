export type CheckoutProductCategory =
  | "Command & AI Operators"
  | "Music & Audio"
  | "Video & Creator Growth"
  | "Sales & Lead Recovery"
  | "Workflow Automation"
  | "Voice & Memory"
  | "Commerce & Stores"
  | "App Conversion";

export type CheckoutProduct = {
  id: string;
  appProductId: string;
  name: string;
  category: CheckoutProductCategory;
  summary: string;
};

export const checkoutProducts = [
  {
    id: "ai-music-mastering-pro",
    appProductId: "mastering-studio-platform",
    name: "AI Music Mastering Pro",
    category: "Music & Audio",
    summary: "Polished AI-assisted mastering path for artists who need cleaner, release-ready audio.",
  },
  {
    id: "cinematic-ai-music-video-production",
    appProductId: "illco-ai-video",
    name: "Cinematic AI Music Video Production",
    category: "Video & Creator Growth",
    summary: "Cinematic visual production package for turning songs into finished AI music video assets.",
  },
  {
    id: "full-hd-lyric-videos",
    appProductId: "lyric-video-forge",
    name: "Full HD Lyric Videos",
    category: "Video & Creator Growth",
    summary: "1-day trial for up to 2 Full HD lyric videos, with synced lyrics, release-ready visuals, and ILLCOCOMMAND payment/access sync.",
  },
  {
    id: "youtube-rank-revival-ai-pro",
    appProductId: "youtube-ops-vercel",
    name: "YouTube Rank Revival AI Pro",
    category: "Video & Creator Growth",
    summary: "YouTube optimization workflow for reviving older uploads and improving content discoverability.",
  },
  {
    id: "instant-lead-rescue-text-back-ai",
    appProductId: "automateflow",
    name: "Instant Lead Rescue Text-Back AI",
    category: "Sales & Lead Recovery",
    summary: "Fast text-back assistant for businesses that need to recover missed or delayed leads.",
  },
  {
    id: "ai-workflow-mastery",
    appProductId: "think-for-me-mode",
    name: "AI Workflow Mastery",
    category: "Command & AI Operators",
    summary:
      "A repeatable AI operating system: command frameworks, prompt systems, decision frameworks, and execution SOPs that help you plan faster, decide better, and ship consistently.",
  },
  {
    id: "interactive-legacy-avatar-upgrade",
    appProductId: "voice-book-tool",
    name: "Interactive Legacy Avatar Upgrade",
    category: "Voice & Memory",
    summary: "Interactive avatar upgrade for preserving voice, story, and personality in a guided experience.",
  },
  {
    id: "testimonial-to-marketing-asset-generator",
    appProductId: "viral-stitch-ai",
    name: "Testimonial-to-Marketing Asset Generator",
    category: "Video & Creator Growth",
    summary: "Turns testimonials into usable marketing assets for proof-led offers and social campaigns.",
  },
  {
    id: "notion-research-clipper-ai-for-chrome",
    appProductId: "notion-webhook",
    name: "Notion Research Clipper AI for Chrome",
    category: "Workflow Automation",
    summary: "Chrome research capture flow for sending useful findings into a structured Notion system.",
  },
  {
    id: "linkedin-gmail-lead-sync-extension",
    appProductId: "automateflow",
    name: "LinkedIn & Gmail Lead Sync Extension",
    category: "Sales & Lead Recovery",
    summary: "Lead sync extension for moving LinkedIn and Gmail conversations into a cleaner follow-up lane.",
  },
  {
    id: "notion-meeting-notes-assistant",
    appProductId: "notion-webhook",
    name: "Notion Meeting Notes Assistant",
    category: "Workflow Automation",
    summary: "Meeting notes assistant for capturing decisions, follow-ups, and reusable Notion records.",
  },
  {
    id: "chrome-proposal-generator",
    appProductId: "automateflow",
    name: "Chrome Proposal Generator for Agencies & Freelancers",
    category: "Sales & Lead Recovery",
    summary: "Proposal generation extension for agencies and freelancers who need faster client-ready offers.",
  },
  {
    id: "voicematch-ai-reply-copilot",
    appProductId: "visual-voice-board",
    name: "VoiceMatch AI Reply Copilot for Gmail & LinkedIn",
    category: "Sales & Lead Recovery",
    summary: "Reply copilot for drafting responses that fit your voice across Gmail and LinkedIn.",
  },
  {
    id: "rap-lyric-generator",
    appProductId: "rap-lyric-generator",
    name: "Rap Lyric Generator",
    category: "Music & Audio",
    summary: "Creative lyric workflow for rapid rap writing, punchline ideas, and artist-style drafts.",
  },
  {
    id: "song-analyzer-deploy",
    appProductId: "songanalyzer-deploy",
    name: "Song Analyzer Deploy",
    category: "Music & Audio",
    summary: "Song analysis tool for reviewing structure, themes, and improvement opportunities.",
  },
  {
    id: "t-shirt-workshop-pro-pc",
    appProductId: "tshirtworkshop",
    name: "T-Shirt Workshop Pro for PC",
    category: "Commerce & Stores",
    summary: "PC workshop for designing and preparing T-shirt concepts for creator commerce.",
  },
  {
    id: "viral-stitch-ai",
    appProductId: "viral-stitch-ai",
    name: "Viral Stitch AI",
    category: "Video & Creator Growth",
    summary: "Short-form stitching workflow for turning creator clips into faster social variants.",
  },
  {
    id: "vocal-visualizer",
    appProductId: "visual-voice-board",
    name: "Vocal Visualizer",
    category: "Video & Creator Growth",
    summary: "Voice-reactive visual system for turning vocals, hooks, and spoken creator clips into branded motion assets.",
  },
  {
    id: "infinite-living-memory",
    appProductId: "voice-book-tool",
    name: "INFINITE Living Memory (Voice and Personality)",
    category: "Voice & Memory",
    summary: "Voice and personality memory package for preserving stories, tone, and guided conversations.",
  },
  {
    id: "voicebook-ai-studio",
    appProductId: "voice-book-tool",
    name: "VoiceBook OS",
    category: "Voice & Memory",
    summary: "Flagship voice-first content pipeline for turning spoken ideas into scripts, video concepts, shorts, captions, and memory-backed creator workflows.",
  },
  {
    id: "website-to-android-app-conversion",
    appProductId: "illcoappiverse",
    name: "Website-to-Android App Conversion",
    category: "App Conversion",
    summary: "Conversion package for turning an existing website into an Android app path.",
  },
  {
    id: "vault-select-exclusive-trap-beat",
    appProductId: "barz-web-studio",
    name: "Vault Select Exclusive Trap Beat",
    category: "Music & Audio",
    summary: "Exclusive trap beat checkout for artists who want a direct vault purchase path.",
  },
  {
    id: "barz-beat-shop",
    appProductId: "barz-web-studio",
    name: "Barz Beat Shop",
    category: "Music & Audio",
    summary: "Beat shop entry for artists browsing production-ready instrumentals, trap beats, and direct vault purchases.",
  },
  {
    id: "creator-crm-essentials",
    appProductId: "automateflow",
    name: "Creator CRM Essentials",
    category: "Sales & Lead Recovery",
    summary: "Creator CRM starter package for organizing contacts, follow-ups, and revenue opportunities.",
  },
] satisfies CheckoutProduct[];

export const checkoutProductCategories = [
  "Command & AI Operators",
  "Sales & Lead Recovery",
  "Workflow Automation",
  "Music & Audio",
  "Video & Creator Growth",
  "Commerce & Stores",
  "App Conversion",
  "Voice & Memory",
] satisfies CheckoutProductCategory[];

export const checkoutProductCategoryDetails: Record<CheckoutProductCategory, string> = {
  "Command & AI Operators":
    "Turn ChatGPT into your command center with proven AI operating systems for planning, decision-making, and repeatable execution.",
  "Sales & Lead Recovery": "Lead capture, reply, CRM, proposal, and follow-up products that protect revenue.",
  "Workflow Automation": "Research, meeting, Notion, and daily process tools that remove repeat work.",
  "Music & Audio": "Mastering, beat, lyric, and song tools for artists shipping release-ready work.",
  "Video & Creator Growth": "Short-form, testimonial, YouTube, lyric, and music video products for content momentum.",
  "Commerce & Stores": "Merch, store, and direct-purchase products for creator commerce.",
  "App Conversion": "Website-to-app conversion paths for turning an existing surface into an installable product.",
  "Voice & Memory": "Voice, legacy, personality, and audio memory products for personal or brand preservation.",
};
