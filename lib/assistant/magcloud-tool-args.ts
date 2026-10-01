import type { AssistantPageContext } from '@/lib/assistant/page-context';

/**
 * Inject actorUserId (and optional board from page context) into Magcloud MCP tool args.
 */
export function injectMagcloudToolArgs(
  toolName: string,
  args: Record<string, unknown>,
  ctx: {
    actorUserId?: string | null;
    pageContext?: Pick<AssistantPageContext, 'product' | 'entityId' | 'entityType'> | null;
  },
): Record<string, unknown> {
  if (!toolName.startsWith('magcloud_') && !toolName.startsWith('magcloud.')) {
    return args;
  }
  const next = { ...args };
  const actor = (ctx.actorUserId || '').trim();
  if (actor && next.actorUserId == null) next.actorUserId = actor;
  const boardFromCtx =
    ctx.pageContext?.product === 'magcloud' &&
    (ctx.pageContext.entityType === 'board' || ctx.pageContext.entityType === 'project')
      ? String(ctx.pageContext.entityId || '').trim()
      : '';
  if (
    boardFromCtx &&
    (toolName.includes('board_get') ||
      toolName.includes('board_summarize') ||
      toolName.includes('slides_search')) &&
    next.boardName == null &&
    next.boardId == null
  ) {
    if (toolName.includes('slides_search')) next.boardId = boardFromCtx;
    else next.boardName = boardFromCtx;
  }
  return next;
}
