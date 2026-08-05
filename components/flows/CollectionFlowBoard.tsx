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
  getAudionWebOrigin,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import { buildAudionStudyUrl } from '@/lib/audion-admin-launch-url'
import { pathCheckionScanIssues, pathCheckionScanResult } from '@/lib/paths/checkion-api'
import {
  documentHasJourneySegment,
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
  states: Record<string, CollectionFlowNodeRunState>,
  verdict?: CollectionVerdict | null
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
  const activeIssue =
    verdict?.issueGateBranch === 'pass'
      ? 'e-issues-ok'
      : verdict?.issueGateBranch === 'fail'
        ? 'e-issues-abandon'
        : null
  const activeScore =
    verdict?.status === 'complete'
      ? verdict.scorePassed
        ? 'e-score-issues'
        : 'e-score-abandon'
      : null
  const edges: Edge[] = doc.edges.map((e) => {
    const taken =
      e.id === activeIssue ||
      (activeScore && e.id === activeScore) ||
      (verdict?.scorePassed && e.id === 'e-score-ok' && !doc.nodes.some((n) => n.kind === 'issue_gate'))
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? e.when,
      animated: Boolean(taken),
      style: {
        stroke: taken
          ? 'var(--msqdx-accent, #c4a35a)'
          : 'var(--msqdx-border-strong, #666)',
        strokeWidth: taken ? 2 : 1,
      },
    }
  })
  return { nodes, edges }
}

function BoardInner({ platformProjectId, initial }: Props) {
  const [flow, setFlow] = useState(initial)
  const [nodeStates, setNodeStates] = useState<Record<string, CollectionFlowNodeRunState>>(
    () => {
      const v = initial.flow.lastVerdict
      if (!v) return {}
      return nodeStatesFromVerdict(initial.flow, v, initial.flow.lastRun)
    }
  )
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasJourney = documentHasJourneySegment(flow.flow)
  const verdict: CollectionVerdict | null | undefined = flow.flow.lastVerdict
  const lastRun = flow.flow.lastRun

  const { nodes, edges } = useMemo(
    () => toRf(flow.flow, nodeStates, verdict),
    [flow.flow, nodeStates, verdict]
  )

  const run = useCallback(async () => {
    setRunning(true)
    setError(null)
    setNodeStates((prev) => ({
      ...prev,
      'n-start': 'done',
      ...(hasJourney
        ? { 'n-journey': 'running', 'n-scan': 'idle' }
        : { 'n-scan': 'running' }),
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
      setNodeStates((prev) => ({
        ...prev,
        ...(hasJourney ? { 'n-journey': 'error' } : { 'n-scan': 'error' }),
      }))
    } finally {
      setRunning(false)
    }
  }, [flow.id, hasJourney, platformProjectId])

  const studyHref =
    lastRun?.audionStudyId != null
      ? buildAudionStudyUrl(getAudionWebOrigin(), lastRun.audionStudyId)
      : null
  const scanHref = lastRun?.scanId ? pathCheckionScanResult(lastRun.scanId) : null
  const issuesHref = lastRun?.scanId ? pathCheckionScanIssues(lastRun.scanId) : null

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
            {lastRun
              ? [
                  `Last run · ${lastRun.status}`,
                  lastRun.overallScore != null ? `score ${lastRun.overallScore}` : null,
                  lastRun.issueGateBranch
                    ? `issueGate ${lastRun.issueGateBranch}`
                    : null,
                  lastRun.criticalCount != null
                    ? `${lastRun.criticalCount} critical`
                    : null,
                  lastRun.waveRollupOk === true
                    ? 'wave rollup ok'
                    : lastRun.waveEvaluateOk === false
                      ? 'wave evaluate failed'
                      : lastRun.waveRollupOk === false
                        ? 'wave rollup failed'
                        : null,
                  lastRun.knowledgeDistillateOk === true
                    ? 'KP distillate ok'
                    : lastRun.knowledgeDistillateOk === false
                      ? 'KP distillate failed'
                      : null,
                  lastRun.audionJobId ? `job ${lastRun.audionJobId}` : null,
                  lastRun.scanId ? `scan ${lastRun.scanId}` : null,
                  lastRun.stepUrl ? `step ${lastRun.stepUrl}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : hasJourney
                ? 'Journey + quality: start → journey → scan → gates'
                : 'Quality path: start → scan → score_gate → terminal'}
          </Text>
          {(studyHref || scanHref || issuesHref) && (
            <div className="plexon-flow-strip-links">
              {studyHref ? (
                <a href={studyHref} target="_blank" rel="noreferrer">
                  Open in AUDION
                </a>
              ) : null}
              {scanHref ? (
                <a href={scanHref} target="_blank" rel="noreferrer">
                  Open CHECKION scan
                </a>
              ) : null}
              {issuesHref ? (
                <a href={issuesHref} target="_blank" rel="noreferrer">
                  Open Issues dossier
                </a>
              ) : null}
            </div>
          )}
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
