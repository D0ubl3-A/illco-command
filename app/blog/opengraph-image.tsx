import { ImageResponse } from "next/og";

import { blogSiteUrl } from "@/lib/blog-posts";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function splitTitle(value: string, maxLineLength: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1]}...`;
  return clipped;
}

export default function Image() {
  const titleLines = splitTitle("AI Automation Blog", 16, 2);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "56px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(68,215,255,0.20), transparent 28%), radial-gradient(circle at 80% 15%, rgba(255,186,58,0.18), transparent 24%), linear-gradient(180deg, #05070d 0%, #090d16 55%, #05070d 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "36px",
            padding: "52px",
            background: "rgba(6,10,16,0.86)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "740px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  width: "fit-content",
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: "rgba(68,215,255,0.12)",
                  border: "1px solid rgba(68,215,255,0.32)",
                  color: "#baf3ff",
                  fontSize: "24px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                ILLCO Command
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {titleLines.map((line) => (
                  <div key={line} style={{ fontSize: "72px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.04em" }}>
                    {line}
                  </div>
                ))}
              </div>
              <div style={{ color: "#c9d3e1", fontSize: "28px", lineHeight: 1.4, maxWidth: "700px" }}>
                Practical guides that rank, convert, and send readers into working AI workflows.
              </div>
            </div>

            <div
              style={{
                minWidth: "250px",
                padding: "20px 24px",
                borderRadius: "28px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#f1f5f9",
                fontSize: "24px",
                fontWeight: 800,
                textAlign: "right",
              }}
            >
              SEO cluster
              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 600, color: "#94a3b8" }}>
                {blogSiteUrl.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
            {[
              ["AI tools", "What to use first"],
              ["Pricing", "What agencies hide"],
              ["Agents", "When to build one"],
              ["Lead flow", "Stop missing requests"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "20px",
                  borderRadius: "24px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ color: "#fbbf24", fontSize: "18px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {label}
                </div>
                <div style={{ marginTop: "8px", color: "#e2e8f0", fontSize: "22px", fontWeight: 700, lineHeight: 1.2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
