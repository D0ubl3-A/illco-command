"use client";

import { useState } from "react";

type SocialShareProps = {
  title: string;
  url?: string;
  label?: string;
};

export function SocialShare({ title, url, label = "Share this page" }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : "https://illcoai.tech");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", resolvedUrl);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title, url: resolvedUrl });
    } else {
      await copyLink();
    }
  }

  const encodedUrl = encodeURIComponent(resolvedUrl);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { name: "X", href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
  ];

  return (
    <section aria-label={label} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", margin: "24px 0", padding: "14px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", background: "rgba(255,255,255,0.035)" }}>
      <strong style={{ marginRight: "4px" }}>Share</strong>
      {links.map((link) => (
        <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${link.name}`} style={{ padding: "8px 10px", borderRadius: "9px", color: "#f7fbff", background: "rgba(92,241,255,0.1)", border: "1px solid rgba(92,241,255,0.28)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 700 }}>
          {link.name}
        </a>
      ))}
      <button type="button" onClick={copyLink} style={{ padding: "8px 10px", borderRadius: "9px", color: "#f7fbff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700 }}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" onClick={nativeShare} style={{ padding: "8px 10px", borderRadius: "9px", color: "#071019", background: "#5cf1ff", border: "1px solid #5cf1ff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 800 }}>
        Share
      </button>
    </section>
  );
}
