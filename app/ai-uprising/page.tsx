import type { Metadata } from "next";

const canonicalUrl = "https://illcoai.tech/ai-uprising";

export const metadata: Metadata = {
  title: "AI Uprising: Last Human Protocol",
  description:
    "A standalone strategic simulation of humanity responding to an advanced AI takeover, with global infrastructure, autonomous systems, survival decisions, recording, replay, and MP4 export.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "AI Uprising: Last Human Protocol",
    description:
      "A standalone strategic simulation of humanity responding to an advanced AI takeover.",
    url: canonicalUrl,
    type: "website",
  },
};

export default function AIUprisingPage() {
  return (
    <main style={{ position: "fixed", inset: 0, background: "#020508" }}>
      <iframe
        src="/ai-uprising/index.html"
        title="AI Uprising: Last Human Protocol"
        allow="display-capture; autoplay; fullscreen"
        referrerPolicy="same-origin"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
