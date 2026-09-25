import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { resolveFlowRow } from '@/lib/assistant/workflows/run-collection-flow';
import { executePlexonCollectionFlowRunCapability } from '@/lib/capabilities/executors/plexon-collection-flow-run';
import { runCollectionFlowFromAssistant } from '@/lib/assistant/workflows/run-collection-flow';
import { listAssistantCollectionFlows } from '@/lib/assistant/workflows/run-collection-flow';
import { isSessionOwnedFlowTrigger } from '@/lib/collection-flow-run-triggers';

vi.mock('@/lib/assistant/workflows/run-collection-flow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assistant/workflows/run-collection-flow')>();
  return {
    ...actual,
    listAssistantCollectionFlows: vi.fn(),
    runCollectionFlowFromAssistant: vi.fn(),
  };
});

describe('Wave C2 — run collection flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes list and start flow intents', () => {
    expect(routeAssistantIntent('Zeige die Flows').type).toBe('run_collection_flow');
    expect(routeAssistantIntent('Welche Flows gibt es?')).toMatchObject({
      type: 'run_collection_flow',
      listOnly: true,
    });

    const byId = routeAssistantIntent(
      'Starte Flow aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    );
    expect(byId).toMatchObject({
      type: 'run_collection_flow',
      flowId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });

    const byName = routeAssistantIntent('Starte Flow "Page Quality"');
    expect(byName).toMatchObject({
      type: 'run_collection_flow',
      flowName: 'Page Quality',
    });
  });

  it('does not steal research intents', () => {
    expect(routeAssistantIntent('Starte Recherche für das Projekt').type).toBe('start_research');
  });

  it('resolveFlowRow matches id and unique name', () => {
    const rows = [
      {
        id: 'f1',
        name: 'Page Quality',
        platformProjectId: 'pp',
        templateId: 'page-quality',
      },
      {
        id: 'f2',
        name: 'Journey Quality',
        platformProjectId: 'pp',
        templateId: 'journey-quality',
      },
    ] as never[];
    expect(resolveFlowRow({ rows, flowId: 'f2' })?.id).toBe('f2');
    expect(resolveFlowRow({ rows, flowName: 'page quality' })?.id).toBe('f1');
    expect(resolveFlowRow({ rows, flowName: 'quality' })).toBeNull();
  });

  it('session-owned triggers include assistant', () => {
    expect(isSessionOwnedFlowTrigger('ui')).toBe(true);
    expect(isSessionOwnedFlowTrigger('assistant')).toBe(true);
    expect(isSessionOwnedFlowTrigger('service')).toBe(false);
  });

  it('capability auto-runs the only flow when id/name missing', async () => {
    vi.mocked(listAssistantCollectionFlows).mockResolvedValue([
      { id: 'f1', name: 'Page Quality', templateId: 'page-quality' },
    ]);
    vi.mocked(runCollectionFlowFromAssistant).mockResolvedValue({
      ok: true,
      flowId: 'f1',
      flowName: 'Page Quality',
      historyRunId: 'run-1',
      boardPath: '/projects/pp-1/flows/f1',
      status: 'complete',
      verdict: {
        status: 'pass',
        summary: 'OK',
        collectionReady: true,
      } as never,
      lastRun: { status: 'completed' } as never,
    });

    const result = await executePlexonCollectionFlowRunCapability(
      { platformProjectId: 'pp-1' },
      { source: 'agent', platformProjectId: 'pp-1' }
    );
    expect(result.ok).toBe(true);
    expect(result.agentPayload).toMatchObject({
      variant: 'run',
      flowId: 'f1',
      autoResolved: true,
    });
    expect(runCollectionFlowFromAssistant).toHaveBeenCalledWith(
      expect.objectContaining({ flowId: 'f1', flowName: 'Page Quality' })
    );
  });

  it('capability picks specialist-matched flow without explicit id/name', async () => {
    vi.mocked(listAssistantCollectionFlows).mockResolvedValue([
      { id: 'f1', name: 'Page Quality Scan', templateId: 'page-quality' },
      { id: 'f2', name: 'GEO Trust', templateId: 'geo-eeat' },
    ]);
    vi.mocked(runCollectionFlowFromAssistant).mockResolvedValue({
      ok: true,
      flowId: 'f1',
      flowName: 'Page Quality Scan',
      historyRunId: 'run-2',
      boardPath: '/projects/pp-1/flows/f1',
      status: 'complete',
      verdict: { status: 'pass', summary: 'OK', collectionReady: true } as never,
      lastRun: { status: 'completed' } as never,
    });

    const result = await executePlexonCollectionFlowRunCapability(
      {
        platformProjectId: 'pp-1',
        specialistIntent: 'checkion_scan',
      },
      { source: 'agent', platformProjectId: 'pp-1' }
    );
    expect(result.ok).toBe(true);
    expect(result.agentPayload).toMatchObject({
      variant: 'run',
      flowId: 'f1',
      autoResolved: true,
    });
  });

  it('capability lists flows when specialist match is ambiguous', async () => {
    vi.mocked(listAssistantCollectionFlows).mockResolvedValue([
      { id: 'f1', name: 'Deep Scan A', templateId: 'scan-a' },
      { id: 'f2', name: 'Deep Scan B', templateId: 'scan-b' },
    ]);

    const result = await executePlexonCollectionFlowRunCapability(
      { platformProjectId: 'pp-1', specialistIntent: 'checkion_scan' },
      { source: 'agent', platformProjectId: 'pp-1' }
    );
    expect(result.ok).toBe(false);
    expect(result.agentPayload).toMatchObject({
      variant: 'list',
      flows: [{ id: 'f1' }, { id: 'f2' }],
    });
    expect(runCollectionFlowFromAssistant).not.toHaveBeenCalled();
  });

  it('capability runs flow when flowId set', async () => {
    vi.mocked(runCollectionFlowFromAssistant).mockResolvedValue({
      ok: true,
      flowId: 'f1',
      flowName: 'Page Quality',
      historyRunId: 'run-1',
      boardPath: '/projects/pp-1/flows/f1',
      status: 'complete',
      verdict: {
        status: 'pass',
        summary: 'OK',
        collectionReady: true,
      } as never,
      lastRun: { status: 'completed' } as never,
    });

    const result = await executePlexonCollectionFlowRunCapability(
      { platformProjectId: 'pp-1', flowId: 'f1', url: 'https://a.test' },
      { source: 'agent', platformProjectId: 'pp-1' }
    );
    expect(result.ok).toBe(true);
    expect(result.agentPayload).toMatchObject({
      variant: 'run',
      flowId: 'f1',
      historyRunId: 'run-1',
      collectionReady: true,
    });
    expect(runCollectionFlowFromAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        platformProjectId: 'pp-1',
        flowId: 'f1',
        url: 'https://a.test',
      })
    );
  });
});
