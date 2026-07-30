import { apiAssistantWorkflowStream } from '@/lib/constants';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import type { WorkflowStreamHandlers } from '@/lib/assistant/workflow-stream';

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export function subscribeAssistantWorkflowStream(
  runId: string,
  handlers: WorkflowStreamHandlers
): EventSource {
  const es = new EventSource(apiAssistantWorkflowStream(runId));

  es.addEventListener('workflow', (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data);
      handlers.onWorkflow?.(data);
    } catch {
      /* ignore */
    }
  });

  es.addEventListener('ui_block_update', (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data) as {
        type: string;
        block: UiBlock;
      };
      if (data.block?.type === 'step_list') {
        handlers.onUiBlockUpdate?.(data.block);
      }
    } catch {
      /* ignore */
    }
  });

  es.addEventListener('done', (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data) as { status?: string };
      handlers.onDone?.(data.status ?? 'completed');
    } catch {
      handlers.onDone?.('completed');
    }
    es.close();
  });

  es.onerror = () => es.close();

  return es;
}

export type { WorkflowStep };
