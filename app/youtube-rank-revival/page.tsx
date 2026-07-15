import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";

import { ProductIntakeForm } from "@/components/product-intake-form";
import { retrieveCheckoutSession } from "@/lib/stripe";
import { YOUTUBE_OPS_PRODUCT_ID } from "@/lib/youtube-ops-integration";

const siteUrl = "https://illcoai.tech";
const canonicalUrl = `${siteUrl}/youtube-rank-revival`;
const checkoutHref = "/api/youtube-rank-revival/checkout";

export const metadata: Metadata = {
  title: "YouTube Rank Revival AI Pro | Revive One Existing Video for $50",
  description:
    "A $50 one-video YouTube optimization sprint with three title options, a rewritten description, keyword positioning, thumbnail direction, hook feedback, audience notes, a relaunch checklist, and one revision.",
  alternates: { canonical: canonicalUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Revive One Existing YouTube Video for $50",
    description: "A defined 24-72 hour optimization sprint for an underperforming YouTube upload.",
    url: canonicalUrl,
    type: "website",
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "YouTube Rank Revival AI Pro by ILLCO AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Rank Revival AI Pro",
    description: "One video. Seven defined optimization deliverables. $50 one time.",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
};

const deliverables = [
  {
    title: "Three title options",
    text: "Three distinct title directions built around search intent, clarity, and audience fit.",
    icon: Sparkles,
  },
  {
    title: "Rewritten description",
    text: "A publish-ready description with a stronger opening, topic context, calls to action, and metadata structure.",
    icon: FileText,
  },
  {
    title: "Keyword and topic positioning",
    text: "A focused primary topic, supporting phrases, and realistic positioning notes for the selected video.",
    icon: Search,
  },
  {
    title: "Thumbnail improvement direction",
    text: "A concise creative brief covering the visual promise, focal subject, contrast, text restraint, and mobile readability.",
    icon: ImageIcon,
  },
  {
    title: "Hook and first-30-seconds feedback",
    text: "Specific retention risks and recommended changes to the opening promise, pacing, context, and payoff.",
    icon: Video,
  },
  {
    title: "Audience targeting notes",
    text: "Who the video should serve, what problem it answers, and which adjacent viewer interests support discovery.",
    icon: Target,
  },
  {
    title: "Relaunch checklist",
    text: "A prioritized publishing and measurement plan for applying the changes without guessing what to do next.",
    icon: RefreshCcw,
  },
];

const faqs = [
  {
    question: "How many videos are included?",
    answer:
      "One existing public or unlisted YouTube video is included per $50 purchase. A buyer with multiple videos can submit and purchase one sprint for each selected video.",
  },
  {
    question: "What do I need to provide?",
    answer:
      "Provide the specific video URL, channel URL, target audience, primary goal, and any available YouTube Studio screenshots that show impressions, click-through rate, average view duration, traffic sources, or search terms. No password is requested.",
  },
  {
    question: "When is it delivered?",
    answer:
      "Delivery is targeted within 24-72 hours after verified payment and a complete intake are received. Missing URLs, unclear goals, or unavailable source material pause the delivery window until resolved.",
  },
  {
    question: "Are finished thumbnail files included?",
    answer:
      "The $50 sprint includes thumbnail improvement direction and a clear creative brief, not a finished thumbnail design. Any production work beyond the listed deliverables requires a separate written scope.",
  },
  {
    question: "Does this guarantee rankings or views?",
    answer:
      "No. The service guarantees the listed analysis and deliverables, not a ranking, view, subscriber, or revenue result. YouTube distribution depends on viewer response, topic demand, competition, channel history, and continued testing.",
  },
  {
    question: "Is a revision included?",
    answer:
      "Yes. One focused revision round is included when requested within seven days of delivery and limited to the original video, audience, and stated goal.",
  },
];

type PageProps = {
  searchParams: Promise<{ checkout?: string; session_id?: string; reason?: string }>;
};

async function verifyRankRevivalPayment(sessionId?: string) {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId || !normalizedSessionId.startsWith("cs_")) return false;

  try {
    const session = await retrieveCheckoutSession(normalizedSessionId);
    return (
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.metadata?.productId === YOUTUBE_OPS_PRODUCT_ID &&
      session.metadata?.offerId === "youtube-rank-revival-ai-pro" &&
      session.metadata?.amountCents === "5000" &&
      Boolean(session.metadata?.intakeId)
    );
  } catch {
    return false;
  }
}

export default async function YoutubeRankRevivalPage({ searchParams }: PageProps) {
  const { checkout, session_id: sessionId, reason } = await searchParams;
  const paymentVerified = checkout === "success" ? await verifyRankRevivalPayment(sessionId) : false;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        name: "YouTube Rank Revival AI Pro",
        description:
          "One-video YouTube optimization sprint with title options, description rewrite, topic positioning, thumbnail direction, hook feedback, audience notes, and a relaunch checklist.",
        brand: { "@type": "Brand", name: "ILLCO AI" },
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: "50",
          availability: "https://schema.org/InStock",
          url: canonicalUrl,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {paymentVerified ? (
        <div className="border-b border-emerald-300/20 bg-emerald-300/10 px-4 py-4 text-center text-sm font-medium text-emerald-50" role="status">
          Payment verified. The saved intake and Stripe purchase are linked; delivery can begin.
        </div>
      ) : null}
      {checkout === "success" && !paymentVerified ? (
        <div className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-4 text-center text-sm font-medium text-amber-50" role="status">
          Payment confirmation could not be verified yet. Check the Stripe receipt email or contact ILLCO before submitting another payment.
        </div>
      ) : null}
      {checkout === "cancelled" ? (
        <div className="border-b border-amber-300/20 bg-amber-300/10 px-4 py-4 text-center text-sm font-medium text-amber-50" role="status">
          Checkout was cancelled. No completed payment was confirmed; the saved intake remains available for a new checkout attempt.
        </div>
      ) : null}
      {checkout === "error" ? (
        <div className="border-b border-rose-300/20 bg-rose-300/10 px-4 py-4 text-center text-sm font-medium text-rose-50" role="alert">
          Checkout could not start{reason === "invalid-intake" ? " because the saved intake could not be verified" : ""}. Save the one-video intake below and try again.
        </div>
      ) : null}

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_16%_18%,rgba(92,241,255,0.16),transparent_31%),radial-gradient(circle_at_84%_14%,rgba(143,124,255,0.13),transparent_28%),linear-gradient(180deg,#070b12,#03050a)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Clock3 className="h-4 w-4" />
              Target delivery: 24-72 hours after verified payment and complete intake
            </div>
            <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Give one underperforming YouTube video a real relaunch plan.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              YouTube Rank Revival AI Pro is a defined one-video optimization sprint. You receive seven concrete deliverables,
              one revision round, and a prioritized checklist instead of a vague “SEO upgrade.”
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
              {[
                "$50 one-time",
                "One existing video",
                "Seven defined deliverables",
                "One revision within seven days",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#intake"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Start with the secure intake
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#deliverables"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-6 font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09]"
              >
                See the exact deliverables
              </a>
            </div>
          </div>

          <aside id="pricing" className="self-start rounded-2xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">One-video sprint</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-6xl font-semibold tracking-tight text-white">$50</span>
              <span className="pb-2 text-sm text-slate-400">one time</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">
              The checkout is a one-time payment for this exact package. It does not start the $99/month YouTube Ops Studio subscription.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              {[
                "Secure Stripe checkout",
                "No channel password required",
                "Payment linked to the selected-video intake",
                "One focused revision round",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <a
              href="#intake"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Save the one-video intake
              <ArrowRight className="h-5 w-5" />
            </a>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              The $50 checkout appears only after the intake backend issues a verified record ID, preventing anonymous or unlinked payments.
            </p>
          </aside>
        </div>
      </section>

      <section id="deliverables" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Exact scope</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Seven deliverables. No mystery box.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-400">
            Every delivery is organized so the channel owner can apply changes directly or hand the plan to an editor or thumbnail designer.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {deliverables.map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
          <article className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-6">
            <CheckCircle2 className="h-7 w-7 text-emerald-300" />
            <h3 className="mt-5 text-xl font-semibold">One revision round</h3>
            <p className="mt-3 text-sm leading-6 text-emerald-50/80">
              One focused revision requested within seven days is included when it stays within the original video, audience, and goal.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Sample delivery structure</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Know what the finished handoff looks like.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              This is the delivery format, not a fabricated customer result. Each recommendation must identify the evidence, the proposed change, and the metric to watch after relaunch.
            </p>
            <div className="mt-7 rounded-xl border border-amber-200/20 bg-amber-200/10 p-5 text-sm leading-6 text-amber-50">
              No guaranteed rankings, invented view lifts, or anonymous testimonials are used. A public case study is added only after a customer approves it and measured before-and-after data exists.
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                label: "Finding",
                value: "State the specific discovery, retention, packaging, or audience problem visible in the supplied video and data.",
                icon: Search,
              },
              {
                label: "Action",
                value: "Provide publish-ready copy or an exact creative direction the owner can apply without another strategy call.",
                icon: TrendingUp,
              },
              {
                label: "Measurement",
                value: "Name the metric and comparison window to watch after the relaunch, without promising a result.",
                icon: BarChart3,
              },
            ].map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <h3 className="font-semibold">{label}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Delivery path</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From selected video to relaunch in four controlled steps.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["1", "Save intake", "Submit one selected video, audience, goal, and available performance evidence."],
              ["2", "Purchase", "Use the linked one-time $50 Stripe checkout issued for that saved intake."],
              ["3", "Analysis and delivery", "ILLCO prepares the seven deliverables within the 24-72 hour target window after verified payment and complete intake."],
              ["4", "Apply and refine", "Use the relaunch checklist, then request the included revision within seven days if needed."],
            ].map(([number, title, text]) => (
              <article key={number} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 font-semibold text-slate-950">{number}</div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="intake" className="scroll-mt-28 border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Pre-purchase intake</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Submit the one video that matters most.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              The intake saves the selected video, audience, goal, available analytics, and timing in the ILLCO lead backend. No channel password is requested.
            </p>
            <div className="mt-7 grid gap-3 text-sm text-slate-300">
              {[
                "Choose one public or unlisted video",
                "Add YouTube Studio screenshots only when available",
                "State the actual audience and business goal",
                "Continue to the linked $50 checkout after saving",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ProductIntakeForm
            kind="youtube-revival"
            planId="youtube-rank-revival-ai-pro"
            productName="YouTube Rank Revival AI Pro"
            submitLabel="Save selected-video intake"
            checkoutHref={checkoutHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Frequently asked questions</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Clear scope before checkout.</h2>
        </div>
        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <details key={item.question} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 open:bg-white/[0.06]">
              <summary className="cursor-pointer list-none pr-8 text-lg font-semibold text-white">{item.question}</summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
