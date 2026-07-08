import { ImageResponse } from "next/og";

import { blogPosts, getBlogPost } from "@/lib/blog-posts";

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

export default async function Image({ params }: { params: { slug: string } | Promise<{ slug: string }> }) {
  const { slug } = await Promise.resolve(params);
  const post = getBlogPost(slug) || blogPosts[0];
  const titleLines = splitTitle(post.title, 24, 3);
  const keyword = post.primaryKeyword;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "52px",
          background:
            "radial-gradient(circle at 18% 20%, rgba(68,215,255,0.18), transparent 26%), radial-gradient(circle at 82% 12%, rgba(255,186,58,0.18), transparent 24%), linear-gradient(180deg, #05070d 0%, #090d16 52%, #05070d 100%)",
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
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "36px",
            padding: "50px",
            background: "rgba(6,10,16,0.88)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  padding: "10px 18px",
                  borderRadius: "999px",
                  background: "rgba(68,215,255,0.12)",
                  border: "1px solid rgba(68,215,255,0.32)",
                  color: "#baf3ff",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {post.category}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {titleLines.map((line) => (
                  <div key={line} style={{ fontSize: "64px", lineHeight: 1.03, fontWeight: 900, letterSpacing: "-0.04em" }}>
                    {line}
                  </div>
                ))}
              </div>
              <div style={{ color: "#c9d3e1", fontSize: "28px", lineHeight: 1.4, maxWidth: "720px" }}>
                {post.serpIntent}
              </div>
            </div>

            <div
              style={{
                minWidth: "280px",
                padding: "22px 24px",
                borderRadius: "28px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#f1f5f9",
                fontSize: "24px",
                fontWeight: 800,
                textAlign: "right",
                lineHeight: 1.25,
              }}
            >
              Clickable SEO
              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 600, color: "#94a3b8" }}>
                {keyword}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {post.takeaways.slice(0, 4).map((takeaway) => (
              <div
                key={takeaway}
                style={{
                  padding: "16px 18px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#e2e8f0",
                  fontSize: "20px",
                  fontWeight: 700,
                  maxWidth: "520px",
                }}
              >
                {takeaway}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ color: "#fbbf24", fontSize: "24px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ILLCO Command Blog
            </div>
            <div style={{ color: "#94a3b8", fontSize: "18px", fontWeight: 600 }}>
              Practical guides. Strong hooks. Real utility.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
