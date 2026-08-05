'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Alert, Button, Spinner, Text } from '@msqdx/ui'
import { FloatingPanel } from '@/lib/msqdx-ui'
import {
  apiPlatformProjectFlowRun,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import {
  nodeStatesFromVerdict,
  type CollectionFlowNodeRunState,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'
import { CollectionFlowNode, type CollectionFlowRfNodeData } from './CollectionFlowNode'
import { CollectionFlowVerdictCard } from './CollectionFlowVerdictCard'

const nodeTypes = { collectionFlow: CollectionFlowNode }

type Props = {
  platformProjectId: string
  initial: CollectionTestFlowResponse
}

function toRf(
  doc: CollectionTestFlowDocument,
  states: Record<string, CollectionFlowNodeRunState>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = doc.nodes.map((n) => ({
    id: n.id,
    type: 'collectionFlow',
    position: n.position ?? { x: 0, y: 0 },
    data: {
      kind: n.kind,
      label: n.label,
      detail: n.url ?? (n.threshold != null ? `≥ ${n.threshold}` : undefined),
      runState: states[n.id] ?? 'idle',
    } satisfies CollectionFlowRfNodeData,
  }))
  const edges: Edge[] = doc.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? e.when,
    style: { stroke: 'var(--msqdx-border-strong, #666)' },
  }))
  return { nodes, edges }
}

function BoardInner({ platformProjectId, initial }: Props) {
  const [flow, setFlow] = useState(initial)
  const [nodeStates, setNodeStates] = useState<Record<string, CollectionFlowNodeRunState>>(
    () => {
      const v = initial.flow.lastVerdict
      if (!v) return {}
      return nodeStatesFromVerdict(initial.flow, v)
    }
  )
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { nodes, edges } = useMemo(
    () => toRf(flow.flow, nodeStates),
    [flow.flow, nodeStates]
  )

  const verdict: CollectionVerdict | null | undefined = flow.flow.lastVerdict

  const run = useCallback(async () => {
    setRunning(true)
    setError(null)
    setNodeStates((prev) => ({
      ...prev,
      'n-start': 'done',
      'n-scan': 'running',
      'n-score': 'idle',
      'n-ok': 'idle',
      'n-abandon': 'idle',
    }))
    try {
      const res = await fetch(apiPlatformProjectFlowRun(platformProjectId, flow.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = (await res.json().catch(() => null)) as {
        error?: string
        flow?: CollectionTestFlowResponse
        verdict?: CollectionVerdict
        nodeStates?: Record<string, CollectionFlowNodeRunState>
      } | null
      if (!res.ok) {
        throw new Error(json?.error || `Run failed (${res.status})`)
      }
      if (json?.flow) setFlow(json.flow)
      if (json?.nodeStates) setNodeStates(json.nodeStates)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setNodeStates((prev) => ({ ...prev, 'n-scan': 'error' }))
    } finally {
      setRunning(false)
    }
  }, [flow.id, platformProjectId])

  return (
    <div className="plexon-flow-board">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!running}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <FloatingPanel
        storageKey={`plexon.flow.toolbar.${flow.id}`}
        defaultEdge="top"
        defaultOffset={16}
        variant="toolbar"
        surface="solid"
        ariaLabel="Flow toolbar"
        className="plexon-flow-float"
      >
        <div className="plexon-flow-toolbar">
          <Link
            href={pathPlatformProjectFlows(platformProjectId)}
            className="plexon-flow-back"
          >
            ← Flows
          </Link>
          <Text role="title" as="span" className="plexon-flow-toolbar-title">
            {flow.name}
          </Text>
          <Button
            variant="primary"
            size="md"
            disabled={running}
            onClick={() => void run()}
          >
            {running ? (
              <>
                <Spinner size="sm" /> Testen…
              </>
            ) : (
              'Testen'
            )}
          </Button>
        </div>
      </FloatingPanel>

      <FloatingPanel
        storageKey={`plexon.flow.strip.${flow.id}`}
        defaultEdge="bottom"
        defaultOffset={16}
        variant="strip"
        surface="solid"
        ariaLabel="Run strip"
        className="plexon-flow-float"
      >
        <div className="plexon-flow-strip">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Text role="meta" as="p">
            {flow.flow.lastRun
              ? `Last run · ${flow.flow.lastRun.status}` +
                (flow.flow.lastRun.overallScore != null
                  ? ` · score ${flow.flow.lastRun.overallScore}`
                  : '') +
                (flow.flow.lastRun.scanId ? ` · ${flow.flow.lastRun.scanId}` : '')
              : 'Quality path: start → scan → score_gate → terminal'}
          </Text>
        </div>
      </FloatingPanel>

      <FloatingPanel
        storageKey={`plexon.flow.verdict.${flow.id}`}
        defaultEdge="right"
        defaultOffset={24}
        variant="panel"
        surface="solid"
        title="Verdict"
        ariaLabel="Collection verdict"
        className="plexon-flow-float"
      >
        <CollectionFlowVerdictCard verdict={verdict} />
      </FloatingPanel>
    </div>
  )
}

export function CollectionFlowBoard(props: Props) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  )
}
