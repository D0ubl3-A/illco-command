"use client";

import { useMemo, useState } from "react";

type ImportResponse = {
  ok?: boolean;
  imported?: number;
  contributionId?: string;
  strategySummary?: string[];
  error?: string;
};

function parseRecordCount(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.length;
    if (Array.isArray(parsed?.records)) return parsed.records.length;
  } catch {
    return 0;
  }

  return 0;
}

export function BigoGiftStrategyImporter() {
  const [payload, setPayload] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const recordCount = useMemo(() => parseRecordCount(payload), [payload]);

  async function submitContribution() {
    setStatus("Importing records...");
    setResult(null);

    try {
      const parsed = JSON.parse(payload);
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      const response = await fetch("/api/bigo-gift-strategy/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consent,
          records,
          source: "bigo-gift-history-extension",
        }),
      });
      const data = (await response.json()) as ImportResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Import failed.");
      }

      setResult(data);
      setStatus(`${data.imported || 0} records contributed for strategy.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    }
  }

  return (
    <section className="panel bigoStrategyImporter" id="contribute">
      <div className="panelHeader">
        <div>
          <h2>Contribute Gift Records For Strategy</h2>
          <p>
            Paste the JSON export from the Chrome extension. Records are tied to your signed-in ILLCO account and used for host strategy analysis only after consent.
          </p>
        </div>
      </div>

      <label className="bigoStrategyField">
        JSON export
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          placeholder='{"records":[{"text":"..."}]}'
          spellCheck={false}
        />
      </label>

      <label className="bigoStrategyConsent">
        <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />
        I have permission to use these records and I want ILLCO to use them for BIGO host strategy.
      </label>

      <div className="bigoStrategyActions">
        <button className="button primary" disabled={!consent || recordCount === 0} onClick={submitContribution} type="button">
          Contribute {recordCount ? `${recordCount} records` : "records"}
        </button>
        <span>{status}</span>
      </div>

      {result?.strategySummary?.length ? (
        <div className="bigoStrategySummary">
          <strong>Strategy Signals</strong>
          {result.strategySummary.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
