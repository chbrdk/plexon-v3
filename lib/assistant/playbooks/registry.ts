import type { PlaybookDefinition } from '@/lib/assistant/playbooks/types';

const playbooks = new Map<string, PlaybookDefinition>();

export function registerPlaybook(definition: PlaybookDefinition): void {
  playbooks.set(definition.id, definition);
}

export function getPlaybook(id: string): PlaybookDefinition | undefined {
  return playbooks.get(id);
}

export function listPlaybooks(): PlaybookDefinition[] {
  return [...playbooks.values()];
}
