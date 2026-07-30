import { z } from 'zod';
import { echonIntegrationUrl, echonResearchThreadPath } from '@/lib/paths/echon-api';
import { enqueueEchonResearchRun } from '@/lib/integrations/echon-research-async-client';
import { echonServiceFetchJson } from '@/lib/integrations/echon-service-fetch';

const answerSchema = z.object({
  executive_summary: z.string().trim().optional(),
  key_findings: z.array(z.string()).optional(),
  implications: z.string().trim().nullable().optional(),
});

const messageSchema = z.object({
  role: z.string(),
  structured: z.record(z.unknown()).optional(),
  content: z.string().optional(),
});

const threadSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  messages: z.array(messageSchema).optional(),
});

export type EchonMarketContext = {
  available: boolean;
  reason?: string;
  threadId?: string;
  runId?: string;
  executiveSummary?: string;
  keyFindings?: string[];
  implications?: string;
};

export type TargetGroupSuggestion = { name: string; description: string; segment: string };

export function emptyEchonMarketContext(reason?: string): EchonMarketContext {
  return { available: false, reason };
}

function extractAnswerFromMessage(msg: z.infer<typeof messageSchema>): z.infer<typeof answerSchema> | null {
  const structured = msg.structured;
  if (structured && typeof structured === 'object') {
    const research = (structured as Record<string, unknown>).research_answer;
    if (research) {
      const parsed = answerSchema.safeParse(research);
      if (parsed.success) return parsed.data;
    }
    const direct = answerSchema.safeParse(structured);
    if (direct.success) return direct.data;
  }
  return null;
}

export function parseEchonThreadToMarketContext(raw: unknown, threadId: string): EchonMarketContext {
  const parsed = threadSchema.safeParse(raw);
  if (!parsed.success) return emptyEchonMarketContext('echon_thread_parse_failed');

  const messages = parsed.data.messages ?? [];
  for (const msg of [...messages].reverse()) {
    if (msg.role !== 'assistant') continue;
    const answer = extractAnswerFromMessage(msg);
    if (answer?.executive_summary?.trim()) {
      return {
        available: true,
        threadId,
        executiveSummary: answer.executive_summary.trim().slice(0, 2000),
        keyFindings: (answer.key_findings ?? []).map((f) => f.trim()).filter(Boolean).slice(0, 5),
        implications: answer.implications?.trim() || undefined,
      };
    }
  }
  return emptyEchonMarketContext('echon_no_structured_answer');
}

export async function fetchEchonMarketContext(
  threadId: string,
  timeoutMs = 45_000,
  apiBaseUrl?: string
): Promise<EchonMarketContext> {
  const path = echonResearchThreadPath(threadId);
  const url = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, '')}${path}`
    : echonIntegrationUrl(path);
  const res = await echonServiceFetchJson<unknown>(path, undefined, timeoutMs, url);
  if (!res.ok) return emptyEchonMarketContext(res.reason);
  return parseEchonThreadToMarketContext(res.data, threadId);
}

export async function runEchonPlaybookResearch(
  query: string,
  options: {
    timeoutMs: number;
    pollIntervalMs: number;
    pollRequestTimeoutMs: number;
    onPoll?: (attempt: number, threadId: string) => void | Promise<void>;
  }
): Promise<EchonMarketContext & { runId?: string }> {
  const enqueued = await enqueueEchonResearchRun(query);
  if (!enqueued.ok) {
    return emptyEchonMarketContext(enqueued.reason);
  }

  const deadline = Date.now() + options.timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    await options.onPoll?.(attempt, enqueued.threadId);
    const ctx = await fetchEchonMarketContext(enqueued.threadId, options.pollRequestTimeoutMs);
    if (ctx.available) {
      return { ...ctx, runId: enqueued.runId };
    }
    await new Promise((r) => setTimeout(r, options.pollIntervalMs));
  }

  const final = await fetchEchonMarketContext(enqueued.threadId, options.pollRequestTimeoutMs);
  if (final.available) return { ...final, runId: enqueued.runId };
  return {
    ...emptyEchonMarketContext('echon_poll_timeout'),
    threadId: enqueued.threadId,
  };
}

export function deriveTargetGroupsFromMarket(
  market: EchonMarketContext,
  projectName: string,
  maxGroups = 2
): TargetGroupSuggestion[] {
  const base = projectName.trim() || 'Projekt';
  const findings = market.keyFindings ?? [];
  if (findings.length > 0) {
    return findings.slice(0, maxGroups).map((finding) => {
      const short = finding.length > 72 ? `${finding.slice(0, 69)}…` : finding;
      return {
        name: `${base} – ${short}`,
        segment: short,
        description:
          (market.executiveSummary ? `${market.executiveSummary}\n\n` : '') +
          `Markt-Finding: ${finding}`,
      };
    });
  }
  if (market.executiveSummary?.trim()) {
    return [
      {
        name: `${base} – Marktsegment`,
        segment: 'Marktsegment',
        description: market.executiveSummary.trim(),
      },
    ];
  }
  return [];
}
