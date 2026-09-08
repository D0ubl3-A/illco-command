import Link from "next/link";

type Props = {
  city: "Las Vegas" | "Henderson";
  service: string;
  headline: string;
  intro: string;
  bullets: string[];
  related: { href: string; label: string }[];
};

export function LocalServicePage({ city, service, headline, intro, bullets, related }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service} in ${city}`,
    provider: {
      "@type": "Organization",
      name: "iLLCo AI",
      url: "https://illcoai.tech",
    },
    areaServed: {
      "@type": "City",
      name: city,
    },
    url: `https://illcoai.tech/${city === "Las Vegas" ? "las-vegas" : "henderson"}/${service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
  };

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">iLLCo AI Tech · {city}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">{headline}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">{intro}</p>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          This page is retained as technical reference material. iLLCoAI.tech focuses on products, proof, games, and implementation research; commercial/local service inquiries are handled through the partner business site.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/audit-proof" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950">Review public proof</Link>
          <Link href="/products" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white">Browse products</Link>
          <a href="https://illcoai.com" target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white">Commercial services ↗</a>
        </div>
      </div>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        {bullets.map((item) => (
          <article key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-200">{item}</article>
        ))}
      </section>

      <section className="mt-14 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.04] p-7">
        <h2 className="text-2xl font-bold text-white">How iLLCo AI handles proof</h2>
        <p className="mt-3 max-w-3xl text-slate-300">Public status is separated from proposed work. A product or workflow is not labeled verified unless current evidence supports that claim. Review the Proof Center for current technical evidence.</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-white">Related technical references</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {related.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:text-white">{item.label}</Link>)}
        </div>
      </section>
    </main>
  );
}
