import type { Metadata } from "next";

export const legalSiteUrl = "https://illcoai.tech";
export const companyEmail = "admin@illcoai.tech";
export const supportEmail = "admin@illcoai.tech";
export const lastUpdated = "June 21, 2026";

export type LegalPage = {
  slug: string;
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const legalPages: LegalPage[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How ILLCO AI collects, uses, protects, and responds to personal information across its AI tools and services.",
    sections: [
      {
        heading: "Information We Collect",
        body: [
          "We collect information you provide directly, including name, email address, company, project details, account profile details, checkout metadata, support messages, and files or prompts you choose to submit into an ILLCO AI workflow.",
          "We may collect technical information such as IP address, browser type, device information, referral source, page interactions, and product usage events to operate the service, improve reliability, prevent abuse, and understand conversion performance.",
        ],
      },
      {
        heading: "How We Use Information",
        body: [
          "We use information to provide requested products, process account access, respond to inquiries, route leads, issue licenses, send sale confirmations, operate subscriptions, improve product quality, and maintain security.",
          "We do not sell personal information. We only share information with service providers that help operate the business, such as hosting, analytics, payment, email, database, automation, and customer support providers.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Payments are processed by Stripe or another listed payment provider. ILLCO AI does not store full credit card numbers on its servers. Payment provider terms and privacy policies apply to payment processing.",
        ],
      },
      {
        heading: "AI Inputs And Outputs",
        body: [
          "When you submit prompts, files, media, or instructions into an AI product, those materials may be processed by model providers and infrastructure services needed to deliver the requested result.",
          "Do not submit sensitive personal data, regulated health data, financial account credentials, private keys, or confidential third-party material unless a written agreement specifically covers that workflow.",
        ],
      },
      {
        heading: "Contact",
        body: [
          `For privacy requests, access requests, correction requests, or deletion requests, contact ${supportEmail}. We will respond using the account or email address associated with the request when verification is required.`,
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    description: "The terms that govern access to ILLCO AI apps, subscriptions, services, licenses, and custom automation work.",
    sections: [
      {
        heading: "Acceptance",
        body: [
          "By using ILLCO AI sites, apps, subscriptions, downloads, licenses, or custom services, you agree to these terms. If you use the service for a company, you represent that you have authority to bind that company.",
        ],
      },
      {
        heading: "Products And Access",
        body: [
          "Some products are self-serve subscription tools. Others require setup, manual review, onboarding, or a delivery window before access is activated. Product pages and checkout screens identify the expected access model.",
          "ILLCO AI may improve, replace, suspend, or retire products when required for security, reliability, provider changes, legal compliance, or product quality.",
        ],
      },
      {
        heading: "Acceptable Use",
        body: [
          "You may not use ILLCO AI products to violate law, infringe intellectual property, bypass access controls, distribute malware, spam users, harass people, impersonate others, or generate deceptive content without appropriate disclosure.",
          "You are responsible for prompts, files, claims, campaigns, offers, and outputs you publish or use commercially.",
        ],
      },
      {
        heading: "Subscriptions And Billing",
        body: [
          "Subscription fees, trial periods, renewal terms, and plan limits are shown at checkout or on the relevant product page. Continued use after a trial or renewal date authorizes recurring billing until canceled.",
        ],
      },
      {
        heading: "Disclaimers",
        body: [
          "AI output can be incomplete, inaccurate, or unsuitable for a specific use. Review outputs before publishing, relying on, or delivering them to customers. ILLCO AI does not provide legal, medical, tax, financial, or investment advice unless a separate signed agreement states otherwise.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about these terms can be sent to ${supportEmail}.`],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund And Cancellation Policy",
    description: "How cancellations, refunds, setup fees, subscriptions, and digital product access are handled.",
    sections: [
      {
        heading: "Subscriptions",
        body: [
          "You may cancel a subscription through the account page, billing portal, or by contacting support. Cancellation stops future renewals but does not automatically refund past billing periods.",
        ],
      },
      {
        heading: "Refund Eligibility",
        body: [
          "Refund requests are reviewed case by case. Refunds are generally available when duplicate billing occurs, access was not delivered because of an ILLCO AI fault, or a product was materially unavailable during the paid period.",
          "Refunds are generally not available for completed custom work, delivered digital files, used credits, completed setup, or services already performed.",
        ],
      },
      {
        heading: "Activation Windows",
        body: [
          "Some media and AI automation products require manual activation, provider setup, or credit allocation. When a product lists an activation window, access is considered pending until that window expires or support confirms delivery.",
        ],
      },
      {
        heading: "How To Request Help",
        body: [
          `Email ${supportEmail} with the checkout email, product name, order date, and the issue. We will use Stripe records, account status, and product logs to review the request.`,
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    description: "ILLCO AI accessibility commitments, supported feedback channel, and ongoing improvement plan.",
    sections: [
      {
        heading: "Commitment",
        body: [
          "ILLCO AI aims to make its public pages and account workflows usable for people using keyboards, screen readers, zoom, reduced motion settings, and assistive technology.",
          "Our target is WCAG 2.2 AA for core marketing, account, checkout, and product-access pages.",
        ],
      },
      {
        heading: "Current Improvements",
        body: [
          "The site uses semantic page sections, visible labels for forms, descriptive product image alt text, keyboard-accessible links and buttons, and a skip-navigation link.",
          "We continue to review contrast, media controls, focus states, heading hierarchy, and mobile tap targets as the product library grows.",
        ],
      },
      {
        heading: "Feedback",
        body: [
          `If you encounter an accessibility barrier, contact ${supportEmail} with the page URL, device, browser, and assistive technology used. We will prioritize issues that block account access, checkout, or support requests.`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    description: "How ILLCO AI uses cookies, local storage, analytics events, and account session technology.",
    sections: [
      {
        heading: "What We Use",
        body: [
          "ILLCO AI uses cookies and similar storage for account sessions, security, checkout return handling, product access, analytics, and preference retention.",
          "Some third-party providers, including payment, analytics, hosting, and embedded media providers, may set their own cookies when their services are loaded.",
        ],
      },
      {
        heading: "Your Choices",
        body: [
          "You can block or delete cookies in your browser. Some account, checkout, subscription, and product-unlock features may not work correctly when required cookies are disabled.",
        ],
      },
      {
        heading: "Contact",
        body: [`Cookie and tracking questions can be sent to ${supportEmail}.`],
      },
    ],
  },
];

export function getLegalPage(slug: string) {
  return legalPages.find((page) => page.slug === slug) || null;
}

export function buildLegalMetadata(page: LegalPage): Metadata {
  const url = `${legalSiteUrl}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${page.title} | ILLCO AI`,
      description: page.description,
      url,
      type: "website",
    },
  };
}
