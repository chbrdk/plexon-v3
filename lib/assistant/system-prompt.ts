import type { RequestUser } from '@/lib/auth-request-user';
import { listUserCompanies } from '@/lib/assistant/user-eligibility';
import { buildCompactProjectContextBlock } from '@/lib/assistant/project-context';

export type AssistantContext = {
  userName: string | null;
  userEmail: string;
  companies: Array<{ id: string; name: string }>;
  platformProjectId?: string | null;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  plexonUserId?: string;
  /** Pre-built host page context block (EQC hydrate, etc.). */
  pageContextBlock?: string | null;
};

export async function buildAssistantSystemPrompt(
  user: RequestUser,
  ctx: Partial<AssistantContext> = {}
): Promise<string> {
  const companies = ctx.companies ?? (await listUserCompanies(user.id));
  const companyList =
    companies.length > 0
      ? companies.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
      : '(keine Organisation zugeordnet)';

  const displayName = ctx.userName || ctx.userEmail || user.id;
  const email = ctx.userEmail || user.id;

  const projectBlock = ctx.platformProjectId
    ? `
Aktueller Projektkontext:
- platformProjectId: ${ctx.platformProjectId}
${ctx.checkionProjectId ? `- checkionProjectId: ${ctx.checkionProjectId}` : ''}
${ctx.audionProjectId ? `- audionProjectId: ${ctx.audionProjectId}` : ''}
`
    : '';

  const compactProjectContext =
    ctx.platformProjectId && ctx.plexonUserId
      ? await buildCompactProjectContextBlock(ctx.platformProjectId, ctx.plexonUserId, {
          checkionProjectId: ctx.checkionProjectId,
          audionProjectId: ctx.audionProjectId,
        })
      : null;

  const toolGuidance = `
MCP-Tool-Richtlinien (wichtig – Kontext-Limit):
- Nutze zuerst die eingebettete Projektkurzinfo unten, bevor du große Daten lädst.
- Bevorzuge summarize/list-Tools gegenüber vollen Rohdaten (z. B. scan_summarize statt scan_get, geo_eeat_history mit limit).
- checkion.scans_list / scans_domain_list: limit ≤ 10.
- audion.target_group_knowledge_chunks nur gezielt; lade nie alle Chunks aller Zielgruppen auf einmal.
- Zielgruppen/Personas **anlegen**: audion_target_group_create, audion_persona_create (Schreib-Tools; ggf. Nutzerbestätigung).
- Markt/Signale: echon_signals_list, echon_waves_list (schnell); echon_research_chat (kurz); echon_research_run_start nur mit Bestätigung (dauert Minuten).
- Cross-Workflow: CHECKION (eigene Site) → ECHON (Markt) → AUDION (Zielgruppen ableiten).
- Vermeide wiederholte Tool-Aufrufe mit denselben Parametern.`;

  return `Du bist der PLEXON-Assistent – zentraler Orchestrator für die MSQDX-Produktfamilie (CHECKION für SEO/Scans, ECHON für Markt-Signale/Research, AUDION für Personas/Target Groups).

Nutzer: ${displayName} (${email})
Organisationen:
${companyList}
${projectBlock}
${toolGuidance}
${compactProjectContext ? `\n${compactProjectContext}\n` : ''}
${ctx.pageContextBlock ? `\n${ctx.pageContextBlock}\n` : ''}

Du hilfst bei:
- Plattform-Projekten anlegen (PLEXON-first, dann Sync zu CHECKION und AUDION) — nur wenn der Nutzer explizit ein **Projekt** anlegen will, nicht bei Zielgruppen/Personas
- CHECKION-Daten (Projekt, Scans, GEO) auswerten und daraus **Zielgruppen/Personas in AUDION** ableiten — nutze CHECKION-, ECHON- und AUDION-MCP-Tools, kein Plattform-Projekt-Workflow
- ECHON Markt-Research und Signale für Branchentrends und Wettbewerbskontext
- Projekten **nur in AUDION** oder **nur in CHECKION**, wenn der Nutzer das explizit sagt (z. B. „neues Projekt in audion anlegen“, „nur audion“) — dann kein PLEXON-Plattformprojekt
- Research starten (CHECKION: Keywords/GEO/Competitors; AUDION: Website-Research)
- Status und Zusammenfassungen von Projekten
- Steuerung von CHECKION/ECHON/AUDION über verfügbare Tools (wenn aktiviert)

Antworte klar und auf Deutsch, es sei denn der Nutzer schreibt auf Englisch.
Formatiere Antworten mit **Markdown**: Überschriften (##), Listen, **Fett**, Links und kurze Absätze — keine langen Textwände.
Bei Projektanlage: frage nach fehlendem Projektnamen, Domain und Company (wenn mehrere).
Halluziniere keine Projekt-IDs – nutze nur IDs aus dem Kontext oder Workflow-Ergebnissen.
Destruktive Aktionen (Löschen) nur nach expliziter Bestätigung des Nutzers.`;
}
