"use client";

import { useMemo, useState } from "react";

const MCP_URL = "https://meme-mcp-server.vercel.app/mcp";

type ToolDescriptor = {
  name: string;
  title?: string;
  description?: string;
  securitySchemes?: Array<{ type: string }>;
};

type ProbeState = {
  status: "idle" | "checking" | "ready" | "error";
  message: string;
  tools: ToolDescriptor[];
  monetization: string;
};

const setupSteps = [
  "Create a new custom app in ChatGPT Developer Mode.",
  "Set MCP Server URL to https://meme-mcp-server.vercel.app/mcp.",
  "Set authentication to None / No authentication.",
  "Create the app, refresh descriptors, then call Generate Memes.",
];

const defaultProbe: ProbeState = {
  status: "idle",
  message: "Ready to check the live MCP server.",
  tools: [],
  monetization: "",
};

export function MemeMcpConsole() {
  const [probe, setProbe] = useState<ProbeState>(defaultProbe);
  const [topic, setTopic] = useState("cheaters getting caught by receipts");
  const [sampleOutput, setSampleOutput] = useState("");
  const [copyState, setCopyState] = useState("Copy URL");

  const activeTools = useMemo(
    () => probe.tools.map((tool) => tool.title || tool.name).join(" / ") || "Generate Memes / Record Conversion / Get Monetization Status",
    [probe.tools],
  );

  async function checkServer() {
    setProbe({ ...defaultProbe, status: "checking", message: "Checking live endpoint..." });
    setSampleOutput("");

    try {
      const [toolsResponse, monetizationResponse] = await Promise.all([
        callMcp("tools/list"),
        callMcp("tools/call", {
          name: "get_monetization_status",
          arguments: {},
        }),
      ]);

      const tools = toolsResponse.result?.tools || [];
      const monetizationText = monetizationResponse.result?.content?.[0]?.text || "";

      setProbe({
        status: "ready",
        message: "Live endpoint responded with ChatGPT-readable tool descriptors.",
        tools,
        monetization: monetizationText,
      });
    } catch (error) {
      setProbe({
        ...defaultProbe,
        status: "error",
        message: error instanceof Error ? error.message : "Live endpoint check failed.",
      });
    }
  }

  async function generateSample() {
    setSampleOutput("Generating from the live MCP endpoint...");

    try {
      const response = await callMcp("tools/call", {
        name: "generate_memes",
        arguments: {
          topic,
          audience: "ChatGPT app builders and meme-page operators",
          tone: "savage",
          platform: "x",
          count: 3,
          style: "balanced",
          requester_id: "illco-command-webapp",
        },
      });

      setSampleOutput(response.result?.content?.[0]?.text || JSON.stringify(response, null, 2));
    } catch (error) {
      setSampleOutput(error instanceof Error ? error.message : "Generation call failed.");
    }
  }

  async function copyUrl() {
    setCopyState("Copied");

    try {
      await navigator.clipboard.writeText(MCP_URL);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = MCP_URL;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    window.setTimeout(() => setCopyState("Copy URL"), 1600);
  }

  return (
    <div className="memeMcpConsole">
      <section className="panel memeMcpHero">
        <div>
          <span className="readinessPill ready">ChatGPT App Endpoint</span>
          <h1>Meme MCP Server</h1>
          <p>
            A monetized meme generator endpoint for ChatGPT Apps, wired through the deployed Vercel MCP server and tracked from ILLCO Command.
          </p>
          <div className="heroProofBadges" aria-label="Meme MCP deployment facts">
            <span><strong>Live</strong> Vercel</span>
            <span><strong>No Auth</strong> connector setup</span>
            <span><strong>3</strong> MCP tools</span>
          </div>
        </div>
        <div className="memeMcpEndpointCard">
          <span>MCP Server URL</span>
          <code>{MCP_URL}</code>`r`n          <small>Paste this exact /mcp endpoint into ChatGPT. The illcoai.tech/tools page is only the setup dashboard.</small>
          <button className="button primary" type="button" onClick={copyUrl}>
            {copyState}
          </button>
        </div>
      </section>

      <section className="memeMcpGrid">
        <article className="panel memeMcpSetupPanel">
          <div className="panelHeader">
            <div>
              <h2>ChatGPT Setup</h2>
              <p>Use these exact values in the Custom Tool / Apps form. Do not paste the illcoai.tech/tools page URL, and do not choose OAuth for this meme app.</p>
            </div>
          </div>
          <dl className="memeMcpSettingsList">
            <div>
              <dt>Name</dt>
              <dd>Meme MCP Server</dd>
            </div>
            <div>
              <dt>Authentication</dt>
              <dd>None / No authentication</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>{MCP_URL}</dd>
            </div>
          </dl>
          <ol className="memeMcpSteps">
            {setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className={`panel memeMcpProbePanel status-${probe.status}`}>
          <div className="panelHeader">
            <div>
              <h2>Live Probe</h2>
              <p>{probe.message}</p>
            </div>
            <button className="button primary" type="button" onClick={checkServer} disabled={probe.status === "checking"}>
              {probe.status === "checking" ? "Checking" : "Check Endpoint"}
            </button>
          </div>
          <div className="memeMcpToolStrip" aria-label="Discovered MCP tools">
            <span>{activeTools}</span>
          </div>
          <div className="memeMcpToolList">
            {(probe.tools.length ? probe.tools : [
              { name: "generate_memes", title: "Generate Memes" },
              { name: "record_conversion", title: "Record Conversion" },
              { name: "get_monetization_status", title: "Get Monetization Status" },
            ]).map((tool) => (
              <span key={tool.name}>
                <strong>{tool.title || tool.name}</strong>
                <small>{tool.securitySchemes?.[0]?.type || "noauth"}</small>
              </span>
            ))}
          </div>
        </article>
      </section>

      <section id="meme-mcp-generator" className="panel memeMcpGeneratorPanel">
        <div className="panelHeader">
          <div>
            <h2>Generate Test</h2>
            <p>Calls the live MCP `generate_memes` tool using a stable ILLCO webapp requester id.</p>
          </div>
          <button className="button primary" type="button" onClick={generateSample}>
            Generate
          </button>
        </div>
        <label className="memeMcpTopicField">
          <span>Meme topic</span>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        {sampleOutput ? <pre className="memeMcpOutput">{sampleOutput}</pre> : null}
      </section>

      {probe.monetization ? (
        <section className="panel memeMcpMonetizationPanel">
          <div className="panelHeader">
            <div>
              <h2>Monetization Snapshot</h2>
              <p>Live response from `get_monetization_status`.</p>
            </div>
          </div>
          <pre className="memeMcpOutput">{probe.monetization}</pre>
        </section>
      ) : null}
    </div>
  );
}

async function callMcp(method: string, params?: unknown) {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `MCP request failed with ${response.status}`);
  }

  return payload;
}

