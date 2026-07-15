import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PhoneMissed,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ILLCO Lead Recovery System | Turn Missed Calls Into Booked Customers",
  description:
    "ILLCO AI installs a missed-call recovery system that texts leads immediately, qualifies them, books appointments, confirms attendance, and follows up automatically.",
  alternates: { canonical: "https://illcoai.tech/lead-rescue" },
  openGraph: {
    title: "Turn Missed Calls Into Booked Customers",
    description:
      "Instant text-back, qualification, booking, confirmation, and follow-up for service businesses.",
    url: "https://illcoai.tech/lead-rescue",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Turn Missed Calls Into Booked Customers",
    description:
      "ILLCO Lead Recovery System for service businesses that cannot afford to lose phone leads.",
  },
};

const included = [
  "Instant missed-call text-back",
  "Lead intake and qualification",
  "Appointment booking and confirmation",
  "Automated follow-up for unresponsive leads",
  "Owner alerts and lead-routing rules",
  "Launch testing, handoff, and optimization",
];

const steps = [
  {
    title: "A lead calls",
    text: "When your team cannot answer, the system detects the missed opportunity.",
    icon: PhoneMissed,
  },
  {
    title: "The lead gets a fast text",
    text: "A branded reply starts the conversation while the customer is still looking for help.",
    icon: MessageSquareText,
  },
  {
    title: "The system qualifies and books",
    text: "It gathers the right details, routes the lead, and moves qualified prospects toward an appointment.",
    icon: CalendarCheck2,
  },
];

const requestHref = "/?plan=lead-recovery-system&source=lead-rescue#request";

export default function LeadRescuePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "ILLCO Lead Recovery System",
    provider: {
      "@type": "Organization",
      name: "ILLCO AI",
      url: "https://illcoai.tech",
    },
    areaServed: "US",
    serviceType: "Missed-call recovery and appointment-booking automation",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "750",
      description: "$750 founding-client setup plus $199 monthly management.",
      availability: "https://schema.org/LimitedAvailability",
      url: "https://illcoai.tech/lead-rescue",
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(251,191,36,0.12),transparent_27%),linear-gradient(180deg,#070b12,#03050a)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Clock3 className="h-4 w-4" />
              Three founding-client installations available
            </div>
            <h1 className="mt-7 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Turn missed calls into booked customers.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              ILLCO Lead Recovery texts missed callers immediately, qualifies the opportunity,
              books appointments, confirms attendance, and follows up so valuable phone leads do
              not disappear into voicemail.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href={requestHref}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Reserve a founding-client setup
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href={requestHref}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-6 py-3.5 text-base font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09]"
              >
                Request the 2-minute demo
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> $750 setup
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> $199 monthly management
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Built for service businesses
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Workflow className="h-4 w-4" /> One complete recovery system
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop buying disconnected tools.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              This combines the lead intake, missed-call text-back, qualification, appointment
              booking, confirmation, and follow-up workflows into one managed installation.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-6">
            <h3 className="text-xl font-semibold">Included in the founding-client package</h3>
            <div className="mt-5 grid gap-3">
              {included.map((item) => (
                <div key={item} className="flex gap-3 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <ShieldCheck className="mx-auto h-9 w-9 text-cyan-300" />
        <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Start with the calls you are already paying to generate.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          The founding-client offer is limited to three installations at $750 setup and $199 per
          month for management and optimization.
        </p>
        <Link
          href={requestHref}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Claim a founding-client slot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </main>
  );
}
