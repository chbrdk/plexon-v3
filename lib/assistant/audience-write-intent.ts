/** Detect prompts that should enable AUDION target-group/persona write MCP tools. */

const WRITE_VERB_PATTERN =
  /\b(starte|start|erstelle|create|generiere|generate|lösche|delete|anleg\w*|ableit\w*)\b/i;

const AUDIENCE_ENTITY_PATTERN = /\b(zielgruppe|zielgruppen|target\s*groups?|personas?)\b/i;

export function hasAudienceWriteIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!AUDIENCE_ENTITY_PATTERN.test(trimmed) && !/\baudion\b/i.test(trimmed)) {
    return false;
  }
  return (
    WRITE_VERB_PATTERN.test(trimmed) ||
    /\b(anleg|ableit|erstell|generier|bootstrap)\w*/i.test(trimmed)
  );
}

export function buildPlanningPromptFromConversation(
  history: Array<{ role: string; content: string }>,
  currentPrompt: string,
  maxUserMessages = 4
): string {
  const userTexts = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean);
  const recent = userTexts.slice(-maxUserMessages);
  const current = currentPrompt.trim();
  if (current && !recent.includes(current)) {
    recent.push(current);
  }
  return recent.join('\n');
}
