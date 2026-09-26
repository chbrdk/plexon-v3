import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
  type AssistantPageContext,
} from '@/lib/assistant/page-context';
import { JEV_USE_CASES, questionsWriteIntent } from '@/lib/jev/catalog';
import { scheduleJevShadow } from '@/lib/jev/schedule';

const SCENE_WRITE_VERB_PATTERNS = [
  /\b(füge|einfüg\w*|hinzufüg\w*|insert|add|append)\b/i,
  /\b(ändere|änder\w*|bearbeit\w*|anpass\w*|edit|update|setze|setz\w*|ergänz\w*)\b/i,
  /\b(baue|bau\w*|build|erstell\w*|create|generier\w*|generate)\b/i,
  /\b(entfern\w*|lösch\w*|delete|remove|verschieb\w*|move)\b/i,
  /\b(wiederhol\w*|duplizier\w*|kopier\w*|replace)\b/i,
];

const SCENE_WRITE_CONFIRM_PATTERNS =
  /\b(ja|yes|bitte|mach\s+(das|es)|go\s+ahead|umsetz\w*|los|mach\s+es)\b/i;

export function hasCreationEditorSceneContext(
  pageContext: AssistantPageContext | null | undefined,
): boolean {
  return (
    pageContext?.product === 'creation' &&
    (pageContext.capability === ASSISTANT_CAPABILITY_CREATION_EDITOR ||
      pageContext.entityType === ASSISTANT_ENTITY_COMPOSITION_SCENE ||
      pageContext.pathname.startsWith('/editor')) &&
    pageContext.entityType === ASSISTANT_ENTITY_COMPOSITION_SCENE &&
    Boolean(pageContext.entityId)
  );
}

/** Detect prompts that should enable CREATION scene_apply_ops write MCP tools. */
export function hasSceneWriteIntent(
  text: string,
  pageContext?: AssistantPageContext | null,
): boolean {
  const trimmed = text.trim();
  let result = false
  if (trimmed) {
    if (SCENE_WRITE_VERB_PATTERNS.some((p) => p.test(trimmed))) result = true
    else if (
      hasCreationEditorSceneContext(pageContext) &&
      SCENE_WRITE_CONFIRM_PATTERNS.test(trimmed)
    ) {
      result = true
    }
  }
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.assistantSceneWriteIntent,
    state: { prompt: trimmed.slice(0, 1500), hasEditor: hasCreationEditorSceneContext(pageContext) },
    questions: questionsWriteIntent('scene'),
    baseline: result,
    extractNoulKey: 'write',
  })
  return result
}
