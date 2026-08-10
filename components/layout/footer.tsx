import Link from "next/link";
import { Bot, BrainCircuit, LogIn, MapPin, ShieldCheck, Sparkles } from "lucide-react";

const googleOAuthHref = "/api/account/google/start?returnTo=/account" as const;

const footerLinks = [
  { href: googleOAuthHref, label: "Login" },
  { href: "/products", label: "Apps" },
  { href: "/audit-proof", label: "Proof Center" },
  { href: "/brain", label: "Brain OS" },
  { href: "/commander", label: "Commander" },
  { href: "/tools/lyric-video-forge", label: "ChatGPT" },
  { href: "/account", label: "Account" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

export function StoreFooter() {
  return (
    <footer className="border-t border-white/10 bg-[rgba(2,4,9,0.96)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(92,241,255,0.9),rgba(240,178,75,0.85))] text-slate-950 shadow-[0_18px_40px_rgba(92,241,255,0.18)]">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold tracking-[0.06em] text-white uppercase">iLLCo AI</div>
              <div className="text-sm text-slate-400">Working AI apps, automation systems, creative engines, and custom builds.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/audit-proof" className="inline-flex items-center gap-2 rounded-[999px] border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/15">
              <ShieldCheck className="h-3.5 w-3.5" />
              Public Proof Center
            </Link>
            <span className="inline-flex items-center gap-2 rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-cyan-300" />
              HQ: Henderson, NV · Regional: Portland, OR
            </span>
            <span className="inline-flex items-center gap-2 rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200">
              <LogIn className="h-3.5 w-3.5 text-cyan-300" />
              Account access
            </span>
            <span className="inline-flex items-center gap-2 rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              ChatGPT tools
            </span>
            <Link href="/brain" className="inline-flex items-center gap-2 rounded-[999px] border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
              <BrainCircuit className="h-3.5 w-3.5" />
              Private Brain OS
            </Link>
          </div>
          <p className="max-w-2xl text-xs leading-5 text-slate-500">
            Primary command center: illcoai.tech · Owned business property: illcoai.com. Product status and verification claims are governed by the public Proof Center.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-3" aria-label="Footer links">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 transition hover:bg-white/[0.05] hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
