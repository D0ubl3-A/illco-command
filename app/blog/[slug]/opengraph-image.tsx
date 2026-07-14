import { ImageResponse } from "next/og";

import { blogPosts } from "@/lib/blog-posts";
import { newsBlogPosts } from "@/lib/news-blog-posts";
import { aiEnhancedBirdImageDataUrl, originalLizardImageDataUrl } from "@/lib/viral-image-data";
import { viralBlogPosts } from "@/lib/viral-blog-posts";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const allBlogPosts = [...viralBlogPosts, ...newsBlogPosts, ...blogPosts];
const lizardSlug = "ai-turned-lizard-into-hummingbird-image-enhancement-hallucination";

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

function ViralLizardThumbnail() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(120deg, #05080d 0%, #08141d 44%, #0d2631 100%)", color: "white", fontFamily: "Arial, sans-serif", borderTop: "10px solid #00d5ff" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "38%", padding: "36px 20px 34px 38px" }}>
        <div style={{ display: "flex", width: "fit-content", padding: "8px 14px", border: "2px solid #00d5ff", borderRadius: "999px", color: "#c7f6ff", fontSize: "22px", fontWeight: 800, letterSpacing: "0.06em" }}>AI HALLUCINATION</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "30px", fontSize: "56px", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.04em" }}>
          <span>AI TURNED</span>
          <span style={{ color: "#ffd600" }}>THIS LIZARD</span>
          <span>INTO A</span>
          <span style={{ color: "#78ff00" }}>HUMMINGBIRD</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "28px", color: "#cbd5e1", fontSize: "24px", lineHeight: 1.35 }}>
          <span>I asked it to enhance the photo.</span>
          <span>It confidently changed reality.</span>
        </div>
      </div>

      <div style={{ display: "flex", width: "62%", padding: "34px 30px 32px 10px", gap: "18px", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "48%", height: "520px", overflow: "hidden", border: "3px solid white", borderRadius: "24px", background: "#111827" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50px", background: "#ef2d2d", fontSize: "23px", fontWeight: 900, letterSpacing: "0.03em" }}>ORIGINAL: LIZARD</div>
          <img src={originalLizardImageDataUrl} alt="" width="360" height="470" style={{ width: "100%", height: "470px", objectFit: "cover" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "999px", background: "#ef2d2d", fontSize: "34px", fontWeight: 900 }}>→</div>

        <div style={{ display: "flex", flexDirection: "column", width: "48%", height: "520px", overflow: "hidden", border: "3px solid white", borderRadius: "24px", background: "#111827" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50px", background: "#4bc900", fontSize: "23px", fontWeight: 900, letterSpacing: "0.03em" }}>AI “ENHANCED”</div>
          <img src={aiEnhancedBirdImageDataUrl} alt="" width="360" height="470" style={{ width: "100%", height: "470px", objectFit: "cover" }} />
        </div>
      </div>

      <div style={{ position: "absolute", right: "40px", bottom: "12px", display: "flex", padding: "7px 18px", borderRadius: "999px", background: "rgba(0,0,0,0.82)", fontSize: "21px", fontWeight: 900, letterSpacing: "0.04em" }}>SHARPER DOES NOT ALWAYS MEAN TRUER</div>
    </div>
  );
}

export default async function Image({ params }: { params: { slug: string } | Promise<{ slug: string }> }) {
  const { slug } = await Promise.resolve(params);

  if (slug === lizardSlug) {
    return new ImageResponse(<ViralLizardThumbnail />, size);
  }

  const post = allBlogPosts.find((candidate) => candidate.slug === slug) || allBlogPosts[0];
  const titleLines = splitTitle(post.title, 24, 3);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: "52px", background: "radial-gradient(circle at 18% 20%, rgba(68,215,255,0.18), transparent 26%), radial-gradient(circle at 82% 12%, rgba(255,186,58,0.18), transparent 24%), linear-gradient(180deg, #05070d 0%, #090d16 52%, #05070d 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "36px", padding: "50px", background: "rgba(6,10,16,0.88)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
              <div style={{ display: "inline-flex", width: "fit-content", padding: "10px 18px", borderRadius: "999px", background: "rgba(68,215,255,0.12)", border: "1px solid rgba(68,215,255,0.32)", color: "#baf3ff", fontSize: "22px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{post.category}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {titleLines.map((line) => <div key={line} style={{ fontSize: "64px", lineHeight: 1.03, fontWeight: 900, letterSpacing: "-0.04em" }}>{line}</div>)}
              </div>
              <div style={{ color: "#c9d3e1", fontSize: "28px", lineHeight: 1.4, maxWidth: "720px" }}>{post.description}</div>
            </div>
            <div style={{ minWidth: "280px", padding: "22px 24px", borderRadius: "28px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#f1f5f9", fontSize: "24px", fontWeight: 800, textAlign: "right", lineHeight: 1.25 }}>
              Current AI News
              <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: 600, color: "#94a3b8" }}>{post.primaryKeyword}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {post.takeaways.slice(0, 4).map((takeaway) => <div key={takeaway} style={{ padding: "16px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#e2e8f0", fontSize: "20px", fontWeight: 700, maxWidth: "520px" }}>{takeaway}</div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ color: "#fbbf24", fontSize: "24px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>ILLCO AI Blog</div>
            <div style={{ color: "#94a3b8", fontSize: "18px", fontWeight: 600 }}>Confirmed facts. Business analysis. Practical action.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
