import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
  type AssistantPageContext,
} from '@/lib/assistant/page-context';

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
  if (!trimmed) return false;
  if (SCENE_WRITE_VERB_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (hasCreationEditorSceneContext(pageContext) && SCENE_WRITE_CONFIRM_PATTERNS.test(trimmed)) {
    return true;
  }
  return false;
}
