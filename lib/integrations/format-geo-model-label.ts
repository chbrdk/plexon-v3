/** Display label for CHECKION competitiveByModel keys (gpt-5.4, claude-*, gemini-*). */
export function formatGeoModelLabel(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed || trimmed === 'default') return 'Standard';
  return trimmed
    .replace(/^gpt-/i, 'GPT ')
    .replace(/^claude-/i, 'Claude ')
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/-/g, ' ')
    .slice(0, 32);
}

export function sortGeoModelIds(modelIds: string[]): string[] {
  return [...modelIds].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
}
