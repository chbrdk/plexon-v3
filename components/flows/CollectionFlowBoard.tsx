'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Button,
  Chip,
  FlowBoardPalette,
  FlowBoardStage,
  FlowBoardToolbar,
  FlowRunStrip,
  Text,
} from '@msqdx/ui'
import {
  apiPlatformProjectFlow,
  apiPlatformProjectFlowHybridSegment,
  apiPlatformProjectFlowJourneyGateBranch,
  apiPlatformProjectFlowJourneyJob,
  apiPlatformProjectFlowRun,
  apiPlatformProjectFlowRunJourney,
  apiPlatformProjectFlowWaveSummary,
  getAudionWebOrigin,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import { buildAudionStudyUrl, buildAudionStudyWaveUrl } from '@/lib/audion-admin-launch-url'
import { pathCheckionGeoOverview, pathCheckionScanIssues, pathCheckionScanResult } from '@/lib/paths/checkion-api'
import {
  documentHasJourneySegment,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  startNodeUrl,
  type CollectionFlowNode,
  type CollectionFlowNodeKind,
  type CollectionFlowNodeRunState,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow'
import {
  PALETTE_JOURNEY_KINDS,
  PALETTE_QUALITY_KINDS,
  edgeKindLabel,
  flowToRf,
  newCollectionFlowNode,
  nextEdgeKindForSource,
  rfToDocument,
  type CollectionFlowRfEdge,
  type CollectionFlowRfNode as CollectionFlowRfNodeModel,
} from '@/lib/collection-flow-canvas'
import {
  buildJobRunSummary,
  mapJobToFlowNodeInspector,
  mapJobToFlowNodeOutputs,
  mapJobToFlowNodeStates,
  type FlowJobRunSummary,
  type FlowNodeInspectorData,
  type FlowNodeRunOutput,
  type FlowNodeRunState,
  type FlowRunProgressInput,
} from '@/lib/collection-flow-run-progress'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'
import type { AudionJourneyJobSnapshot } from '@/lib/integrations/audion-journey-client'
import { CollectionFlowFloatingPanel } from './CollectionFlowFloatingPanel'
import { CollectionFlowRfNode } from './CollectionFlowRfNode'
import { CollectionFlowNodeInspector } from './CollectionFlowNodeInspector'
import { CollectionFlowVerdictCard } from './CollectionFlowVerdictCard'
import {
  IconDelete,
  IconPlay,
  IconReset,
  IconSave,
  IconStop,
  IconUndo,
} from './collection-flow-icons'

const nodeTypes = { collectionFlow: CollectionFlowRfNode }
const POLL_MS = 2000
const HISTORY_MAX = 30

type GraphSnap = { nodes: CollectionFlowRfNodeModel[]; edges: CollectionFlowRfEdge[] }

type Props = {
  platformProjectId: string
  initial: CollectionTestFlowResponse
}

function toRfRunStates(
  states: Record<string, CollectionFlowNodeRunState>
): Record<string, FlowNodeRunState> {
  const out: Record<string, FlowNodeRunState> = {}
  for (const [id, s] of Object.entries(states)) out[id] = s === 'running' ? 'active' : s
  return out
}

function BoardInner({ platformProjectId, initial }: Props) {
  const templateRef = useRef(initial)
  const initialRf = useMemo(() => flowToRf(initial.flow), [initial])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialRf.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialRf.edges)
  const [flow, setFlow] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const [runBusy, setRunBusy] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runStates, setRunStates] = useState<Record<string, FlowNodeRunState>>({})
  const [runOutputs, setRunOutputs] = useState<Record<string, FlowNodeRunOutput>>({})
  const [inspectorByNode, setInspectorByNode] = useState<Record<string, FlowNodeInspectorData>>({})
  const [jobSummary, setJobSummary] = useState<FlowJobRunSummary | null>(null)
  const [runMeta, setRunMeta] = useState<{
    studyId: string
    waveId: string
    jobId: string
    status: string
    stepCount: number
  } | null>(null)
  const [softQSummary, setSoftQSummary] = useState<{
    softScoreKeys: string[]
    hasCollectionRollup: boolean
  } | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runMetaRef = useRef<{ studyId: string; waveId: string; jobId: string } | null>(null)
  const historyRef = useRef<GraphSnap[]>([])
  const skipHistoryRef = useRef(false)
  const [historyLen, setHistoryLen] = useState(0)

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return
    const snap: GraphSnap = {
      nodes: structuredClone(nodes) as CollectionFlowRfNodeModel[],
      edges: structuredClone(edges) as CollectionFlowRfEdge[],
    }
    historyRef.current = [...historyRef.current.slice(-(HISTORY_MAX - 1)), snap]
    setHistoryLen(historyRef.current.length)
  }, [nodes, edges])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const getSnapshot = useCallback(
    (): CollectionTestFlowDocument =>
      rfToDocument(flow.flow, nodes as CollectionFlowRfNodeModel[], edges as CollectionFlowRfEdge[]),
    [flow.flow, nodes, edges]
  )

  const hasJourney = documentHasJourneySegment(flow.flow)
  const verdict: CollectionVerdict | null | undefined = flow.flow.lastVerdict
  const lastRun = flow.flow.lastRun

  const onUpdateNode = useCallback(
    (nodeId: string, patch: Partial<CollectionFlowNode>) => {
      pushHistory()
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n
          const prev = (n as CollectionFlowRfNodeModel).data?.flowNode
          return {
            ...n,
            data: { ...n.data, flowNode: { ...prev, ...patch, id: nodeId } },
          }
        })
      )
      setDirty(true)
      setSaveMsg(null)
    },
    [setNodes, pushHistory]
  )

  const onOutputToNote = useCallback(
    (nodeId: string) => {
      const out = runOutputs[nodeId]
      if (!out?.text?.trim()) return
      const node = nodes.find((n) => n.id === nodeId) as CollectionFlowRfNodeModel | undefined
      const prev = node?.data?.flowNode?.note?.trim() ?? ''
      const addition = out.text.trim()
      onUpdateNode(nodeId, { note: prev ? `${prev}\n${addition}` : addition })
    },
    [nodes, onUpdateNode, runOutputs]
  )

  const onInspectorOutputToNote = useCallback(
    (nodeId: string) => {
      const data = inspectorByNode[nodeId]
      const last = data?.steps?.length ? data.steps[data.steps.length - 1] : null
      if (!last) return
      const parts = [last.action, last.target, last.result, last.reasoning].filter(
        (v): v is string => Boolean(v?.trim())
      )
      const addition = parts.join('\n').trim()
      if (!addition) return
      const node = nodes.find((n) => n.id === nodeId) as CollectionFlowRfNodeModel | undefined
      const prev = node?.data?.flowNode?.note?.trim() ?? ''
      onUpdateNode(nodeId, { note: prev ? `${prev}\n${addition}` : addition })
    },
    [inspectorByNode, nodes, onUpdateNode]
  )

  const getJourneyFlowSnapshot = useCallback(() => {
    const doc = getSnapshot()
    const baseUrl = startNodeUrl(doc.nodes) ?? scanNodeUrl(doc.nodes) ?? 'https://example.com'
    return resolveJourneyFlowForRun(doc, baseUrl)
  }, [getSnapshot])

  const applyJobToStates = useCallback(
    (job: AudionJourneyJobSnapshot) => {
      const journeyFlow = getJourneyFlowSnapshot()
      if (!journeyFlow) return
      const input: FlowRunProgressInput = {
        status: job.status,
        steps: job.steps ?? [],
        finalUrl: job.finalUrl,
        success: job.success,
        error: job.error,
        jobId: job.jobId,
        gateSignals: job.gateSignals,
      }
      setRunStates(mapJobToFlowNodeStates(journeyFlow, input))
      setRunOutputs(mapJobToFlowNodeOutputs(journeyFlow, input))
      setInspectorByNode(mapJobToFlowNodeInspector(journeyFlow, input))
      setJobSummary(buildJobRunSummary(input))
      setRunMeta((m) => (m ? { ...m, status: job.status, stepCount: job.steps?.length ?? 0 } : m))
    },
    [getJourneyFlowSnapshot]
  )

  const pollOnce = useCallback(
    async (jobId: string): Promise<AudionJourneyJobSnapshot> => {
      const res = await fetch(apiPlatformProjectFlowJourneyJob(platformProjectId, flow.id, jobId), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => null)) as
        | (AudionJourneyJobSnapshot & { error?: string })
        | null
      if (!res.ok) {
        throw new Error(json?.error || `Job poll failed (${res.status})`)
      }
      if (!json) throw new Error('Job poll: leere Antwort')
      return json
    },
    [flow.id, platformProjectId]
  )

  const loadSoftQSummary = useCallback(
    async (studyId: string, waveId: string) => {
      try {
        const qs = new URLSearchParams({ studyId, waveId })
        const res = await fetch(
          `${apiPlatformProjectFlowWaveSummary(platformProjectId, flow.id)}?${qs}`
        )
        if (!res.ok) return
        const json = (await res.json()) as {
          softScoreKeys?: string[]
          hasCollectionRollup?: boolean
        }
        setSoftQSummary({
          softScoreKeys: json.softScoreKeys ?? [],
          hasCollectionRollup: Boolean(json.hasCollectionRollup),
        })
      } catch {
        /* best-effort */
      }
    },
    [flow.id, platformProjectId]
  )

  const runQualityPhase = useCallback(
    async (job: AudionJourneyJobSnapshot) => {
      const meta = runMetaRef.current
      try {
        const res = await fetch(apiPlatformProjectFlowRun(platformProjectId, flow.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'quality',
            audionJobId: job.jobId,
            audionStudyId: meta?.studyId,
            audionWaveId: meta?.waveId,
            stepUrl: job.finalUrl,
            taskCompleted: job.taskCompleted,
            journeyValidEvidence: job.validEvidence,
            url: job.finalUrl || undefined,
          }),
        })
        const json = (await res.json().catch(() => null)) as {
          error?: string
          flow?: CollectionTestFlowResponse
          nodeStates?: Record<string, CollectionFlowNodeRunState>
        } | null
        if (!res.ok) throw new Error(json?.error || `Run failed (${res.status})`)
        if (json?.flow) setFlow(json.flow)
        if (json?.nodeStates) setRunStates((prev) => ({ ...prev, ...toRfRunStates(json.nodeStates!) }))
        if (meta?.studyId && meta?.waveId) {
          void loadSoftQSummary(meta.studyId, meta.waveId)
        }
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      } finally {
        setRunBusy(false)
      }
    },
    [flow.id, loadSoftQSummary, platformProjectId]
  )

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling()
      const tick = async () => {
        try {
          const job = await pollOnce(jobId)
          applyJobToStates(job)
          if (job.status === 'complete') {
            stopPolling()
            await runQualityPhase(job)
          } else if (job.status === 'error') {
            stopPolling()
            setRunError(job.error || 'Journey job error')
            setRunBusy(false)
          }
        } catch (e) {
          setRunError(e instanceof Error ? e.message : String(e))
          stopPolling()
          setRunBusy(false)
        }
      }
      void tick()
      pollRef.current = setInterval(() => void tick(), POLL_MS)
    },
    [applyJobToStates, pollOnce, runQualityPhase, stopPolling]
  )

  const onTest = useCallback(async () => {
    setRunError(null)
    setRunBusy(true)
    stopPolling()
    setRunStates({})
    setRunOutputs({})
    setInspectorByNode({})
    setJobSummary(null)
    setRunMeta(null)
    setSoftQSummary(null)
    runMetaRef.current = null

    if (!hasJourney) {
      try {
        const res = await fetch(apiPlatformProjectFlowRun(platformProjectId, flow.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const json = (await res.json().catch(() => null)) as {
          error?: string
          flow?: CollectionTestFlowResponse
          nodeStates?: Record<string, CollectionFlowNodeRunState>
        } | null
        if (!res.ok) throw new Error(json?.error || `Run failed (${res.status})`)
        if (json?.flow) setFlow(json.flow)
        if (json?.nodeStates) setRunStates(toRfRunStates(json.nodeStates))
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      } finally {
        setRunBusy(false)
      }
      return
    }

    try {
      const res = await fetch(apiPlatformProjectFlowRunJourney(platformProjectId, flow.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const started = (await res.json().catch(() => null)) as {
        error?: string
        studyId?: string
        waveId?: string
        jobId?: string
      } | null
      if (!res.ok || !started?.jobId || !started.studyId || !started.waveId) {
        throw new Error(started?.error || `Journey start failed (${res.status})`)
      }
      runMetaRef.current = { studyId: started.studyId, waveId: started.waveId, jobId: started.jobId }
      setRunMeta({
        studyId: started.studyId,
        waveId: started.waveId,
        jobId: started.jobId,
        status: 'running',
        stepCount: 0,
      })
      startPolling(started.jobId)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e))
      setRunBusy(false)
    }
  }, [flow.id, hasJourney, platformProjectId, startPolling, stopPolling])

  const onStop = useCallback(() => {
    stopPolling()
    setRunBusy(false)
    setRunMeta((m) => (m ? { ...m, status: 'cancelled' } : m))
  }, [stopPolling])

  const onSave = useCallback(async () => {
    setSaveBusy(true)
    setSaveMsg(null)
    try {
      const doc = getSnapshot()
      const res = await fetch(apiPlatformProjectFlow(platformProjectId, flow.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow: doc }),
      })
      const json = (await res.json().catch(() => null)) as (CollectionTestFlowResponse & { error?: string }) | null
      if (!res.ok) throw new Error(json?.error || `Save failed (${res.status})`)
      if (json) {
        setFlow(json)
        templateRef.current = json
      }
      setDirty(false)
      setSaveMsg('Gespeichert')
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setSaveBusy(false)
    }
  }, [flow.id, getSnapshot, platformProjectId])

  const onUndo = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) return
    setHistoryLen(historyRef.current.length)
    skipHistoryRef.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
    setDirty(true)
    skipHistoryRef.current = false
  }, [setNodes, setEdges])

  const reset = useCallback(() => {
    pushHistory()
    const next = flowToRf(templateRef.current.flow)
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(null)
    setDirty(false)
    setSaveMsg(null)
  }, [pushHistory, setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      pushHistory()
      const sourceRf = nodes.find((n) => n.id === connection.source) as CollectionFlowRfNodeModel | undefined
      const kind = nextEdgeKindForSource(
        sourceRf?.data?.flowNode,
        edges.map((e) => ({ from: e.source, kind: (e.data as CollectionFlowRfEdge['data'])?.edgeKind ?? 'then' })),
        connection.source,
        connection.sourceHandle
      )
      const id = `e-${connection.source}-${connection.target}-${Date.now().toString(36)}`
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
            sourceHandle: connection.sourceHandle ?? kind,
            targetHandle: connection.targetHandle ?? 'in',
            label: edgeKindLabel(kind),
            data: { edgeKind: kind },
          },
          eds
        )
      )
      setDirty(true)
      setSaveMsg(null)
    },
    [nodes, edges, setEdges, pushHistory]
  )

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedId(sel[0]?.id ?? null)
  }, [])

  const addNode = useCallback(
    (kind: CollectionFlowNodeKind) => {
      pushHistory()
      const flowNode = newCollectionFlowNode(kind)
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0)
      const rfNode: CollectionFlowRfNodeModel = {
        id: flowNode.id,
        type: 'collectionFlow',
        position: { x: 40, y: maxY + 200 },
        data: { flowNode },
      }
      setNodes((nds) => [...nds, rfNode])
      setSelectedId(flowNode.id)
      setDirty(true)
      setSaveMsg(null)
      setPaletteOpen(false)
    },
    [nodes, setNodes, pushHistory]
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    pushHistory()
    setNodes((nds) => nds.filter((n) => n.id !== selectedId))
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
    setDirty(true)
    setSaveMsg(null)
  }, [selectedId, setNodes, setEdges, pushHistory])

  const onManualGate = useCallback(
    async (gateNodeId: string, edgeKind: 'when' | 'otherwise') => {
      const jobId = runMetaRef.current?.jobId ?? runMeta?.jobId
      if (!jobId) {
        setRunError('Kein laufender Job — zuerst Testen starten.')
        return
      }
      setRunError(null)
      try {
        const res = await fetch(
          apiPlatformProjectFlowJourneyGateBranch(platformProjectId, flow.id, jobId),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gateNodeId, edgeKind }),
          }
        )
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        if (!res.ok) throw new Error(json?.error || `Gate branch failed (${res.status})`)
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      }
    },
    [flow.id, platformProjectId, runMeta?.jobId]
  )

  const onPlaySegment = useCallback(
    async (nodeId: string) => {
      setRunError(null)
      try {
        const res = await fetch(apiPlatformProjectFlowHybridSegment(platformProjectId, flow.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId }),
        })
        const json = (await res.json().catch(() => null)) as {
          error?: string
          jobId?: string | null
        } | null
        if (!res.ok) throw new Error(json?.error || `Agent-Segment failed (${res.status})`)
        if (json?.jobId) {
          setRunMeta((prev) =>
            prev
              ? { ...prev, jobId: json.jobId!, status: 'running' }
              : {
                  studyId: runMetaRef.current?.studyId ?? '',
                  waveId: runMetaRef.current?.waveId ?? '',
                  jobId: json.jobId!,
                  status: 'running',
                  stepCount: 0,
                }
          )
        }
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
      }
    },
    [flow.id, platformProjectId]
  )

  const nodesForFlow = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onUpdate: onUpdateNode,
          runState: runStates[n.id] ?? 'idle',
          runOutput: runOutputs[n.id] ?? null,
          runBusy,
          onManualGate: (edgeKind: 'when' | 'otherwise') => void onManualGate(n.id, edgeKind),
          onPlaySegment: () => void onPlaySegment(n.id),
          onOutputToNote: () => onOutputToNote(n.id),
          onOpenInspector: () => setSelectedId(n.id),
        },
      })),
    [nodes, onManualGate, onOutputToNote, onPlaySegment, onUpdateNode, runBusy, runOutputs, runStates]
  )

  const selectedFlowNode = useMemo(() => {
    if (!selectedId) return null
    const rf = nodes.find((n) => n.id === selectedId) as CollectionFlowRfNodeModel | undefined
    return rf?.data?.flowNode ?? null
  }, [nodes, selectedId])

  const studyHref =
    runMeta?.studyId != null
      ? buildAudionStudyUrl(getAudionWebOrigin(), runMeta.studyId)
      : lastRun?.audionStudyId != null
        ? buildAudionStudyUrl(getAudionWebOrigin(), lastRun.audionStudyId)
        : null
  const waveHref =
    runMeta?.studyId && runMeta?.waveId
      ? buildAudionStudyWaveUrl(getAudionWebOrigin(), runMeta.studyId, runMeta.waveId)
      : lastRun?.audionStudyId && lastRun?.audionWaveId
        ? buildAudionStudyWaveUrl(getAudionWebOrigin(), lastRun.audionStudyId, lastRun.audionWaveId)
        : null
  const scanHref = lastRun?.scanId ? pathCheckionScanResult(lastRun.scanId) : null
  const issuesHref = lastRun?.scanId ? pathCheckionScanIssues(lastRun.scanId) : null
  const geoHref = lastRun?.geoJobId ? pathCheckionGeoOverview(lastRun.geoJobId) : null

  return (
    <FlowBoardStage
      alert={runError ?? undefined}
      viewport={
        <ReactFlow
          nodes={nodesForFlow}
          edges={edges}
          onNodesChange={(c) => {
            if (
              c.some(
                (ch) =>
                  ch.type === 'remove' ||
                  ch.type === 'add' ||
                  (ch.type === 'position' && 'dragging' in ch && ch.dragging === false)
              )
            ) {
              pushHistory()
              setDirty(true)
              setSaveMsg(null)
            }
            onNodesChange(c)
          }}
          onEdgesChange={(c) => {
            if (c.some((ch) => ch.type === 'remove' || ch.type === 'add')) {
              pushHistory()
              setDirty(true)
              setSaveMsg(null)
            }
            onEdgesChange(c)
          }}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={null}
          nodesDraggable={!runBusy}
          nodesConnectable={!runBusy}
          connectionLineStyle={{ strokeWidth: 2 }}
          defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      }
      overlays={
        <>
          <CollectionFlowFloatingPanel
            storageKey={`plexon.flow.toolbar.${flow.id}`}
            defaultEdge="top"
            defaultOffset={0.06}
            variant="toolbar"
            ariaLabel="Flow Board Aktionen"
            className="msqdx-flow-float-panel--toolbar"
          >
            <FlowBoardToolbar
              leading={
                <>
                  <Link
                    href={pathPlatformProjectFlows(platformProjectId)}
                    className="msqdx-flow-toolbar-btn"
                    title="Zurück zu Flows"
                  >
                    ← Flows
                  </Link>
                  <Text role="title" as="span" className="msqdx-flow-toolbar-title">
                    {flow.name}
                  </Text>
                </>
              }
              dirty={dirty}
              dirtyLabel="edit"
              trailing={
                <>
                  {saveMsg === 'Gespeichert' && !dirty ? (
                    <Chip size="sm" static className="msqdx-flow-toolbar-chip">
                      ok
                    </Chip>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Node löschen"
                    title="Node löschen"
                    icon={<IconDelete />}
                    onClick={deleteSelected}
                    disabled={!selectedId || runBusy}
                  />
                </>
              }
            >
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="msqdx-flow-toolbar-btn"
                aria-label={runBusy ? 'Läuft' : 'Testen'}
                title={runBusy ? 'Läuft…' : 'Testen'}
                icon={<IconPlay />}
                onClick={() => void onTest()}
                disabled={runBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="msqdx-flow-toolbar-btn"
                aria-label="Stop"
                title="Stop"
                icon={<IconStop />}
                onClick={onStop}
                disabled={!runBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="msqdx-flow-toolbar-btn"
                aria-label={saveBusy ? 'Speichert' : 'Speichern'}
                title={saveMsg ?? (saveBusy ? 'Speichert…' : 'Speichern')}
                icon={<IconSave />}
                onClick={() => void onSave()}
                disabled={saveBusy}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="msqdx-flow-toolbar-btn"
                aria-label="Undo"
                title="Undo"
                icon={<IconUndo />}
                onClick={onUndo}
                disabled={historyLen < 1}
              />
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="msqdx-flow-toolbar-btn"
                aria-label="Reset zum Template"
                title="Reset zum Template"
                icon={<IconReset />}
                onClick={reset}
                disabled={!dirty}
              />
            </FlowBoardToolbar>
          </CollectionFlowFloatingPanel>

          <CollectionFlowFloatingPanel
            storageKey={`plexon.flow.palette.${flow.id}`}
            defaultEdge="left"
            defaultOffset={0.38}
            title={paletteOpen ? 'Bausteine' : undefined}
            variant={paletteOpen ? 'panel' : 'toolbar'}
            className={
              paletteOpen
                ? 'msqdx-flow-float-panel--palette msqdx-flow-float-panel--palette-open'
                : 'msqdx-flow-float-panel--palette msqdx-flow-float-panel--palette-collapsed'
            }
            ariaLabel="Flow Bausteine"
          >
            <FlowBoardPalette
              open={paletteOpen}
              onOpenChange={(open) => {
                if (open && runBusy) return
                setPaletteOpen(open)
              }}
              title="Bausteine"
              fabLabel="Bausteine hinzufügen"
            >
              <p className="msqdx-flow-canvas-hint">Journey (Audion)</p>
              <div className="msqdx-flow-palette-row">
                {PALETTE_JOURNEY_KINDS.map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={() => addNode(kind)}
                    disabled={runBusy}
                  >
                    {kind}
                  </Button>
                ))}
              </div>
              <p className="msqdx-flow-canvas-hint">Quality (Checkion)</p>
              <div className="msqdx-flow-palette-row">
                {PALETTE_QUALITY_KINDS.map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={() => addNode(kind)}
                    disabled={runBusy}
                  >
                    {kind}
                  </Button>
                ))}
              </div>
            </FlowBoardPalette>
          </CollectionFlowFloatingPanel>

          <CollectionFlowFloatingPanel
            storageKey={`plexon.flow.run.${flow.id}`}
            defaultEdge="bottom"
            defaultOffset={0.5}
            title="Run"
            variant="strip"
            className="msqdx-flow-float-panel--run"
            ariaLabel="Run Status"
          >
            <FlowRunStrip
              status={
                runMeta ? (
                  <Chip size="sm" static>
                    {runMeta.status}
                  </Chip>
                ) : undefined
              }
              meta={
                runMeta ? (
                  <span>
                    steps {jobSummary?.stepCount ?? runMeta.stepCount} · job {runMeta.jobId.slice(0, 10)}…
                  </span>
                ) : (
                  <Text role="meta" as="p">
                    {lastRun
                      ? [
                          `Letzter Lauf · ${lastRun.status}`,
                          lastRun.overallScore != null ? `score ${lastRun.overallScore}` : null,
                          lastRun.issueGateBranch ? `issueGate ${lastRun.issueGateBranch}` : null,
                          lastRun.criticalCount != null ? `${lastRun.criticalCount} critical` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : hasJourney
                        ? 'Journey + Quality: start → journey → scan → gates'
                        : 'Quality-Pfad: start → scan → score_gate → terminal'}
                  </Text>
                )
              }
              links={
                studyHref || waveHref || scanHref || issuesHref || geoHref || softQSummary ? (
                  <>
                    {studyHref ? (
                      <a href={studyHref} target="_blank" rel="noreferrer">
                        AUDION Study
                      </a>
                    ) : null}
                    {waveHref ? (
                      <a href={waveHref} target="_blank" rel="noreferrer">
                        Soft-Q / Evaluate
                      </a>
                    ) : null}
                    {softQSummary ? (
                      <Chip size="sm" static>
                        Soft-Q {softQSummary.softScoreKeys.length} keys
                        {softQSummary.hasCollectionRollup ? ' · Collection rollup' : ''}
                      </Chip>
                    ) : null}
                    {scanHref ? (
                      <a href={scanHref} target="_blank" rel="noreferrer">
                        CHECKION Scan
                      </a>
                    ) : null}
                    {issuesHref ? (
                      <a href={issuesHref} target="_blank" rel="noreferrer">
                        Issues Dossier
                      </a>
                    ) : null}
                    {geoHref ? (
                      <a href={geoHref} target="_blank" rel="noreferrer">
                        GEO Overview
                      </a>
                    ) : null}
                  </>
                ) : undefined
              }
              verdict={<CollectionFlowVerdictCard verdict={verdict} />}
            />
          </CollectionFlowFloatingPanel>

          {selectedFlowNode ? (
            <CollectionFlowFloatingPanel
              storageKey={`plexon.flow.inspector.${flow.id}`}
              defaultEdge="right"
              defaultOffset={0.22}
              title="Inspector"
              className="msqdx-flow-float-panel--inspector"
              ariaLabel="Node Inspector"
            >
              <CollectionFlowNodeInspector
                node={selectedFlowNode}
                runState={runStates[selectedId!] ?? 'idle'}
                inspector={inspectorByNode[selectedId!] ?? null}
                jobSummary={jobSummary}
                verdict={verdict}
                onClose={() => setSelectedId(null)}
                onAppendOutputToNote={() => onInspectorOutputToNote(selectedId!)}
              />
            </CollectionFlowFloatingPanel>
          ) : null}
        </>
      }
    />
  )
}

export function CollectionFlowBoard(props: Props) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  )
}
