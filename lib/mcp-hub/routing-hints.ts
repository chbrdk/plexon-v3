/**
 * MCP Tool Hub — routing hint matching (pure, unit-testable).
 * Spec: specs/domain/mcp-tool-hub.md Wave H2
 */

export type HubRoutingHintServer = {
  slug: string;
  displayName?: string;
  routingHints: string[];
};

/** True when prompt contains any routing hint (case-insensitive whole-token-ish). */
export function promptMatchesHubRoutingHints(
  prompt: string,
  hints: string[] | null | undefined
): boolean {
  const text = prompt.trim().toLowerCase();
  if (!text || !hints?.length) return false;
  for (const raw of hints) {
    const hint = String(raw ?? '')
      .trim()
      .toLowerCase();
    if (!hint) continue;
    if (text.includes(hint)) return true;
  }
  return false;
}

export function matchHubServersByRoutingHints(
  prompt: string,
  servers: HubRoutingHintServer[]
): HubRoutingHintServer[] {
  return servers.filter((s) => promptMatchesHubRoutingHints(prompt, s.routingHints));
}

/**
 * When hints match and the user has write intent, enable writes and annotate reasoning.
 * Does not change intent family (Hub tools are allowlisted separately).
 */
export function applyHubRoutingWriteBoost(input: {
  prompt: string;
  writeIntent: boolean;
  allowWriteTools: boolean;
  reasoning: string;
  matchedServers: HubRoutingHintServer[];
}): { allowWriteTools: boolean; reasoning: string; matched: boolean } {
  if (!input.matchedServers.length) {
    return {
      allowWriteTools: input.allowWriteTools,
      reasoning: input.reasoning,
      matched: false,
    };
  }
  const labels = input.matchedServers.map((s) => s.slug).join(', ');
  const allowWriteTools = input.allowWriteTools || input.writeIntent;
  return {
    allowWriteTools,
    reasoning: `${input.reasoning} → Hub routing (${labels})${
      allowWriteTools && input.writeIntent ? ' + Write' : ''
    }.`,
    matched: true,
  };
}
