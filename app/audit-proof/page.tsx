import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audit Shop Proof Center | iLLCo AI",
  description: "Public evidence, verification standards, product status, company identity, and trust rules for iLLCo AI technology.",
  alternates: { canonical: "https://illcoai.tech/audit-proof" },
};

const rules = [
  ["Observed", "Publicly visible evidence exists."],
  ["Working", "A public path is reachable and presents the expected interface or workflow."],
  ["Verified", "A dated test has been performed and evidence is available."],
  ["Stale", "Prior evidence exists, but its review date has passed or the current workflow has not been re-tested."],
  ["Unverified", "No current public evidence is available; no completion claim is made."],
];

export default function AuditProofPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "iLLCo AI",
    url: "https://illcoai.tech",
    sameAs: ["https://illcoai.com", "https://helloskip.com/b/illco-ai"],
    description: "AI products, proof, games, technical experiments, and implementation research.",
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
      <p style={{fontSize:20,maxWidth:760}}>This page defines what iLLCo AI counts as evidence. Proposed work is not completion. Marketing copy is not verification. Products earn stronger status only when current public evidence supports it.</p>

      <section style={{marginTop:48,padding:"28px",border:"1px solid #8885",borderRadius:20}}>
        <h2>Canonical company identity</h2>
        <p><strong>Company:</strong> iLLCo AI</p>
        <p><strong>Primary technology property:</strong> illcoai.tech — products, proof, games, experiments, and technical research</p>
        <p><strong>Partner-controlled commercial property:</strong> illcoai.com — business/local service inquiries</p>
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
        <h2>Verification checklist</h2>
        <ul>
          <li>Confirm the product or workflow has a current public status.</li>
          <li>Review the stated deliverable, limitations, version, and access requirements.</li>
          <li>Use dated demonstrations or output evidence where published.</li>
          <li>Do not interpret illustrative examples as customer results.</li>
          <li>Downgrade a verification claim when its review date passes or a required workflow/output check is missing.</li>
        </ul>
      </section>

      <section style={{marginTop:48,padding:"28px",border:"1px solid #8885",borderRadius:20}}>
        <h2>Inspect the technology</h2>
        <p>Use iLLCoAI.tech to inspect products, games, tools, and public proof. Commercial service inquiries belong on the partner business site.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:20}}>
          <Link href="/products" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Browse products</Link>
          <Link href="/games" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Explore games</Link>
          <Link href="/tools" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Open tools</Link>
          <a href="https://illcoai.com" target="_blank" rel="noopener noreferrer" style={{padding:"12px 18px",border:"1px solid currentColor",borderRadius:999}}>Commercial services ↗</a>
        </div>
      </section>

      <footer style={{marginTop:56,fontSize:14,opacity:.75}}>Last policy update: September 8, 2026. Verification status must be supported by current evidence and should be downgraded when evidence becomes stale.</footer>
    </main>
  );
}
