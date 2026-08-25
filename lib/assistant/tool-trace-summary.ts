/**
 * Compact tool-call spur for Creation/Spirion landing turns (message metadata).
 * Spec: specs/domain/assistant-spirion-mcp.md § Craft debug
 */

export type AssistantToolTraceEntry = {
  name: string;
  preview?: string;
};

export type AssistantToolTraceSummary = {
  tools: string[];
  spirion: {
    capturesListCalled: boolean;
    capturePromptPackCalled: boolean;
    captureIds: string[];
  };
  creation: {
    importHtmlCalled: boolean;
    contentAuditCalled: boolean;
    previewCalled: boolean;
  };
};

const CAPTURE_ID_RE = /cap_[a-z0-9]+/gi;

export function summarizeAssistantToolTrace(
  entries: AssistantToolTraceEntry[],
): AssistantToolTraceSummary {
  const tools: string[] = [];
  const seen = new Set<string>();
  const captureIds = new Set<string>();
  let capturesListCalled = false;
  let capturePromptPackCalled = false;
  let importHtmlCalled = false;
  let contentAuditCalled = false;
  let previewCalled = false;

  for (const e of entries) {
    const name = e.name.trim();
    if (!name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      tools.push(name);
    }
    const n = name.toLowerCase().replace(/\./g, '_');
    if (n.includes('captures_list')) capturesListCalled = true;
    if (n.includes('capture_prompt_pack')) {
      capturePromptPackCalled = true;
      const preview = e.preview ?? '';
      for (const m of preview.matchAll(CAPTURE_ID_RE)) {
        captureIds.add(m[0]!);
      }
    }
    if (n.includes('import_html')) importHtmlCalled = true;
    if (n.includes('content_audit')) contentAuditCalled = true;
    if (n.includes('scene_preview') && !n.includes('preview_html')) previewCalled = true;
  }

  return {
    tools,
    spirion: {
      capturesListCalled,
      capturePromptPackCalled,
      captureIds: [...captureIds].slice(0, 8),
    },
    creation: {
      importHtmlCalled,
      contentAuditCalled,
      previewCalled,
    },
  };
}
