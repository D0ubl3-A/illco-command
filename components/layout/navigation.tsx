"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronDown,
  ExternalLink,
  Film,
  KeyRound,
  LogIn,
  Menu,
  Rocket,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  Workflow,
  X,
} from "lucide-react";

const googleOAuthHref = "/api/account/google/start?returnTo=/account" as const;

type MenuLink = {
  href: string;
  label: string;
  detail: string;
  icon: typeof Bot;
  external?: boolean;
};

type MenuGroup = {
  title: string;
  copy: string;
  links: MenuLink[];
};

const desktopGroups: MenuGroup[] = [
  {
    title: "Browse store",
    copy: "Shop apps by product lane.",
    links: [
      { href: "/products", label: "All apps", detail: "Full catalog and pricing", icon: Boxes },
      { href: "/products?category=automation", label: "Automation", detail: "Ops, routing, and assistants", icon: Workflow },
      { href: "/products?category=media", label: "Media", detail: "Music, video, voice, and content", icon: Film },
      { href: "/products?category=commerce", label: "Commerce", detail: "Checkout and conversion systems", icon: ShoppingCart },
    ],
  },
  {
    title: "Launch tools",
    copy: "Open working product surfaces.",
    links: [
      { href: "/brain", label: "Brain OS", detail: "Private projects, memory, and execution", icon: BrainCircuit },
      { href: "/label-command", label: "Label Command", detail: "Artists, releases, rights, and analytics", icon: Workflow },
      { href: "/tools/lyric-video-forge", label: "Lyric Video Forge", detail: "ChatGPT-ready creator tool", icon: Sparkles },
      { href: "/tools/think-for-me-mode", label: "Think For Me Mode", detail: "Execution and planning skill", icon: Rocket },
      { href: "/commander", label: "Commander", detail: "Legacy command workspace", icon: Bot },
      { href: "/blog", label: "AI playbooks", detail: "Use cases and buying guides", icon: BriefcaseBusiness },
    ],
  },
  {
    title: "Account",
    copy: "Sign in, manage access, and review setup.",
    links: [
      { href: googleOAuthHref, label: "Sign in with Google", detail: "OAuth account access", icon: ShieldCheck, external: true },
      { href: "/account", label: "Manage account", detail: "Orders, launch access, profile", icon: User },
      { href: "/account#master-access", label: "Master key", detail: "Unlock owned systems", icon: KeyRound },
      { href: "/admin", label: "Admin", detail: "Internal controls", icon: ShieldCheck },
    ],
  },
];

const quickLinks = [
  { href: "/products", label: "Apps", icon: Boxes },
  { href: "/brain", label: "Brain", icon: BrainCircuit },
  { href: "/label-command", label: "Label", icon: Workflow },
  { href: "/tools/lyric-video-forge", label: "ChatGPT", icon: Sparkles },
  { href: "/commander", label: "Commander", icon: Rocket },
] as const;

export function StoreNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(2,4,9,0.88)] backdrop-blur-xl shadow-[0_18px_54px_rgba(0,0,0,0.24)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setIsMenuOpen(false)}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(92,241,255,0.9),rgba(240,178,75,0.85))] text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(92,241,255,0.18)]">
            <Bot className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-none tracking-[0.06em] text-white uppercase">ILLCO AI App Store</span>
            <span className="mt-1 hidden truncate text-xs tracking-[0.04em] text-slate-400 sm:block">Launch-ready apps and systems</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.07] group-open:border-cyan-300/45 group-open:bg-cyan-300/10">
              <Boxes className="h-4 w-4 text-cyan-300" />
              Store menu
              <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
            </summary>
            <div className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[min(940px,calc(100vw-48px))] -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#06101d]/95 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.56)] backdrop-blur-2xl">
              <div className="grid gap-3 lg:grid-cols-3">
                {desktopGroups.map((group) => (
                  <section key={group.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                    <div className="px-1 pb-2">
                      <h2 className="text-sm font-semibold text-white">{group.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{group.copy}</p>
                    </div>
                    <div className="grid gap-1">
                      {group.links.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left transition hover:bg-white/[0.06]"
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-cyan-300/10 text-cyan-200">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-100">{link.label}</span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">{link.detail}</span>
                            </span>
                            {link.external ? <ExternalLink className="h-3.5 w-3.5 text-slate-500" /> : <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </details>

          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon className="h-4 w-4 text-cyan-300" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
          >
            <User className="h-4 w-4 text-cyan-300" />
            Account
          </Link>
          <Link
            href={googleOAuthHref}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/12 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
          >
            <ShieldCheck className="h-4 w-4" />
            Sign in
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={googleOAuthHref}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/12 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
            onClick={() => setIsMenuOpen(false)}
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white transition hover:border-cyan-300/40 hover:bg-white/[0.08]"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-white/10 bg-[#060912]/96 px-4 py-4 shadow-[0_18px_54px_rgba(0,0,0,0.24)] lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-3 sm:px-2">
            {desktopGroups.map((group) => (
              <section key={group.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 px-1">
                  <h2 className="text-sm font-semibold text-white">{group.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{group.copy}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/[0.06]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                          <span className="truncate">{link.label}</span>
                        </span>
                        {link.external ? <ExternalLink className="h-4 w-4 text-slate-500" /> : <ArrowRight className="h-4 w-4 text-slate-500" />}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
