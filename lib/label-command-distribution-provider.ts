import "@/lib/server-only";

export type ProviderSubmission = {
  workspaceId: string;
  releaseId: string;
  destinations: string[];
  idempotencyKey: string;
};

export type ProviderSubmitResult = {
  providerJobId: string;
  state: "acknowledged" | "processing";
};

export interface LabelDistributionProvider {
  readonly key: string;
  readonly available: boolean;
  readonly reason?: string;
  submit(input: ProviderSubmission): Promise<ProviderSubmitResult>;
  requestTakedown(input: { providerJobId: string; releaseId: string; reason: string }): Promise<{ accepted: boolean }>;
}

class DisconnectedProvider implements LabelDistributionProvider {
  readonly available = false;
  constructor(readonly key: string, readonly reason = "No verified API adapter is configured for this distribution provider.") {}
  async submit(): Promise<ProviderSubmitResult> {
    throw new Error(`DISTRIBUTION_PROVIDER_DISCONNECTED: ${this.reason}`);
  }
  async requestTakedown(): Promise<{ accepted: boolean }> {
    throw new Error(`DISTRIBUTION_PROVIDER_DISCONNECTED: ${this.reason}`);
  }
}

/**
 * Provider registry. A real provider must be explicitly added here after its API
 * credentials, delivery contract, status callbacks, and idempotency behavior are verified.
 * Unknown providers fail closed and can never create fake DSP deliveries.
 */
export function getLabelDistributionProvider(key: string): LabelDistributionProvider {
  const normalized = key.trim().toLowerCase();
  return new DisconnectedProvider(normalized || "unknown");
}
