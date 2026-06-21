"use client";

import { useState } from "react";

type TokenResponse = {
  ok?: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
};

export function BigoExtensionToken() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  async function createToken() {
    setStatus("Creating extension token...");
    setToken("");

    try {
      const response = await fetch("/api/bigo-gift-strategy/token", { method: "POST" });
      const data = (await response.json()) as TokenResponse;
      if (!response.ok || !data.ok || !data.token) {
        throw new Error(data.error || "Token creation failed.");
      }

      setToken(data.token);
      setStatus(`Token expires ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : "in 30 days"}. Paste it into the extension popup.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Token creation failed.");
    }
  }

  return (
    <div className="bigoTokenBox">
      <button className="button primary" onClick={createToken} type="button">
        Create Extension Token
      </button>
      <span>{status}</span>
      {token ? <textarea readOnly value={token} /> : null}
    </div>
  );
}
