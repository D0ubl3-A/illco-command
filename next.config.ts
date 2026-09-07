import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.illcoai.tech" }],
        destination: "https://illcoai.tech/:path*",
        permanent: true,
      },

      // Commercial/local search intent belongs on illcoai.com.
      // Keep illcoai.tech focused on products, proof, games, research, and technical systems.
      {
        source: "/local",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/henderson-ai-automation",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/henderson/ai-consulting",
        destination: "https://illcoai.com/ai-consulting-henderson",
        permanent: true,
      },
      {
        source: "/henderson/ai-receptionist",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/henderson/ai-automation",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/henderson/web-design",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-agency",
        destination: "https://illcoai.com/ai-agency-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-consulting",
        destination: "https://illcoai.com/ai-agency-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-receptionist",
        destination: "https://illcoai.com/ai-receptionist-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-automation",
        destination: "https://illcoai.com/small-business-automation-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/small-business-automation",
        destination: "https://illcoai.com/small-business-automation-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-lead-generation",
        destination: "https://illcoai.com/ai-lead-generation-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-website-design",
        destination: "https://illcoai.com/ai-website-design-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/missed-call-text-back",
        destination: "https://illcoai.com/ai-receptionist-las-vegas",
        permanent: true,
      },
      {
        source: "/las-vegas/ai-quote-builder-for-contractors",
        destination: "https://illcoai.com/services",
        permanent: true,
      },
      {
        source: "/companions",
        destination: "/tools",
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
