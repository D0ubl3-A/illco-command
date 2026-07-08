import { linkedArticlePosts } from "./linked-article-posts";

export const blogSiteUrl = "https://illcoai.tech";

export type BlogSource = {
  label: string;
  href: string;
};

export type BlogLink = {
  label: string;
  href: string;
  description: string;
};

export type BlogSection = {
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  serpIntent: string;
  rankAngle: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  heroMetrics: string[];
  takeaways: string[];
  sections: BlogSection[];
  workflow?: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  internalLinks: BlogLink[];
  sources: BlogSource[];
};

const sharedSources = {
  openaiDocs: {
    label: "OpenAI API documentation",
    href: "https://platform.openai.com/docs",
  },
  notionAutomations: {
    label: "Notion automation guides",
    href: "https://www.notion.com/help/guides/category/automations",
  },
  zapierAiTools: {
    label: "Zapier AI productivity tool categories",
    href: "https://zapier.com/blog/best-ai-productivity-tools/",
  },
  sbeCouncilTools: {
    label: "Small Business & Entrepreneurship Council AI tool guidance",
    href: "https://sbecouncil.org/2026/04/25/the-ai-tools-small-businesses-are-using/",
  },
  arsumPricing: {
    label: "AI automation agency pricing guide",
    href: "https://arsum.com/blog/posts/ai-automation-agency-pricing/",
  },
  deployLabsCost: {
    label: "AI automation cost examples",
    href: "https://deploylabs.ca/blog/how-much-does-ai-automation-cost",
  },
};

export const blogPosts: BlogPost[] = [
  {
    slug: "best-ai-automation-tools-for-small-business",
    title: "Best AI Automation Tools for Small Business in 2026: What to Use First",
    description:
      "A practical buyer guide for small businesses choosing AI automation tools, agents, workflow builders, Notion systems, and content operations without buying a bloated stack.",
    category: "AI Automation",
    audience: "Small business owners, operators, creators, and lean teams",
    primaryKeyword: "AI automation tools for small business",
    secondaryKeywords: ["best AI automation tools 2026", "small business AI workflow", "AI agent tools for business"],
    serpIntent:
      "Searchers want a clear shortlist, but the current first page is crowded with generic top-ten lists and affiliate-style summaries.",
    rankAngle:
      "This article ranks by giving the missing decision framework: which workflow to automate first, when to use no-code tools, when to use a custom agent, and how to avoid stack sprawl.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 11,
    heroMetrics: ["6 workflows", "3 stack levels", "1 buying order"],
    takeaways: [
      "Start with one money-adjacent workflow: lead capture, follow-up, content production, scheduling, reporting, or customer support.",
      "Use platform AI when the workflow stays inside one app, workflow automation when two or more apps coordinate, and custom agents when judgment or routing matters.",
      "The best stack is the one your team can maintain weekly, not the one with the longest feature list.",
      "Every AI workflow needs a human review point, an error path, and a way to measure time saved or revenue protected.",
    ],
    sections: [
      {
        eyebrow: "SERP Gap",
        heading: "Most tool lists skip the real buying question",
        paragraphs: [
          "Search results for AI automation tools are full of names, but they rarely answer the hard question: which workflow should be automated first in a real business?",
          "Small teams do not need a giant stack on day one. They need one workflow tied to money, response speed, or weekly output.",
        ],
      },
      {
        eyebrow: "Workflow Priority",
        heading: "The six small-business workflows worth automating first",
        paragraphs: [
          "Lead intake, follow-up, content operations, support, reporting, and project handoff are the repeatable lanes that usually matter most.",
        ],
        bullets: [
          "Lead intake: form, qualification, CRM record, owner notification.",
          "Follow-up: email, SMS, missed-call response, consultation recap.",
          "Content operations: briefs, drafts, edits, assets, publishing handoff.",
          "Support: knowledge-base search, draft response, escalation routing.",
        ],
      },
      {
        eyebrow: "ILLCO Fit",
        heading: "Where ILLCO Command fits in the stack",
        paragraphs: [
          "ILLCO Command should not try to rank as another generic AI tool directory. The stronger position is implementation: AI automation systems for creators, service businesses, and small teams that need working routes, not scattered software advice.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the best AI automation tool for a small business?",
        answer:
          "The best tool depends on the first workflow. Use app-native AI for single-app tasks, workflow automation for cross-app handoffs, and a custom AI agent when the process needs routing or business-specific context.",
      },
    ],
    internalLinks: [
      {
        label: "AI automation agency pricing",
        href: "/blog/ai-automation-agency-pricing-small-business",
        description: "Use this next if the buyer is comparing setup fees and retainers.",
      },
      {
        label: "AI Companion: Command Routing",
        href: "/apps/ai-companion-command-routing",
        description: "Connects the article to the ILLCO command-layer product page.",
      },
    ],
    sources: [sharedSources.zapierAiTools, sharedSources.sbeCouncilTools, sharedSources.notionAutomations],
  },
  {
    slug: "ai-automation-agency-pricing-small-business",
    title: "AI Automation Agency Pricing for Small Businesses: What Agencies Don’t Tell You",
    description:
      "A buyer-focused pricing guide for small businesses comparing AI automation agencies, consultants, custom agents, and workflow retainers without overpaying for a demo.",
    category: "Pricing",
    audience: "Small business owners comparing AI automation services",
    primaryKeyword: "AI automation agency pricing",
    secondaryKeywords: ["AI automation consultant pricing", "AI automation services cost", "AI workflow retainer"],
    serpIntent:
      "Searchers are budget-aware and need ranges, scope boundaries, questions to ask, and a way to separate cheap demos from maintained systems.",
    rankAngle:
      "This article wins by explaining pricing in buyer language: setup, monthly support, custom agent scope, hidden maintenance, and proof requirements.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 10,
    heroMetrics: ["4 pricing models", "12 buyer questions", "0 demo-only builds"],
    takeaways: [
      "Pricing is driven by workflow complexity, integrations, data quality, approval needs, and maintenance responsibility.",
      "Small projects can be priced as setup work, but business-critical automations need monitoring, iteration, and a monthly owner.",
      "The cheapest quote is risky if it does not include testing with real records, failure handling, documentation, and handoff.",
    ],
    sections: [
      {
        eyebrow: "Buyer Intent",
        heading: "Pricing only makes sense after the workflow is defined",
        paragraphs: [
          "The phrase AI automation agency pricing covers too many things: a missed-call text back, a Notion CRM build, a content workflow, a custom agent, or a multi-app operating system.",
        ],
      },
      {
        eyebrow: "Pricing Models",
        heading: "The four common ways AI automation work is priced",
        paragraphs: [
          "The main models are one-time setup, setup plus support, packaged system, and custom agent build.",
        ],
      },
    ],
    faqs: [
      {
        question: "Why do AI automation projects vary so much in price?",
        answer:
          "Because the cost is mostly driven by the number of integrations, the messiness of the source data, the need for review, and how much maintenance the system will need after launch.",
      },
    ],
    internalLinks: [
      {
        label: "Best AI automation tools",
        href: "/blog/best-ai-automation-tools-for-small-business",
        description: "Returns readers to the main buying framework.",
      },
      {
        label: "Custom AI agent for small business",
        href: "/blog/custom-ai-agent-small-business",
        description: "Explains when a workflow should become a custom agent.",
      },
    ],
    sources: [sharedSources.arsumPricing, sharedSources.deployLabsCost],
  },
  {
    slug: "custom-ai-agent-small-business",
    title: "Custom AI Agent for Small Business: When It Beats Another Tool",
    description:
      "A practical guide for deciding when a custom AI agent is worth building, what it should own, and how to keep it safe and maintainable.",
    category: "AI Agents",
    audience: "Founders, operators, and service businesses",
    primaryKeyword: "custom AI agent for small business",
    secondaryKeywords: ["AI agent workflow", "custom business agent", "AI routing system"],
    serpIntent:
      "Searchers are comparing generic tools versus something tailored to their process and want to know where custom work actually pays off.",
    rankAngle:
      "This article wins by showing the line between a chatbot, a workflow automation, and a true business agent with rules, memory, and outputs.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 9,
    heroMetrics: ["3 decision gates", "5 failure modes", "1 safe owner"],
    takeaways: [
      "Build an agent when the workflow needs classification, routing, summarization, or business-specific context.",
      "Do not use an agent as a source of truth; keep the source of truth in the database or system of record.",
    ],
    sections: [
      {
        eyebrow: "Decision Gate",
        heading: "Use a custom agent only when rules are not enough",
        paragraphs: [
          "A custom agent is worth building when the process needs judgment, routing, or a contextual response that a template cannot cover.",
        ],
      },
    ],
    faqs: [
      {
        question: "When should I not build a custom AI agent?",
        answer:
          "If the workflow is predictable, rule-based, or contained inside one app, use native AI or a workflow automation tool first.",
      },
    ],
    internalLinks: [
      {
        label: "AI automation pricing",
        href: "/blog/ai-automation-agency-pricing-small-business",
        description: "Helps buyers understand build scope and support pricing.",
      },
      {
        label: "AI lead follow-up automation",
        href: "/blog/ai-lead-follow-up-automation-small-business",
        description: "Shows a high-value workflow that can justify an agent layer.",
      },
    ],
    sources: [sharedSources.openaiDocs],
  },
  {
    slug: "notion-ai-automation-workflows-small-business",
    title: "Notion AI Automation Workflows for Small Business: The Command Workspace That Actually Gets Used",
    description:
      "A workflow guide for turning Notion into a command workspace with intake, task routing, approvals, and weekly reporting.",
    category: "Notion",
    audience: "Small businesses and operators using Notion as a hub",
    primaryKeyword: "Notion AI automation workflows",
    secondaryKeywords: ["Notion automation", "Notion CRM workflows", "Notion command workspace"],
    serpIntent: "Readers want a workspace system, not just a template gallery.",
    rankAngle: "The article focuses on repeatable workflows, not generic productivity advice.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 8,
    heroMetrics: ["5 workflow lanes", "4 review gates", "1 source of truth"],
    takeaways: [
      "Use Notion for the system of record and workflow visibility, not for everything.",
      "Automate intake, task creation, and weekly reporting first.",
    ],
    sections: [
      {
        eyebrow: "Workspace Design",
        heading: "A good Notion system shows who owns the next step",
        paragraphs: [
          "The workspace should make work visible: new leads, project steps, content drafts, approvals, and blocked tasks.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can Notion replace a CRM?",
        answer: "Yes, for small teams with disciplined data entry and a clear set of workflow fields.",
      },
    ],
    internalLinks: [
      {
        label: "Custom AI agent for small business",
        href: "/blog/custom-ai-agent-small-business",
        description: "Shows when the workspace should connect to an agent layer.",
      },
    ],
    sources: [sharedSources.notionAutomations],
  },
  {
    slug: "ai-content-production-workflow-creators",
    title: "AI Content Production Workflow for Creators: The System That Gets You Published",
    description:
      "A workflow guide for creators and small teams using AI to research topics, write briefs, produce video assets, route edits, and publish consistently.",
    category: "Creator Operations",
    audience: "Creators, creator-led businesses, agencies, and content teams",
    primaryKeyword: "AI content production workflow",
    secondaryKeywords: ["AI workflow for creators", "creator content automation", "AI video production workflow"],
    serpIntent: "Searchers want a production process, not just a list of content tools.",
    rankAngle: "This article wins by mapping AI content work to a real production board.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 10,
    heroMetrics: ["8 pipeline stages", "4 QC gates", "Weekly publishing rhythm"],
    takeaways: [
      "AI helps creators most when it is attached to a content pipeline, not used as a one-off prompt box.",
      "Separate research, scripting, asset production, editing, approval, publishing, and repurposing.",
    ],
    sections: [
      {
        eyebrow: "Pipeline",
        heading: "Creators need production systems, not prompt piles",
        paragraphs: [
          "A creator can generate ideas all day and still fail to publish. The bottleneck is the handoff between topic, angle, script, asset, edit, caption, and schedule.",
        ],
      },
    ],
    faqs: [
      {
        question: "What should an AI content workflow include?",
        answer: "It should include topic research, brief, script, source links, asset list, edit status, approval checklist, and publishing details.",
      },
    ],
    internalLinks: [
      {
        label: "YouTube Ops",
        href: "/apps/youtube-ops-vercel",
        description: "Routes creator-intent readers to the YouTube operations app.",
      },
    ],
    sources: [sharedSources.zapierAiTools, sharedSources.sbeCouncilTools],
  },
  {
    slug: "ai-lead-follow-up-automation-small-business",
    title: "AI Lead Follow-Up Automation for Small Business: Stop Losing Requests After the First Message",
    description:
      "A bottom-of-funnel guide to automating lead response, missed-call follow-up, consultation recaps, CRM updates, and owner notifications with human-safe AI.",
    category: "Lead Automation",
    audience: "Service businesses, local businesses, consultants, and agencies",
    primaryKeyword: "AI lead follow up automation",
    secondaryKeywords: ["missed call text back AI automation", "small business lead follow up", "lead response automation"],
    serpIntent: "Searchers have urgent revenue leakage and need a clear workflow.",
    rankAngle: "This article wins by giving a concrete lead follow-up system with message logic and metrics.",
    publishedAt: "2026-06-12",
    updatedAt: "2026-06-12",
    readingMinutes: 9,
    heroMetrics: ["5-minute response goal", "6 follow-up events", "CRM-first workflow"],
    takeaways: [
      "Lead follow-up automation should start with speed, source tracking, qualification, and a clear next action.",
      "AI is useful for summarizing requests, drafting replies, classifying urgency, and routing leads to the right offer.",
    ],
    sections: [
      {
        eyebrow: "Revenue Leak",
        heading: "The first follow-up is usually where small businesses lose money",
        paragraphs: [
          "A form submission, missed call, DM, email, or checkout question can go cold quickly if the owner is busy delivering work.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is AI lead follow-up automation?",
        answer: "It is a workflow that captures a lead, summarizes the request, classifies urgency or fit, creates a CRM record, and drafts or sends the next message.",
      },
    ],
    internalLinks: [
      {
        label: "AI automation agency pricing",
        href: "/blog/ai-automation-agency-pricing-small-business",
        description: "Helps buyers understand setup and support pricing.",
      },
    ],
    sources: [sharedSources.sbeCouncilTools, sharedSources.arsumPricing],
  },
  ...linkedArticlePosts,
];

export const featuredBlogPosts = blogPosts.slice(0, 3);

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) || null;
}

export function getRelatedPosts(post: BlogPost) {
  const linkedSlugs = new Set(
    post.internalLinks
      .map((link) => link.href.match(/^\/blog\/([^/]+)$/)?.[1])
      .filter((value): value is string => Boolean(value)),
  );

  const explicit = blogPosts.filter((candidate) => linkedSlugs.has(candidate.slug));
  const fallback = blogPosts.filter((candidate) => candidate.slug !== post.slug && !linkedSlugs.has(candidate.slug));

  return [...explicit, ...fallback].slice(0, 3);
}

export function headingId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
