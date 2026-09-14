/**
 * In-process Creation scene quality critic (deterministic).
 * Spec: specs/domain/assistant-creation-mcp.md § Quality gate
 * Wave A1/B: specs/domain/assistant-creation-agi-lite.md
 */

export type CreationQualityToolTrace = {
  name: string;
  preview?: string;
};

export type CreationSceneQualityJob = 'landing' | 'newsletter' | 'print' | 'generic';

export type CreationSceneQualityOptions = {
  /**
   * Format job. `auto` (default) derives from `userPrompt`.
   * Prefer explicit job from craft playbook when available.
   */
  job?: CreationSceneQualityJob | 'auto';
  userPrompt?: string;
};

export type CreationSceneQualityVerdict = {
  pass: boolean;
  findings: string[];
  nudge: string;
  job: CreationSceneQualityJob;
};

const LANDING_JOB_RE =
  /\b(landing|landingpage|startseite|homepage|home\s*page|hero|pdp|product\s*page|lp)\b|\b(bau|build|erstelle|create|gestalte)\w*.*\b(seite|page|webseite|website)\b/i;

const NEWSLETTER_JOB_RE =
  /\b(newsletter|news\s*letter|e-?mail(\s*template)?|mailer|digest|mailing|kampagnen?\s*mail|html\s*mail)\b/i;

const PRINT_JOB_RE =
  /\b(print\s*page|printpage|printcover|print\s*cover|magazin|magazine|brosch[uü]re|flyer|din\s*a4|print\s*report|magazin[\s_-]?pdf|eqc\s*mag|whitepaper|druck)\b/i;

const SEED_CHROME_RE =
  /\b(get started|option a|option b|lorem ipsum|fixture[\s_-]?orange|noto\s*sans)\b|seed-copy|"code"\s*:\s*"seed-copy"/i;

const WEB_CTA_TYPE_RE = /\b(SiteButton|Button|SiteLink|Link)\b/i;

const PRINT_PAGE_RE = /\bPrintPage\b/;

const PRINT_ANY_RE = /\bPrint[A-Z][A-Za-z0-9]*\b/;

const MISSING_CTA_CODE_RE = /missing-cta|"code"\s*:\s*"missing-cta"/i;

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

function tryParseJson(preview: string): unknown | null {
  if (!preview.trim()) return null;
  try {
    return JSON.parse(preview) as unknown;
  } catch {
    return null;
  }
}

function auditHasErrors(preview: string): boolean {
  if (!preview.trim()) return false;
  const parsed = tryParseJson(preview) as {
    ok?: boolean;
    findings?: Array<{ severity?: string; level?: string }>;
  } | null;
  if (parsed) {
    if (parsed.ok === false) return true;
    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    return findings.some((f) => f.severity === 'error' || f.level === 'error');
  }
  return /"ok"\s*:\s*false/.test(preview);
}

function craftThin(preview: string): boolean {
  if (!preview.trim()) return false;
  return /craft-thin/i.test(preview);
}

function craftFlagsInclude(preview: string, code: string): boolean {
  const parsed = tryParseJson(preview) as {
    craftFlags?: unknown;
    bundle?: { craftFlags?: unknown };
  } | null;
  const raw = parsed?.craftFlags ?? parsed?.bundle?.craftFlags;
  if (Array.isArray(raw)) {
    return raw.some((f) => {
      if (typeof f === 'string') return f.toLowerCase().includes(code.toLowerCase());
      if (f && typeof f === 'object' && 'code' in f) {
        return String((f as { code?: unknown }).code ?? '')
          .toLowerCase()
          .includes(code.toLowerCase());
      }
      return false;
    });
  }
  return new RegExp(code, 'i').test(preview);
}

function readSceneStats(preview: string): {
  nodeCount?: number;
  hasLargeDisplay?: boolean;
  hasHeroMedia?: boolean;
  maxFontSizePx?: number | null;
} | null {
  const parsed = tryParseJson(preview) as {
    sceneStats?: Record<string, unknown>;
    bundle?: { sceneStats?: Record<string, unknown> };
  } | null;
  const stats = parsed?.sceneStats ?? parsed?.bundle?.sceneStats;
  if (!stats || typeof stats !== 'object') return null;
  return {
    nodeCount: typeof stats.nodeCount === 'number' ? stats.nodeCount : undefined,
    hasLargeDisplay: typeof stats.hasLargeDisplay === 'boolean' ? stats.hasLargeDisplay : undefined,
    hasHeroMedia: typeof stats.hasHeroMedia === 'boolean' ? stats.hasHeroMedia : undefined,
    maxFontSizePx:
      stats.maxFontSizePx === null
        ? null
        : typeof stats.maxFontSizePx === 'number'
          ? stats.maxFontSizePx
          : undefined,
  };
}

function hasSeedChrome(previews: string[]): boolean {
  return previews.some((p) => SEED_CHROME_RE.test(p));
}

function auditReportsMissingCta(auditPreview: string): boolean {
  if (MISSING_CTA_CODE_RE.test(auditPreview)) return true;
  const parsed = tryParseJson(auditPreview) as {
    findings?: Array<{ code?: string }>;
  } | null;
  if (!parsed?.findings) return false;
  return parsed.findings.some((f) => f.code === 'missing-cta');
}

function outlineHasWebCta(treePreview: string): boolean {
  if (!treePreview.trim()) return false;
  return WEB_CTA_TYPE_RE.test(treePreview);
}

function outlineHasPrintPage(treePreview: string): boolean {
  return PRINT_PAGE_RE.test(treePreview);
}

function outlineHasAnyPrint(treePreview: string): boolean {
  return PRINT_ANY_RE.test(treePreview);
}

/** Web landing: require large display AND hero media (full-bleed fill or large SiteImage). */
function missingLandingHeroMass(craftPreview: string): boolean {
  const stats = readSceneStats(craftPreview);
  if (!stats) {
    return (
      craftFlagsInclude(craftPreview, 'craft-small-type') ||
      craftFlagsInclude(craftPreview, 'craft-no-hero-media') ||
      (/hasLargeDisplay"\s*:\s*false/i.test(craftPreview) ||
        /hasHeroMedia"\s*:\s*false/i.test(craftPreview))
    );
  }
  const nodes = stats.nodeCount ?? 0;
  if (nodes > 0 && nodes < 6) return false;
  const hasDisplay = stats.hasLargeDisplay === true || (stats.maxFontSizePx ?? 0) >= 48;
  const hasMedia = stats.hasHeroMedia === true;
  // Text-only landings (big type, no photo/fill) are not done — agents must ship media mass.
  return !hasDisplay || !hasMedia;
}

/** Newsletter: softer type floor (≥28) or media; still not flat 16px everywhere. */
function missingNewsletterMass(craftPreview: string): boolean {
  const stats = readSceneStats(craftPreview);
  if (!stats) return craftFlagsInclude(craftPreview, 'craft-small-type');
  const nodes = stats.nodeCount ?? 0;
  if (nodes > 0 && nodes < 5) return false;
  const max = stats.maxFontSizePx ?? 0;
  const hasDisplay = stats.hasLargeDisplay === true || max >= 28;
  const hasMedia = stats.hasHeroMedia === true;
  return !hasDisplay && !hasMedia;
}

function pushWebCtaFindings(
  findings: string[],
  opts: { hasAudit: boolean; auditPreview: string; treePreview: string; label: string },
): void {
  const ctaMissingFromAudit = opts.hasAudit && auditReportsMissingCta(opts.auditPreview);
  const ctaMissingFromTree =
    Boolean(opts.treePreview.trim()) && !outlineHasWebCta(opts.treePreview);
  if (ctaMissingFromAudit) {
    findings.push(
      `CTA fehlt — ${opts.label} braucht einen echten Primary-Button/Link (kein Seed-Label).`,
    );
  } else if (ctaMissingFromTree) {
    findings.push(
      `CTA fehlt im Tree — kein SiteButton/Button/Link in der Outline; Primary-CTA für ${opts.label} einfügen.`,
    );
  }
}

/** Exported for playbook / planner reuse (Wave B). */
export function resolveCreationSceneQualityJob(
  options?: CreationSceneQualityOptions,
): CreationSceneQualityJob {
  if (
    options?.job === 'landing' ||
    options?.job === 'newsletter' ||
    options?.job === 'print' ||
    options?.job === 'generic'
  ) {
    return options.job;
  }
  const prompt = options?.userPrompt?.trim() ?? '';
  if (!prompt) return 'generic';
  // Same priority as craft playbooks (specific → broad)
  if (NEWSLETTER_JOB_RE.test(prompt)) return 'newsletter';
  if (PRINT_JOB_RE.test(prompt)) return 'print';
  if (LANDING_JOB_RE.test(prompt)) return 'landing';
  return 'generic';
}

/**
 * Preview tool errors soft-skip the Vision requirement: a called preview that
 * returned `error` counts as attempted. A missing preview call still blocks.
 */
export function previewRequirementMet(traces: CreationQualityToolTrace[]): boolean {
  return called(traces, 'scene_preview');
}

export function evaluateCreationSceneQuality(
  traces: CreationQualityToolTrace[],
  options?: CreationSceneQualityOptions,
): CreationSceneQualityVerdict {
  const job = resolveCreationSceneQualityJob(options);

  if (!wroteScene(traces)) {
    return { pass: true, findings: [], nudge: '', job };
  }

  const findings: string[] = [];
  const hasAudit = called(traces, 'content_audit');
  const hasCraft = called(traces, 'craft_debug');
  const hasPreview = previewRequirementMet(traces);
  const auditPreview = previewOf(traces, (n) => n.includes('content_audit'));
  const craftPreview = previewOf(traces, (n) => n.includes('craft_debug'));
  const treePreview = previewOf(
    traces,
    (n) => n.includes('tree_index') || n.includes('scene_tree'),
  );

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

  if (hasSeedChrome([auditPreview, craftPreview, treePreview])) {
    findings.push(
      'Seed-/Fixture-Chrome — „Get started“ / Option A/B / Fixture-Orange/Noto ersetzen (echte Copy + Brand).',
    );
  }

  if (job === 'landing') {
    if (hasCraft && missingLandingHeroMass(craftPreview) && !craftThin(craftPreview)) {
      findings.push(
        'Hero-Masse fehlt — Display ≥48px UND Full-Bleed Media (Stack backgroundImage url/cover oder großes SiteImage). Text-only Hero ist nicht fertig.',
      );
    }
    if (
      hasCraft &&
      (craftFlagsInclude(craftPreview, 'craft-loose-display-leading') ||
        /hasLooseDisplayLeading"\s*:\s*true/i.test(craftPreview))
    ) {
      findings.push(
        'Display-Fallgefühl — lineHeight ~1.05–1.12 + leicht negatives letterSpacing auf ≥48px Type; Body-1.6 nicht erben (Umbrüche wirken sonst auseinandergezogen).',
      );
    }
    const hasSpirionList = called(traces, 'captures_list');
    const hasSpirionPack = called(traces, 'capture_prompt_pack');
    if (!hasSpirionList && !hasSpirionPack) {
      findings.push(
        'Spirion-Referenz fehlt — spirion_captures_list + spirion_capture_prompt_pack (output_contract both) vor Abschluss; Look/Rhythm aus Captures ableiten (Modul spirion_section_ref_v1).',
      );
    }
    pushWebCtaFindings(findings, {
      hasAudit,
      auditPreview,
      treePreview,
      label: 'Landing',
    });
  }

  if (job === 'newsletter') {
    const hasSpirionList = called(traces, 'captures_list');
    const hasSpirionPack = called(traces, 'capture_prompt_pack');
    if (!hasSpirionList && !hasSpirionPack) {
      findings.push(
        'Spirion-Referenz fehlt — spirion_captures_list + spirion_capture_prompt_pack (output_contract both) vor Abschluss; Look/Rhythm aus Captures ableiten (Modul spirion_section_ref_v1).',
      );
    }
    if (treePreview.trim() && outlineHasAnyPrint(treePreview)) {
      findings.push(
        'Newsletter darf keine Print*-Nodes enthalten — PrintPage/Cover entfernen; Einspalten Site*/HTML nutzen.',
      );
    }
    if (hasCraft && missingNewsletterMass(craftPreview) && !craftThin(craftPreview)) {
      findings.push(
        'Newsletter-Hierarchie fehlt — Headline ≥28px und/oder Hero-Media; nicht alles 16px Fließtext.',
      );
    }
    pushWebCtaFindings(findings, {
      hasAudit,
      auditPreview,
      treePreview,
      label: 'Newsletter',
    });
  }

  if (job === 'print') {
    if (treePreview.trim() && !outlineHasPrintPage(treePreview)) {
      findings.push(
        'Print-Job ohne PrintPage — mind. eine PrintPage anlegen (Cover/Chapter darunter); keine reine Site*-Landing als Druck verkaufen.',
      );
    }
  }

  const unique = [...new Set(findings)];

  if (unique.length === 0) {
    return { pass: true, findings: [], nudge: '', job };
  }

  const nudge = [
    '## CREATION Quality-Gate (nicht fertig)',
    `Job: ${job}`,
    'Der Turn ist noch nicht abgeschlossen. Bitte die Punkte abarbeiten, dann erst antworten.',
    ...unique.map((f, i) => `${i + 1}. ${f}`),
    'Reihenfolge: fehlende Tools parallel aufrufen (audit + craft_debug + preview), dann apply_ops nur für Fixes.',
    'Format beachten: Landing=Web-Hero · Newsletter=Einspalte ohne Print* · Print=PrintPage-Stack.',
    'Nicht fertig melden bei Seed-Copy, Fixture-Orange/Noto, fehlendem CTA, oder dünnem Hero (ohne Foto-Fill).',
    'Landing-Default: background-image Scrim+url am Hero-Stack, Overlay-Copy — kein absolute HTML-Import.',
  ].join('\n');

  return { pass: false, findings: unique, nudge, job };
}
