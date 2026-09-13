/**
 * In-process Creation scene quality critic (deterministic).
 * Spec: specs/domain/assistant-creation-mcp.md § Quality gate
 */

export type CreationQualityToolTrace = {
  name: string;
  preview?: string;
};

export type CreationSceneQualityVerdict = {
  pass: boolean;
  findings: string[];
  nudge: string;
};

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '_');
}

function previewOf(
  traces: CreationQualityToolTrace[],
  match: (n: string) => boolean,
): string {
  for (let i = traces.length - 1; i >= 0; i--) {
    const t = traces[i];
    if (!t) continue;
    if (match(normalizeToolName(t.name))) return t.preview ?? '';
  }
  return '';
}

function called(traces: CreationQualityToolTrace[], needle: string): boolean {
  return traces.some((t) => normalizeToolName(t.name).includes(needle));
}

function wroteScene(traces: CreationQualityToolTrace[]): boolean {
  return traces.some((t) => {
    const n = normalizeToolName(t.name);
    return (
      n.includes('import_html') ||
      n.includes('apply_ops') ||
      n.includes('site_kit_page_save') ||
      n.includes('site_kit_composition_save')
    );
  });
}

function auditHasErrors(preview: string): boolean {
  if (!preview.trim()) return false;
  try {
    const parsed = JSON.parse(preview) as {
      ok?: boolean;
      findings?: Array<{ severity?: string; level?: string }>;
    };
    if (parsed.ok === false) return true;
    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    return findings.some((f) => f.severity === 'error' || f.level === 'error');
  } catch {
    return /"ok"\s*:\s*false/.test(preview);
  }
}

function craftThin(preview: string): boolean {
  if (!preview.trim()) return false;
  return /craft-thin/i.test(preview);
}

export function evaluateCreationSceneQuality(
  traces: CreationQualityToolTrace[],
): CreationSceneQualityVerdict {
  if (!wroteScene(traces)) {
    return { pass: true, findings: [], nudge: '' };
  }

  const findings: string[] = [];
  const hasAudit = called(traces, 'content_audit');
  const hasCraft = called(traces, 'craft_debug');
  const hasPreview = called(traces, 'scene_preview');
  const auditPreview = previewOf(traces, (n) => n.includes('content_audit'));
  const craftPreview = previewOf(traces, (n) => n.includes('craft_debug'));

  if (!hasAudit) {
    findings.push('creation_scene_content_audit fehlt — Seed-Copy / PDP-Fehler nicht geprüft.');
  } else if (auditHasErrors(auditPreview)) {
    findings.push('content_audit hat error-Findings — vor Abschluss per set_prop / insert_child fixen.');
  }

  if (!hasCraft) {
    findings.push('creation_scene_craft_debug fehlt — Dichte/craft-thin nicht geprüft.');
  } else if (craftThin(craftPreview)) {
    findings.push('craft-thin — Type-Scale, Surfaces, Hero-Masse oder Grid nachziehen (kein Wireframe).');
  }

  if (!hasPreview) {
    findings.push('creation_scene_preview fehlt — Pixel/Vision-Check nicht gelaufen.');
  }

  if (findings.length === 0) {
    return { pass: true, findings: [], nudge: '' };
  }

  const nudge = [
    '## CREATION Quality-Gate (nicht fertig)',
    'Der Turn ist noch nicht abgeschlossen. Bitte die Punkte abarbeiten, dann erst antworten.',
    ...findings.map((f, i) => `${i + 1}. ${f}`),
    'Reihenfolge: fehlende Tools parallel aufrufen (audit + craft_debug + preview), dann apply_ops nur für Fixes.',
    'Nicht fertig melden bei Seed-Copy, Fixture-Orange/Noto, oder dünnem Hero.',
  ].join('\n');

  return { pass: false, findings, nudge };
}
