import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audit Shop Proof Center | iLLCo AI",
  description: "Public evidence, verification standards, conversion paths, company identity, and trust rules for iLLCo AI products and services.",
  alternates: { canonical: "https://illcoai.tech/audit-proof" },
};

const rules = [
  ["Observed", "Publicly visible evidence exists."],
  ["Working", "A public path is reachable and presents the expected interface or workflow."],
  ["Verified", "A dated test has been performed and evidence is available."],
  ["Unverified", "No current public evidence is available; no completion claim is made."],
];

export default function AuditProofPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "iLLCo AI",
    url: "https://illcoai.tech",
    sameAs: ["https://illcoai.com", "https://helloskip.com/b/illco-ai"],
    description: "AI apps, automation systems, creative tools, and managed AI builds.",
    location: [
      { "@type": "Place", name: "Headquarters — Henderson, Nevada" },
      { "@type": "Place", name: "Regional Office — Portland, Oregon" },
    ],
  };

  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"64px 24px",fontFamily:"system-ui",lineHeight:1.55}}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
      <p style={{fontWeight:800,letterSpacing:1}}>iLLCo AI · PUBLIC EVIDENCE CENTER</p>
      <h1 style={{fontSize:"clamp(2.4rem,7vw,5.5rem)",lineHeight:.95,margin:"18px 0"}}>Proof before pitch.</h1>
      <p style={{fontSize:20,maxWidth:760}}>This page defines what iLLCo AI counts as evidence. Proposed work is not completion. Marketing copy is not verification. Products earn stronger status only when the underlying public evidence supports it.</p>

      <section style={{marginTop:48,padding:"28px",border:"1px solid #8885",borderRadius:20}}>
        <h2>Canonical company identity</h2>
        <p><strong>Company:</strong> iLLCo AI</p>
        <p><strong>Primary public command center:</strong> illcoai.tech</p>
        <p><strong>Owned business property:</strong> illcoai.com</p>
        <p><strong>Headquarters:</strong> Henderson, Nevada</p>
        <p><strong>Regional office:</strong> Portland, Oregon</p>
      </section>

      <section style={{marginTop:48}}>
        <h2>Evidence states</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
          {rules.map(([name,desc]) => <article key={name} style={{padding:20,border:"1px solid #8885",borderRadius:16}}><h3>{name}</h3><p>{desc}</p></article>)}
        </div>
      </section>

      <section style={{marginTop:48}}>
        <h2>Buyer verification checklist</h2>
        <ul>
          <li>Confirm the product or service has a current public status.</li>
          <li>Review the stated deliverable, limitations, price or quote requirement, and turnaround.</li>
          <li>Use dated demonstrations or output evidence where published.</li>
          <li>Do not interpret illustrative examples as customer results.</li>
          <li>Use the project intake path for requirements that need qualification.</li>
        </ul>
      </section>

      <section style={{marginTop:48,padding:"28px",border:"1px solid #8885",borderRadius:20}}>
        <h2>Start with a real workflow</h2>
        <p>Browse working apps and managed builds, then use the project path when your requirements need qualification.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:20}}>
          <Link href="/" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Browse the app store</Link>
          <Link href="/project" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Start a project</Link>
          <Link href="/lead-rescue" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Instant Lead Rescue</Link>
        </div>
      </section>

      <footer style={{marginTop:56,fontSize:14,opacity:.75}}>Last policy update: August 10, 2026. Verification status must be supported by current evidence and may be downgraded when evidence becomes stale.</footer>
    </main>
  );
}
