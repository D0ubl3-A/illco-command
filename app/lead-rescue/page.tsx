import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  PhoneMissed,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";

import { ProductIntakeForm } from "@/components/product-intake-form";
import { retrieveCheckoutSession } from "@/lib/stripe";

const siteUrl = "https://illcoai.tech";
const canonicalUrl = `${siteUrl}/lead-rescue`;
const checkoutHref = "/api/lead-recovery/checkout";

export const metadata: Metadata = {
  title: "ILLCO Lead Recovery System | Turn Missed Calls Into Booked Customers",
  description:
    "A managed missed-call recovery system for service businesses: immediate text-back, qualification, appointment booking, confirmation, follow-up, owner alerts, launch testing, and monthly optimization.",
  alternates: { canonical: canonicalUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Turn Missed Calls Into Booked Customers",
    description:
      "ILLCO installs and manages one complete missed-call recovery system for service businesses.",
    url: canonicalUrl,
    type: "website",
    images: [
      {
        url: "/media/illco-command-header-loop-poster.jpg",
        width: 1200,
        height: 630,
        alt: "ILLCO Lead Recovery System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ILLCO Lead Recovery System",
    description: "Immediate text-back, qualification, booking, confirmation, and follow-up in one managed installation.",
    images: ["/media/illco-command-header-loop-poster.jpg"],
  },
};

const included = [
  "Missed-call detection and immediate branded text-back",
  "Lead questions, qualification rules, and owner escalation",
  "Appointment booking, confirmation, and reminder flow",
  "Follow-up for leads who do not reply or book",
  "CRM or lead-sheet logging with owner notifications",
  "Launch test suite, handoff guide, and monthly optimization",
];

const launchSteps = [
  {
    day: "Day 1",
    title: "Intake and system map",
    text: "ILLCO confirms the phone, CRM, calendar, service area, qualification rules, escalation owner, and approved message language.",
  },
  {
    day: "Days 2-4",
    title: "Build and connect",
    text: "The missed-call trigger, text conversation, routing, booking, notifications, and lead record are connected in one managed path.",
  },
  {
    day: "Days 5-7",
    title: "Test and launch",
    text: "The system is tested against normal, duplicate, invalid, opt-out, after-hours, booking, and escalation scenarios before launch approval.",
  },
];

const monthlyMetrics = [
  "Median response time",
  "Missed callers contacted",
  "Two-way conversations",
  "Qualified opportunities",
  "Appointments booked",
  "Show rate and estimated recovered revenue",
];

const faqs = [
  {
    question: "What is the exact price?",
    answer:
      "The founding-client offer is $750 for setup and $199 per month for management and optimization. Any third-party phone, messaging, CRM, or calendar charges are disclosed before launch and remain separate unless the written proposal says otherwise.",
  },
  {
    question: "How quickly can it launch?",
    answer:
      "The target is seven business days after ILLCO receives the completed intake, approved message language, required access, and a working booking destination. Delays in access or approvals pause the timeline.",
  },
  {
    question: "Do I have to replace my current phone or CRM?",
    answer:
      "Not necessarily. ILLCO first maps the tools already in use and recommends the smallest reliable connection path. A replacement is proposed only when the current tool cannot support the required trigger, routing, or recordkeeping.",
  },
  {
    question: "Does ILLCO guarantee bookings or revenue?",
    answer:
      "No. ILLCO guarantees the documented installation, testing, reporting, and optimization work in the agreement. Customer demand, lead quality, offer strength, availability, and sales follow-through remain business variables.",
  },
  {
    question: "How are consent and opt-outs handled?",
    answer:
      "The launch test includes opt-out handling and approved message language. The business remains responsible for its industry, carrier, privacy, and marketing obligations, and should have counsel review requirements that apply to its use case.",
  },
];

type PageProps = {
  searchParams: Promise<{ checkout?: string; session_id?: string; reason?: string }>;
};

async function verifyLeadRecoveryPayment(sessionId?: string) {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId || !normalizedSessionId.startsWith("cs_")) return false;

  try {
    const session = await retrieveCheckoutSession(normalizedSessionId);
    return (
      session.mode === "subscription" &&
      session.payment_status === "paid" &&
      session.metadata?.productId === "lead-recovery-system" &&
      session.metadata?.offerId === "lead-recovery-system" &&
      session.metadata?.setupAmountCents === "75000" &&
      session.metadata?.recurringAmountCents === "19900" &&
      Boolean(session.metadata?.intakeId)
    );
  } catch {
    return false;
  }
}

export default async function LeadRescuePage({ searchParams }: PageProps) {
  const { checkout, session_id: sessionId, reason } = await searchParams;
  const paymentVerified = checkout === "success" ? await verifyLeadRecoveryPayment(sessionId) : false;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: "ILLCO Lead Recovery System",
        description:
          "Managed missed-call text-back, qualification, booking, confirmation, follow-up, routing, testing, reporting, and optimization for service businesses.",
        provider: {
          "@type": "Organization",
          name: "ILLCO AI",
          url: siteUrl,
        },
        areaServed: "US",
        serviceType: "Missed-call recovery and appointment-booking automation",
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: "750",
          description: "$750 setup plus $199 monthly management and optimization.",
          availability: "https://schema.org/LimitedAvailability",
          url: canonicalUrl,
          priceSpecification: [
            {
              "@type": "UnitPriceSpecification",
              name: "One-time setup",
              price: "750",
              priceCurrency: "USD",
              unitText: "installation",
            },
            {
              "@type": "UnitPriceSpecification",
              name: "Monthly management and optimization",
              price: "199",
              priceCurrency: "USD",
              unitCode: "MON",
              unitText: "month",
              billingDuration: 1,
            },
          ],
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
          Payment verified. The $750 setup and $199 monthly management subscription are linked to your saved intake.
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
          Checkout could not start{reason === "invalid-intake" ? " because the saved intake could not be verified" : ""}. Save the intake below and try again.
        </div>
      ) : null}

      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_82%_14%,rgba(251,191,36,0.12),transparent_27%),linear-gradient(180deg,#070b12,#03050a)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Clock3 className="h-4 w-4" />
              Three founding-client installations available
            </div>
            <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Turn missed calls into booked customers.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              ILLCO installs one managed recovery path that texts missed callers immediately, qualifies the opportunity,
              books appointments, confirms attendance, follows up, alerts the owner, and records the result.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Setup</div>
                <div className="mt-2 text-3xl font-semibold text-cyan-200">$750</div>
                <div className="mt-1 text-sm text-slate-400">One-time installation</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Management</div>
                <div className="mt-2 text-3xl font-semibold text-cyan-200">$199</div>
                <div className="mt-1 text-sm text-slate-400">Per month</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Target launch</div>
                <div className="mt-2 text-3xl font-semibold text-cyan-200">7 business days</div>
                <div className="mt-1 text-sm text-slate-400">After access and approval</div>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#intake"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Save intake and start checkout
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#workflow"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-6 font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09]"
              >
                View the 2-minute workflow
              </a>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">
              Built for service businesses that receive phone leads and already have a person, calendar, or team capable of handling booked work.
            </p>
          </div>

          <div id="pricing" className="self-start rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Exactly what is included</p>
            <div className="mt-5 grid gap-4">
              {included.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-xl border border-amber-200/20 bg-amber-200/10 p-4 text-sm leading-6 text-amber-50">
              Checkout charges the listed $750 setup on the first invoice and starts the $199 monthly management subscription. Third-party vendor charges remain separate and are disclosed during onboarding.
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">2-minute workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One missed call. One controlled recovery path.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-400">
            The demonstration below shows the exact operating sequence the installation must pass before launch.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {[
            {
              title: "1. Missed call detected",
              text: "The trigger records the caller, time, source, and routing context without waiting for voicemail review.",
              icon: PhoneMissed,
            },
            {
              title: "2. Branded text sent",
              text: "The caller receives approved language, identifies the business, and gets a clear next step while intent is still active.",
              icon: MessageSquareText,
            },
            {
              title: "3. Lead qualified and booked",
              text: "The workflow asks only required questions, routes exceptions to a person, and offers the correct booking destination.",
              icon: CalendarCheck2,
            },
            {
              title: "4. Owner and record updated",
              text: "The conversation, qualification status, appointment, and escalation state are logged and surfaced to the owner.",
              icon: Workflow,
            },
          ].map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-7 w-7 text-cyan-300" />
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Launch acceptance standard</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Proof is a test record, not a promise.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                A founding-client installation is not marked launched until the critical path is tested and the owner receives the results.
                No fabricated customer numbers or anonymous testimonials are used as proof.
              </p>
              <div className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm leading-6 text-emerald-50">
                The public case study is published only after a client approves attribution and at least 30 days of measured production data exists.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "20 consecutive end-to-end test calls complete without an unhandled error",
                "Text-back is recorded within 30 seconds under the agreed production conditions",
                "Lead details, qualification state, and source are stored correctly",
                "Booking, confirmation, owner alert, escalation, and opt-out paths pass",
                "Duplicate and invalid-number handling do not create uncontrolled follow-up",
                "Owner receives the launch report, workflow map, and support route",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-300">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Onboarding and delivery</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A visible seven-business-day installation plan.</h2>
            <div className="mt-8 grid gap-4">
              {launchSteps.map((step) => (
                <article key={step.day} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{step.day}</div>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Retention and optimization</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The monthly fee has a measurable job.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Monthly management covers monitoring, failure review, copy and routing adjustments, booking-path checks, and a performance report built around the metrics below.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {monthlyMetrics.map((metric) => (
                <div key={metric} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  <BarChart3 className="h-5 w-5 text-cyan-300" />
                  <span>{metric}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-5 text-sm leading-6 text-slate-300">
              <SlidersHorizontal className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <span>Changes outside the documented workflow scope are quoted before work begins; routine optimization inside the installed path is included.</span>
            </div>
          </div>
        </div>
      </section>

      <section id="intake" className="scroll-mt-28 border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Founding-client intake and checkout</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Save the business details, then pay for the exact standard package.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              The intake links the business, phone, booking, lead volume, and current tools to the Stripe purchase. The checkout appears only after the database returns a verified intake ID.
            </p>
            <div className="mt-7 grid gap-3 text-sm text-slate-300">
              {[
                "One canonical offer: $750 setup + $199 monthly",
                "The setup and subscription appear together in Stripe Checkout",
                "No passwords collected through this form",
                "One-business-day onboarding response target after verified payment",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ProductIntakeForm
            kind="lead-recovery"
            planId="lead-recovery-system"
            productName="ILLCO Lead Recovery System"
            submitLabel="Save intake and unlock checkout"
            checkoutHref={checkoutHref}
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Frequently asked questions</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Know the terms before starting.</h2>
        </div>
        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <details key={item.question} className="group rounded-xl border border-white/10 bg-white/[0.04] p-5 open:bg-white/[0.06]">
              <summary className="cursor-pointer list-none pr-8 text-lg font-semibold text-white">{item.question}</summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
