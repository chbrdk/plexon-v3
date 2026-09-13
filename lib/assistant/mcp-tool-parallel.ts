/**
 * Parallel-safe MCP reads vs serial writes for one assistant tool round.
 * Spec: specs/domain/assistant-creation-mcp.md § Latency / Quality gate
 */

const SERIAL_WRITE =
  /(?:^|_)(apply_ops|import_html|composition_save|page_save|scan_single|scan_domain|generate|create|patch|upsert|delete|ingest|detect|start)(?:_|$)/i;

export function isParallelSafeAssistantTool(toolName: string): boolean {
  const n = toolName.trim();
  if (!n) return false;
  if (/^plexon_ui_/.test(n)) return false;
  if (SERIAL_WRITE.test(n.replace(/\./g, '_'))) return false;
  return true;
}

/** True when every tool in the round can run concurrently. */
export function shouldRunAssistantToolsInParallel(toolNames: string[]): boolean {
  if (toolNames.length < 2) return false;
  return toolNames.every(isParallelSafeAssistantTool);
}
