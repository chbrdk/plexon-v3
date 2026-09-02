'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
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
  ContextMenu,
  FlowBoardPalette,
  FlowBoardStage,
  FlowBoardToolbar,
  FlowRunStrip,
  Text,
  type ContextMenuItem,
} from '@msqdx/ui'
import {
  apiPlatformProjectFlow,
  apiPlatformProjectFlowHybridSegment,
  apiPlatformProjectFlowJourneyGateBranch,
  apiPlatformProjectFlowJourneyJob,
  apiPlatformProjectFlowRun,
  apiPlatformProjectFlowRunJourney,
  apiPlatformProjectFlowWaveSummary,
  apiPlatformProjectDashboard,
  apiPlatformProjectFlowReportPins,
  getAudionWebOrigin,
  pathPlatformProjectFlows,
} from '@/lib/constants'
import { buildAudionStudyUrl, buildAudionStudyWaveUrl } from '@/lib/audion-admin-launch-url'
import { pathCheckionGeoOverview, pathCheckionScanIssues, pathCheckionScanResult } from '@/lib/paths/checkion-api'
import { pathBrandionGuidelineEvaluate } from '@/lib/paths/brandion-api'
import {
  documentHasJourneySegment,
  ensureFlowDocument,
  nodeStatesFromVerdict,
  resolveJourneyFlowForRun,
  scanNodeUrl,
  startNodeUrl,
  type CollectionFlowNode,
  type CollectionFlowNodeKind,
  type CollectionFlowNodeRunState,
  type CollectionFlowLastRun,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow'
import {
  edgeKindLabel,
  flowToRf,
  isCatalogBindConnection,
  makeBindRfEdge,
  newCollectionFlowNode,
  newCollectionFlowNodeFromPreset,
  nextEdgeKindForSource,
  removeNodesFromRfGraph,
  duplicateNodesInRfGraph,
  addParallelPersonaSibling,
  rfToDocument,
  syncBindEdgesForComparePath,
  type CollectionFlowRfEdge,
  type CollectionFlowRfNode as CollectionFlowRfNodeModel,
} from '@/lib/collection-flow-canvas'
import { PALETTE_BRAND_GROUPS, PALETTE_JOURNEY_GROUPS, PALETTE_QUALITY_GROUPS } from '@/lib/collection-flow-presets'
import {
  DEFAULT_FLOW_NODE_SIZE,
  findNonOverlappingFlowPosition,
  flowNodesToCollisionRects,
  resolveFlowNodePositions,
} from '@/lib/collection-flow-collision'
import { layoutCollectionFlowNodes } from '@/lib/collection-flow-layout'
import {
  formatValidationIssues,
  validateCollectionFlowForRun,
} from '@/lib/collection-flow-validate'
import {
  CATALOG_BIND_PATH_HANDLE,
  catalogPathFromOutHandle,
} from '@/lib/collection-flow-run-context'
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
import {
  rehydrateFlowRunUi,
  truncateJourneySteps,
} from '@/lib/collection-flow-journey-context'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'
import type { CollectionFlowRunResponse } from '@/lib/db/collection-flow-runs'
import type { AudionJourneyJobSnapshot } from '@/lib/integrations/audion-journey-client'
import { CollectionFlowFloatingPanel } from './CollectionFlowFloatingPanel'
import { CollectionFlowRfNode } from './CollectionFlowRfNode'
import { CollectionFlowNodeInspector } from './CollectionFlowNodeInspector'
import { CollectionFlowWebhookPanel } from './CollectionFlowWebhookPanel'
import { CollectionFlowHistoryPanel } from './CollectionFlowHistoryPanel'
import { CollectionFlowVerdictCard } from './CollectionFlowVerdictCard'
import { CollectionFlowOutputsDossier } from './CollectionFlowOutputsDossier'
import {
  FlowReportCollectionBar,
  type FlowReportPinItem,
} from './FlowReportCollectionBar'
import {
  IconDelete,
  IconDuplicate,
  IconLayout,
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
  const [inspectorId, setInspectorId] = useState<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [webhookOpen, setWebhookOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [viewedRun, setViewedRun] = useState<CollectionFlowRunResponse | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    target: 'pane' | 'node'
    nodeId?: string
  } | null>(null)
  const [audionCatalog, setAudionCatalog] = useState<{
    personas: Array<{ id: string; name: string }>
    targetGroups: Array<{ id: string; name: string; segment: string }>
  } | null>(null)
  const [brandionCatalog, setBrandionCatalog] = useState<{
    guidelines: Array<{ id: string; name: string }>
  } | null>(null)
  const [runDockOpen, setRunDockOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(`plexon.flow.run.open.${initial.id}`)
      if (raw === '0') return false
      if (raw === '1') return true
    } catch {
      /* ignore */
    }
    return true
  })

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
  const [reportPins, setReportPins] = useState<FlowReportPinItem[]>([])
  const [pinBusyNodeId, setPinBusyNodeId] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runMetaRef = useRef<{ studyId: string; waveId: string; jobId: string } | null>(null)
  const historyRunIdRef = useRef<string | null>(null)
  const personaAggRef = useRef<{
    taskCompleted: boolean
    validEvidence: boolean
    finalUrl: string | null
    personaCount: number
    nextPersonaNodeId: string | null
    runs: Array<{
      personaNodeId: string
      personaId: string | null
      personaName: string | null
      jobId: string | null
      studyId: string | null
      waveId: string | null
      taskCompleted: boolean
      validEvidence: boolean
      finalUrl: string | null
      steps?: ReturnType<typeof truncateJourneySteps>
    }>
  } | null>(null)
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

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(apiPlatformProjectDashboard(platformProjectId))
        if (!res.ok) return
        const json = (await res.json().catch(() => null)) as {
          audion?: {
            personas?: Array<{ id: string; name: string }>
            targetGroups?: Array<{ id: string; name: string; segment?: string }>
          } | null
          brandion?: {
            guidelines?: Array<{ id: string; name: string }>
          } | null
        } | null
        if (cancelled) return
        if (json?.audion) {
          setAudionCatalog({
            personas: (json.audion.personas ?? []).map((p) => ({ id: p.id, name: p.name })),
            targetGroups: (json.audion.targetGroups ?? []).map((t) => ({
              id: t.id,
              name: t.name,
              segment: t.segment ?? '',
            })),
          })
        }
        if (json?.brandion) {
          setBrandionCatalog({
            guidelines: (json.brandion.guidelines ?? []).map((g) => ({
              id: g.id,
              name: g.name,
            })),
          })
        }
      } catch {
        /* ignore — pickers stay empty */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [platformProjectId])

  const getSnapshot = useCallback(
    (): CollectionTestFlowDocument =>
      rfToDocument(flow.flow, nodes as CollectionFlowRfNodeModel[], edges as CollectionFlowRfEdge[]),
    [flow.flow, nodes, edges]
  )

  const hasJourney = documentHasJourneySegment(flow.flow)
  const liveVerdict: CollectionVerdict | null | undefined = flow.flow.lastVerdict
  const liveLastRun = flow.flow.lastRun
  const verdict: CollectionVerdict | null | undefined = viewedRun?.verdict ?? liveVerdict
  const lastRun = viewedRun?.lastRun ?? liveLastRun

  const paintFromRun = useCallback(
    (run: CollectionFlowRunResponse | null) => {
      setViewedRun(run)
      if (!run?.verdict) {
        if (liveVerdict) {
          setRunStates(
            toRfRunStates(nodeStatesFromVerdict(ensureFlowDocument(flow.flow), liveVerdict, liveLastRun))
          )
          const ui = rehydrateFlowRunUi(ensureFlowDocument(flow.flow), liveLastRun)
          setRunOutputs(ui.runOutputs)
          setInspectorByNode(ui.inspectorByNode)
        } else {
          setRunStates({})
          setRunOutputs({})
          setInspectorByNode({})
        }
        return
      }
      const doc = ensureFlowDocument(flow.flow)
      const lr = run.lastRun ?? undefined
      setRunStates(toRfRunStates(nodeStatesFromVerdict(doc, run.verdict, lr)))
      const ui = rehydrateFlowRunUi(doc, lr)
      setRunOutputs(ui.runOutputs)
      setInspectorByNode(ui.inspectorByNode)
    },
    [flow.flow, liveLastRun, liveVerdict]
  )

  const abortHistoryRun = useCallback(
    async (error: string) => {
      const rid = historyRunIdRef.current
      if (!rid) return
      try {
        await fetch(apiPlatformProjectFlowRun(platformProjectId, flow.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'abort', historyRunId: rid, error }),
        })
      } catch {
        /* best-effort */
      } finally {
        historyRunIdRef.current = null
        setHistoryRefreshKey((k) => k + 1)
      }
    },
    [flow.id, platformProjectId]
  )

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
      if ('path' in patch) {
        setEdges((eds) => {
          const nextNodes = nodes.map((n) => {
            if (n.id !== nodeId) return n
            const prev = (n as CollectionFlowRfNodeModel).data?.flowNode
            return {
              ...n,
              data: { ...n.data, flowNode: { ...prev, ...patch, id: nodeId } },
            }
          }) as CollectionFlowRfNodeModel[]
          return syncBindEdgesForComparePath(
            eds as CollectionFlowRfEdge[],
            nextNodes,
            nodeId,
            patch.path
          )
        })
      }
      setDirty(true)
      setSaveMsg(null)
    },
    [setNodes, setEdges, pushHistory, nodes]
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

  const applyJobToStates = useCallback(
    (job: AudionJourneyJobSnapshot) => {
      const doc = getSnapshot()
      const baseUrl = startNodeUrl(doc.nodes) ?? scanNodeUrl(doc.nodes) ?? 'https://example.com'
      const meta = runMetaRef.current as {
        pendingPersonaNodeId?: string
      } | null
      const journeyFlow =
        resolveJourneyFlowForRun(doc, baseUrl, {
          personaNodeId: meta?.pendingPersonaNodeId ?? null,
        }) ?? resolveJourneyFlowForRun(doc, baseUrl)
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
      setRunStates((prev) => ({ ...prev, ...mapJobToFlowNodeStates(journeyFlow, input) }))
      setRunOutputs((prev) => ({ ...prev, ...mapJobToFlowNodeOutputs(journeyFlow, input) }))
      setInspectorByNode((prev) => {
        const next = { ...prev }
        const mapped = mapJobToFlowNodeInspector(journeyFlow, input)
        for (const [nodeId, data] of Object.entries(mapped)) {
          if (!next[nodeId]) next[nodeId] = data
          else {
            next[nodeId] = {
              steps: [...(next[nodeId]?.steps ?? []), ...data.steps],
              gateEvaluation: data.gateEvaluation ?? next[nodeId]?.gateEvaluation,
            }
          }
        }
        return next
      })
      setJobSummary(buildJobRunSummary(input))
      setRunMeta((m) => (m ? { ...m, status: job.status, stepCount: job.steps?.length ?? 0 } : m))
    },
    [getSnapshot]
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
      const agg = personaAggRef.current
      const taskCompleted = agg ? agg.taskCompleted && job.taskCompleted : job.taskCompleted
      const journeyValidEvidence = agg ? agg.validEvidence && job.validEvidence : job.validEvidence
      const stepUrl = agg?.finalUrl || job.finalUrl
      try {
        const res = await fetch(apiPlatformProjectFlowRun(platformProjectId, flow.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'quality',
            historyRunId: historyRunIdRef.current || undefined,
            audionJobId: agg?.runs[0]?.jobId || job.jobId,
            audionStudyId: meta?.studyId,
            audionWaveId: meta?.waveId,
            stepUrl,
            taskCompleted,
            journeyValidEvidence,
            personaCount: agg?.personaCount ?? 1,
            journeyPersonaRuns: agg?.runs,
            url: stepUrl || undefined,
            steps: job.steps ?? [],
          }),
        })
        const json = (await res.json().catch(() => null)) as {
          error?: string
          flow?: CollectionTestFlowResponse
          nodeStates?: Record<string, CollectionFlowNodeRunState>
          historyRunId?: string
          verdict?: CollectionVerdict
          lastRun?: CollectionFlowLastRun
        } | null
        if (!res.ok) throw new Error(json?.error || `Run failed (${res.status})`)
        if (json?.flow) setFlow(json.flow)
        if (json?.nodeStates) setRunStates((prev) => ({ ...prev, ...toRfRunStates(json.nodeStates!) }))
        const completedLastRun = json?.lastRun ?? json?.flow?.flow.lastRun ?? null
        if (completedLastRun) {
          const ui = rehydrateFlowRunUi(
            ensureFlowDocument(json?.flow?.flow ?? flow.flow),
            completedLastRun,
          )
          setRunOutputs(ui.runOutputs)
          setInspectorByNode(ui.inspectorByNode)
        }
        if (json?.historyRunId) {
          historyRunIdRef.current = json.historyRunId
          setViewedRun({
            id: json.historyRunId,
            flowId: flow.id,
            platformProjectId,
            status: 'complete',
            trigger: 'ui',
            request: null,
            verdict: json.verdict ?? json.flow?.flow.lastVerdict ?? null,
            lastRun: completedLastRun,
            callbackUrl: null,
            callbackStatus: null,
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
        setHistoryRefreshKey((k) => k + 1)
        if (meta?.studyId && meta?.waveId) {
          void loadSoftQSummary(meta.studyId, meta.waveId)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setRunError(message)
        void abortHistoryRun(message)
      } finally {
        personaAggRef.current = null
        setRunBusy(false)
      }
    },
    [abortHistoryRun, flow.id, loadSoftQSummary, platformProjectId]
  )

  const startJourneySlot = useCallback(
    async (personaNodeId: string | null) => {
      const res = await fetch(apiPlatformProjectFlowRunJourney(platformProjectId, flow.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(personaNodeId ? { personaNodeId } : {}),
          ...(historyRunIdRef.current ? { historyRunId: historyRunIdRef.current } : {}),
        }),
      })
      const started = (await res.json().catch(() => null)) as {
        error?: string
        studyId?: string
        waveId?: string
        jobId?: string
        personaNodeId?: string | null
        personaCount?: number
        nextPersonaNodeId?: string | null
        historyRunId?: string
        personaSlots?: Array<{
          nodeId: string
          personaId: string | null
          personaName: string | null
        }>
      } | null
      if (started?.historyRunId) historyRunIdRef.current = started.historyRunId
      if (!res.ok || !started?.jobId || !started.studyId || !started.waveId) {
        throw new Error(started?.error || `Journey start failed (${res.status})`)
      }
      const slotMeta = started.personaSlots?.find((s) => s.nodeId === started.personaNodeId)
      const prev = personaAggRef.current
      personaAggRef.current = {
        taskCompleted: prev?.taskCompleted ?? true,
        validEvidence: prev?.validEvidence ?? true,
        finalUrl: prev?.finalUrl ?? null,
        personaCount: started.personaCount ?? prev?.personaCount ?? 1,
        nextPersonaNodeId: started.nextPersonaNodeId ?? null,
        runs: prev?.runs ?? [],
      }
      // stash pending slot identity on meta for when job completes
      runMetaRef.current = {
        studyId: started.studyId,
        waveId: started.waveId,
        jobId: started.jobId,
        ...(slotMeta
          ? {
              pendingPersonaNodeId: slotMeta.nodeId,
              pendingPersonaId: slotMeta.personaId,
              pendingPersonaName: slotMeta.personaName,
            }
          : {}),
      } as {
        studyId: string
        waveId: string
        jobId: string
        pendingPersonaNodeId?: string
        pendingPersonaId?: string | null
        pendingPersonaName?: string | null
      }
      setRunMeta({
        studyId: started.studyId,
        waveId: started.waveId,
        jobId: started.jobId,
        status: 'running',
        stepCount: 0,
      })
      return started.jobId
    },
    [flow.id, platformProjectId]
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
            const meta = runMetaRef.current as {
              studyId: string
              waveId: string
              jobId: string
              pendingPersonaNodeId?: string
              pendingPersonaId?: string | null
              pendingPersonaName?: string | null
            } | null
            const prev = personaAggRef.current
            if (prev && meta) {
              personaAggRef.current = {
                ...prev,
                taskCompleted: prev.taskCompleted && job.taskCompleted,
                validEvidence: prev.validEvidence && job.validEvidence,
                finalUrl: prev.finalUrl || job.finalUrl,
                runs: [
                  ...prev.runs,
                  {
                    personaNodeId: meta.pendingPersonaNodeId || 'persona',
                    personaId: meta.pendingPersonaId ?? null,
                    personaName: meta.pendingPersonaName ?? null,
                    jobId: job.jobId,
                    studyId: meta.studyId,
                    waveId: meta.waveId,
                    taskCompleted: job.taskCompleted,
                    validEvidence: job.validEvidence,
                    finalUrl: job.finalUrl,
                    steps: truncateJourneySteps(job.steps ?? null),
                  },
                ],
              }
            }
            const nextId = personaAggRef.current?.nextPersonaNodeId
            if (nextId) {
              setRunError(
                `Persona ${personaAggRef.current?.runs.length ?? 1}/${personaAggRef.current?.personaCount ?? 1} fertig — starte nächste…`
              )
              const nextJobId = await startJourneySlot(nextId)
              startPolling(nextJobId)
              return
            }
            setRunError(null)
            await runQualityPhase(job)
          } else if (job.status === 'error') {
            stopPolling()
            const message = job.error || 'Journey job error'
            setRunError(message)
            setRunBusy(false)
            void abortHistoryRun(message)
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          setRunError(message)
          stopPolling()
          setRunBusy(false)
          void abortHistoryRun(message)
        }
      }
      void tick()
      pollRef.current = setInterval(() => void tick(), POLL_MS)
    },
    [abortHistoryRun, applyJobToStates, pollOnce, runQualityPhase, startJourneySlot, stopPolling]
  )

  const onSave = useCallback(async (): Promise<boolean> => {
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
      return true
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setSaveBusy(false)
    }
  }, [flow.id, getSnapshot, platformProjectId])

  const onTest = useCallback(async () => {
    setRunError(null)
    const snap = getSnapshot()
    const validation = validateCollectionFlowForRun(snap)
    if (!validation.ok) {
      setRunError(formatValidationIssues(validation.issues))
      return
    }
    const warnings = validation.issues.filter((i) => i.level === 'warning')
    if (dirty) {
      const saved = await onSave()
      if (!saved) {
        setRunError('Speichern vor Testen fehlgeschlagen — bitte speichern und erneut versuchen.')
        return
      }
    }

    setRunBusy(true)
    stopPolling()
    setRunStates({})
    setRunOutputs({})
    setInspectorByNode({})
    setJobSummary(null)
    setRunMeta(null)
    setSoftQSummary(null)
    runMetaRef.current = null
    historyRunIdRef.current = null
    setViewedRun(null)

    const journey = documentHasJourneySegment(snap)
    if (warnings.length) {
      setRunError(formatValidationIssues(warnings))
    }

    if (!journey) {
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
          historyRunId?: string
          verdict?: CollectionVerdict
          lastRun?: CollectionFlowLastRun
        } | null
        if (!res.ok) throw new Error(json?.error || `Run failed (${res.status})`)
        if (json?.flow) setFlow(json.flow)
        if (json?.nodeStates) setRunStates(toRfRunStates(json.nodeStates))
        if (json?.historyRunId) {
          historyRunIdRef.current = json.historyRunId
          setViewedRun({
            id: json.historyRunId,
            flowId: flow.id,
            platformProjectId,
            status: 'complete',
            trigger: 'ui',
            request: null,
            verdict: json.verdict ?? json.flow?.flow.lastVerdict ?? null,
            lastRun: json.lastRun ?? json.flow?.flow.lastRun ?? null,
            callbackUrl: null,
            callbackStatus: null,
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
        setHistoryRefreshKey((k) => k + 1)
      } catch (e) {
        setRunError(e instanceof Error ? e.message : String(e))
        setHistoryRefreshKey((k) => k + 1)
      } finally {
        setRunBusy(false)
      }
      return
    }

    try {
      personaAggRef.current = {
        taskCompleted: true,
        validEvidence: true,
        finalUrl: null,
        personaCount: 1,
        nextPersonaNodeId: null,
        runs: [],
      }
      const jobId = await startJourneySlot(null)
      startPolling(jobId)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setRunError(message)
      setRunBusy(false)
      personaAggRef.current = null
      void abortHistoryRun(message)
      setHistoryRefreshKey((k) => k + 1)
    }
  }, [
    abortHistoryRun,
    dirty,
    flow.id,
    getSnapshot,
    onSave,
    platformProjectId,
    startJourneySlot,
    startPolling,
    stopPolling,
  ])

  const onStop = useCallback(() => {
    stopPolling()
    setRunBusy(false)
    setRunMeta((m) => (m ? { ...m, status: 'cancelled' } : m))
  }, [stopPolling])

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

  const isValidConnection = useCallback(
    (connection: Connection | CollectionFlowRfEdge) => {
      const sourceId = connection.source
      const targetId = connection.target
      if (!sourceId || !targetId || sourceId === targetId) return false
      const sourceRf = nodes.find((n) => n.id === sourceId) as CollectionFlowRfNodeModel | undefined
      const targetRf = nodes.find((n) => n.id === targetId) as CollectionFlowRfNodeModel | undefined
      const sourceKind = sourceRf?.data?.flowNode?.kind
      const targetKind = targetRf?.data?.flowNode?.kind
      const sh = connection.sourceHandle
      const th = connection.targetHandle

      const isBindAttempt =
        Boolean(catalogPathFromOutHandle(sh)) || th === CATALOG_BIND_PATH_HANDLE
      if (isBindAttempt) {
        return isCatalogBindConnection(sourceKind, sh, targetKind, th ?? CATALOG_BIND_PATH_HANDLE)
      }
      if (th === CATALOG_BIND_PATH_HANDLE) return false
      if (catalogPathFromOutHandle(sh)) return false
      return true
    },
    [nodes]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (!isValidConnection(connection)) return
      pushHistory()
      const sourceRf = nodes.find((n) => n.id === connection.source) as
        | CollectionFlowRfNodeModel
        | undefined
      const targetRf = nodes.find((n) => n.id === connection.target) as
        | CollectionFlowRfNodeModel
        | undefined
      const bindPath = catalogPathFromOutHandle(connection.sourceHandle)

      if (
        bindPath &&
        targetRf?.data?.flowNode?.kind === 'compare' &&
        (connection.targetHandle === CATALOG_BIND_PATH_HANDLE ||
          connection.targetHandle == null)
      ) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== connection.target) return n
            const prev = (n as CollectionFlowRfNodeModel).data?.flowNode
            return {
              ...n,
              data: { ...n.data, flowNode: { ...prev, path: bindPath, id: n.id } },
            }
          })
        )
        setEdges((eds) => {
          const without = eds.filter(
            (e) =>
              !(
                e.target === connection.target &&
                (e.data as CollectionFlowRfEdge['data'])?.edgeKind === 'bind'
              )
          )
          return [
            ...without,
            makeBindRfEdge({
              sourceId: connection.source!,
              targetId: connection.target!,
              path: bindPath,
            }),
          ]
        })
        setDirty(true)
        setSaveMsg(null)
        return
      }

      const kind = nextEdgeKindForSource(
        sourceRf?.data?.flowNode,
        edges
          .filter((e) => (e.data as CollectionFlowRfEdge['data'])?.edgeKind !== 'bind')
          .map((e) => ({
            from: e.source,
            kind: (e.data as CollectionFlowRfEdge['data'])?.edgeKind ?? 'then',
          })),
        connection.source,
        connection.sourceHandle
      )
      if (kind === 'bind') return
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
    [nodes, edges, setEdges, setNodes, pushHistory, isValidConnection]
  )

  const onEdgesDelete = useCallback(
    (deleted: CollectionFlowRfEdge[]) => {
      for (const e of deleted) {
        if ((e.data as CollectionFlowRfEdge['data'])?.edgeKind !== 'bind') continue
        const path =
          (e.data as CollectionFlowRfEdge['data'])?.bindPath ??
          catalogPathFromOutHandle(e.sourceHandle)
        const targetId = e.target
        if (!targetId || !path) continue
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== targetId) return n
            const prev = (n as CollectionFlowRfNodeModel).data?.flowNode
            if (prev?.path !== path) return n
            return {
              ...n,
              data: { ...n.data, flowNode: { ...prev, path: undefined, id: n.id } },
            }
          })
        )
      }
      setDirty(true)
      setSaveMsg(null)
    },
    [setNodes]
  )

  const toggleRunDock = useCallback(() => {
    setRunDockOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`plexon.flow.run.open.${flow.id}`, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [flow.id])

  // Expand run dock when a live run starts so status stays visible.
  useEffect(() => {
    if (!runBusy) return
    setRunDockOpen(true)
    try {
      localStorage.setItem(`plexon.flow.run.open.${flow.id}`, '1')
    } catch {
      /* ignore */
    }
  }, [runBusy, flow.id])

  // Wave 25: rehydrate outputs when opening a flow that already has lastRun.
  useEffect(() => {
    if (runBusy) return
    const lr = viewedRun?.lastRun ?? flow.flow.lastRun
    if (!lr) return
    const ui = rehydrateFlowRunUi(ensureFlowDocument(flow.flow), lr)
    if (Object.keys(ui.runOutputs).length === 0) return
    setRunOutputs(ui.runOutputs)
    setInspectorByNode(ui.inspectorByNode)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on flow id / lastRun identity
  }, [flow.id, flow.flow.lastRun?.completedAt, viewedRun?.id, runBusy])

  // Wave 26: load report pins for this flow.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(apiPlatformProjectFlowReportPins(platformProjectId, flow.id), {
          credentials: 'same-origin',
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { items?: FlowReportPinItem[] }
        if (!cancelled && Array.isArray(data.items)) setReportPins(data.items)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [platformProjectId, flow.id])

  const activeHistoryRunId = viewedRun?.id ?? historyRunIdRef.current

  const onToggleReportPin = useCallback(
    async (item: { nodeId: string; kind: string; label: string; text: string }) => {
      const hr = activeHistoryRunId?.trim() || null
      const existing = reportPins.find(
        (p) =>
          p.nodeId === item.nodeId &&
          (p.historyRunId?.trim() || '') === (hr || ''),
      )
      setPinBusyNodeId(item.nodeId)
      try {
        if (existing) {
          const res = await fetch(
            `${apiPlatformProjectFlowReportPins(platformProjectId, flow.id)}?pinId=${encodeURIComponent(existing.id)}`,
            { method: 'DELETE', credentials: 'same-origin' },
          )
          if (res.ok) {
            setReportPins((prev) => prev.filter((p) => p.id !== existing.id))
          }
        } else {
          const res = await fetch(apiPlatformProjectFlowReportPins(platformProjectId, flow.id), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId: item.nodeId,
              kind: item.kind,
              label: item.label,
              text: item.text,
              historyRunId: hr,
            }),
          })
          if (!res.ok) return
          const data = (await res.json()) as { item?: FlowReportPinItem }
          if (data.item) {
            setReportPins((prev) => {
              if (prev.some((p) => p.id === data.item!.id)) return prev
              return [...prev, data.item!]
            })
          }
        }
      } finally {
        setPinBusyNodeId(null)
      }
    },
    [activeHistoryRunId, flow.id, platformProjectId, reportPins],
  )

  const snapNodesAfterDrag = useCallback(
    (dragged: CollectionFlowRfNodeModel[]) => {
      if (dragged.length === 0) return
      setNodes((nds) => {
        const rects = flowNodesToCollisionRects(nds)
        const moved = dragged.map((n) => {
          const cur = nds.find((x) => x.id === n.id) ?? n
          return {
            id: cur.id,
            position: cur.position,
            size: {
              w: cur.measured?.width ?? DEFAULT_FLOW_NODE_SIZE.w,
              h: cur.measured?.height ?? DEFAULT_FLOW_NODE_SIZE.h,
            },
          }
        })
        const resolved = resolveFlowNodePositions(moved, rects)
        let changed = false
        const next = nds.map((n) => {
          const pos = resolved.get(n.id)
          if (!pos) return n
          if (pos.x === n.position.x && pos.y === n.position.y) return n
          changed = true
          return { ...n, position: pos }
        })
        if (changed) {
          setDirty(true)
          setSaveMsg(null)
        }
        return changed ? next : nds
      })
    },
    [setNodes]
  )

  const onNodeDragStop = useCallback(
    (_e: ReactMouseEvent, node: CollectionFlowRfNodeModel) => {
      snapNodesAfterDrag([node])
    },
    [snapNodesAfterDrag]
  )

  const onSelectionDragStop = useCallback(
    (_e: ReactMouseEvent, nodesDragged: CollectionFlowRfNodeModel[]) => {
      snapNodesAfterDrag(nodesDragged)
    },
    [snapNodesAfterDrag]
  )

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    setSelectedId(sel[0]?.id ?? null)
  }, [])

  const onNodeClick = useCallback((_event: ReactMouseEvent, node: CollectionFlowRfNodeModel) => {
    setSelectedId(node.id)
    selectedIdRef.current = node.id
    setInspectorId(node.id)
  }, [])

  const addNode = useCallback(
    (kind: CollectionFlowNodeKind) => {
      pushHistory()
      const flowNode = newCollectionFlowNode(kind)
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0)
      const candidate = { x: 40, y: maxY + 200 }
      const position = findNonOverlappingFlowPosition(
        candidate,
        DEFAULT_FLOW_NODE_SIZE,
        flowNode.id,
        flowNodesToCollisionRects(nodes)
      )
      const rfNode: CollectionFlowRfNodeModel = {
        id: flowNode.id,
        type: 'collectionFlow',
        position,
        data: { flowNode },
      }
      setNodes((nds) => [...nds, rfNode])
      setSelectedId(flowNode.id)
      setInspectorId(flowNode.id)
      setDirty(true)
      setSaveMsg(null)
      setPaletteOpen(false)
    },
    [nodes, setNodes, pushHistory]
  )

  const addPreset = useCallback(
    (presetId: string) => {
      pushHistory()
      const flowNode = newCollectionFlowNodeFromPreset(presetId)
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y), 0)
      const candidate = { x: 40, y: maxY + 200 }
      const position = findNonOverlappingFlowPosition(
        candidate,
        DEFAULT_FLOW_NODE_SIZE,
        flowNode.id,
        flowNodesToCollisionRects(nodes)
      )
      const rfNode: CollectionFlowRfNodeModel = {
        id: flowNode.id,
        type: 'collectionFlow',
        position,
        data: { flowNode },
      }
      setNodes((nds) => [...nds, rfNode])
      setSelectedId(flowNode.id)
      setInspectorId(flowNode.id)
      setDirty(true)
      setSaveMsg(null)
      setPaletteOpen(false)
    },
    [nodes, setNodes, pushHistory]
  )

  const deleteSelected = useCallback(() => {
    if (runBusy) return
    const ids = new Set<string>()
    if (selectedIdRef.current) ids.add(selectedIdRef.current)
    for (const n of nodes) {
      if (n.selected) ids.add(n.id)
    }
    if (ids.size === 0) return
    pushHistory()
    const next = removeNodesFromRfGraph(
      nodes as CollectionFlowRfNodeModel[],
      edges as CollectionFlowRfEdge[],
      ids
    )
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(null)
    setInspectorId((prev) => (prev && ids.has(prev) ? null : prev))
    selectedIdRef.current = null
    setDirty(true)
    setSaveMsg(null)
  }, [runBusy, nodes, edges, setNodes, setEdges, pushHistory])

  const autoLayout = useCallback(() => {
    if (runBusy) return
    const doc = getSnapshot()
    const layout = layoutCollectionFlowNodes(doc.nodes, doc.edges)
    if (layout.size === 0) return
    pushHistory()
    setNodes((nds) =>
      nds.map((n) => {
        const pos = layout.get(n.id)
        if (!pos) return n
        return { ...n, position: pos }
      })
    )
    setDirty(true)
    setSaveMsg(null)
  }, [getSnapshot, pushHistory, runBusy, setNodes])

  const duplicateSelected = useCallback(() => {
    if (runBusy) return
    const ids = new Set<string>()
    if (selectedIdRef.current) ids.add(selectedIdRef.current)
    for (const n of nodes) {
      if (n.selected) ids.add(n.id)
    }
    if (ids.size === 0) return
    pushHistory()
    const { nodes: next, newIds } = duplicateNodesInRfGraph(
      nodes as CollectionFlowRfNodeModel[],
      ids
    )
    setNodes(next)
    if (newIds[0]) {
      setSelectedId(newIds[0])
      setInspectorId(newIds[0])
      selectedIdRef.current = newIds[0]
    }
    setDirty(true)
    setSaveMsg(null)
  }, [runBusy, nodes, setNodes, pushHistory])

  const addParallelPersona = useCallback(() => {
    if (runBusy) return
    const anchor =
      selectedIdRef.current ??
      nodes.find((n) => n.selected)?.id ??
      nodes.find((n) => (n as CollectionFlowRfNodeModel).data?.flowNode?.kind === 'zielgruppe')
        ?.id ??
      null
    if (!anchor) {
      setRunError('Zielgruppe oder Persona wählen, dann Parallel-Persona hinzufügen.')
      return
    }
    pushHistory()
    const next = addParallelPersonaSibling(
      nodes as CollectionFlowRfNodeModel[],
      edges as CollectionFlowRfEdge[],
      anchor
    )
    if (!next.newId) {
      setRunError('Parallel-Persona nur von Zielgruppe oder Persona aus.')
      return
    }
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedId(next.newId)
    setInspectorId(next.newId)
    selectedIdRef.current = next.newId
    setDirty(true)
    setSaveMsg(null)
    setRunError(null)
  }, [runBusy, nodes, edges, setNodes, setEdges, pushHistory])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const busy = runBusy
    if (contextMenu.target === 'pane') {
      return [
        {
          id: 'palette',
          label: 'Bausteine öffnen',
          disabled: busy,
          onSelect: () => setPaletteOpen(true),
        },
        {
          id: 'undo',
          label: 'Rückgängig',
          disabled: busy || historyLen < 1,
          onSelect: () => onUndo(),
        },
      ]
    }
    const nodeId = contextMenu.nodeId
    const kind = nodes.find((n) => n.id === nodeId)?.data?.flowNode?.kind
    const canParallel = kind === 'zielgruppe' || kind === 'persona'
    const items: ContextMenuItem[] = [
      {
        id: 'duplicate',
        label: 'Duplizieren',
        disabled: busy || !nodeId,
        onSelect: () => {
          if (nodeId) {
            setSelectedId(nodeId)
              setInspectorId(nodeId)
            selectedIdRef.current = nodeId
          }
          duplicateSelected()
        },
      },
      {
        id: 'delete',
        label: 'Löschen',
        shortcut: '⌫',
        danger: true,
        disabled: busy || !nodeId,
        onSelect: () => {
          if (nodeId) {
            setSelectedId(nodeId)
            setInspectorId(null)
            selectedIdRef.current = nodeId
          }
          deleteSelected()
        },
      },
    ]
    if (canParallel) {
      items.push({
        id: 'parallel',
        label: 'Parallel-Persona',
        disabled: busy || !nodeId,
        onSelect: () => {
          if (nodeId) {
            setSelectedId(nodeId)
            setInspectorId(nodeId)
            selectedIdRef.current = nodeId
          }
          addParallelPersona()
        },
      })
    }
    items.push({
      id: 'inspector',
      label: 'Inspector öffnen',
      disabled: !nodeId,
      onSelect: () => {
        if (nodeId) {
          setSelectedId(nodeId)
          setInspectorId(nodeId)
          selectedIdRef.current = nodeId
        }
      },
    })
    return items
  }, [
    contextMenu,
    runBusy,
    historyLen,
    onUndo,
    nodes,
    duplicateSelected,
    deleteSelected,
    addParallelPersona,
  ])

  const onPaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault()
      if (runBusy) return
      setContextMenu({ x: event.clientX, y: event.clientY, target: 'pane' })
    },
    [runBusy]
  )

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent, node: CollectionFlowRfNodeModel) => {
      event.preventDefault()
      if (runBusy) return
      setSelectedId(node.id)
      setInspectorId(node.id)
      selectedIdRef.current = node.id
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        target: 'node',
        nodeId: node.id,
      })
    },
    [runBusy]
  )

  const onNodesDelete = useCallback((deleted: CollectionFlowRfNodeModel[]) => {
    const ids = new Set(deleted.map((n) => n.id))
    if (selectedIdRef.current && ids.has(selectedIdRef.current)) {
      setSelectedId(null)
      selectedIdRef.current = null
    }
    setInspectorId((prev) => (prev && ids.has(prev) ? null : prev))
    setDirty(true)
    setSaveMsg(null)
  }, [])

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
          onOpenInspector: () => {
            setSelectedId(n.id)
            selectedIdRef.current = n.id
            setInspectorId(n.id)
          },
          audionCatalog,
          brandionCatalog,
        },
      })),
    [
      nodes,
      onManualGate,
      onOutputToNote,
      onPlaySegment,
      onUpdateNode,
      runBusy,
      runOutputs,
      runStates,
      audionCatalog,
      brandionCatalog,
    ]
  )

  const selectedFlowNode = useMemo(() => {
    if (!inspectorId) return null
    const rf = nodes.find((n) => n.id === inspectorId) as CollectionFlowRfNodeModel | undefined
    return rf?.data?.flowNode ?? null
  }, [nodes, inspectorId])

  const bindSourceLabel = useMemo(() => {
    if (!inspectorId || selectedFlowNode?.kind !== 'compare') return null
    const bind = (edges as CollectionFlowRfEdge[]).find(
      (e) => e.target === inspectorId && e.data?.edgeKind === 'bind'
    )
    if (!bind) return null
    const src = nodes.find((n) => n.id === bind.source) as CollectionFlowRfNodeModel | undefined
    const label = src?.data?.flowNode?.label ?? bind.source
    const path = bind.data?.bindPath ?? selectedFlowNode.path
    return path ? `${label} · ${path}` : label
  }, [edges, nodes, selectedFlowNode, inspectorId])

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
  const brandGuidelineId =
    typeof lastRun?.context?.outputs?.brand === 'object' &&
    lastRun?.context?.outputs?.brand &&
    typeof (lastRun.context.outputs.brand as { guidelineId?: unknown }).guidelineId === 'string'
      ? (lastRun.context.outputs.brand as { guidelineId: string }).guidelineId.trim()
      : ''
  const brandHref = brandGuidelineId
    ? pathBrandionGuidelineEvaluate(brandGuidelineId, { adapter: 'fixture' })
    : null

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
          isValidConnection={isValidConnection}
          onEdgesDelete={onEdgesDelete}
          onNodesDelete={onNodesDelete}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onSelectionDragStop={onSelectionDragStop}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={runBusy ? null : ['Backspace', 'Delete']}
          nodesDraggable={!runBusy}
          nodesConnectable={!runBusy}
          elementsSelectable={!runBusy}
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
                    aria-label="Historie"
                    title="Lauf-Historie"
                    onClick={() => setHistoryOpen((o) => !o)}
                    disabled={runBusy}
                  >
                    Hist
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Webhook"
                    title="Webhook-Trigger"
                    onClick={() => setWebhookOpen((o) => !o)}
                    disabled={runBusy}
                  >
                    WH
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Anordnen"
                    title="Nodes automatisch anordnen"
                    icon={<IconLayout />}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    onClick={autoLayout}
                    disabled={runBusy || nodes.length === 0}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Parallel-Persona"
                    title="Parallel-Persona (Authoring)"
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    onClick={addParallelPersona}
                    disabled={runBusy}
                  >
                    ‖P
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Node duplizieren"
                    title="Node duplizieren"
                    icon={<IconDuplicate />}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    onClick={duplicateSelected}
                    disabled={!selectedId || runBusy}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="msqdx-flow-toolbar-btn"
                    aria-label="Node löschen"
                    title="Node löschen (Entf / ⌫)"
                    icon={<IconDelete />}
                    onMouseDown={(e) => {
                      // Keep selection: focus move to toolbar must not race-clear before delete.
                      e.preventDefault()
                    }}
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
              {PALETTE_JOURNEY_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="msqdx-flow-canvas-hint">{group.title}</p>
                  <div className="msqdx-flow-palette-row">
                    {group.presets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        size="sm"
                        variant="subtle"
                        onClick={() => addPreset(preset.id)}
                        disabled={runBusy}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {PALETTE_QUALITY_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="msqdx-flow-canvas-hint">{group.title}</p>
                  <div className="msqdx-flow-palette-row">
                    {group.presets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        size="sm"
                        variant="subtle"
                        onClick={() => addPreset(preset.id)}
                        disabled={runBusy}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {PALETTE_BRAND_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="msqdx-flow-canvas-hint">{group.title}</p>
                  <div className="msqdx-flow-palette-row">
                    {group.presets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        size="sm"
                        variant="subtle"
                        onClick={() => addPreset(preset.id)}
                        disabled={runBusy}
                        data-testid={`flow-palette-${preset.id}`}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </FlowBoardPalette>
          </CollectionFlowFloatingPanel>

          <CollectionFlowFloatingPanel
            storageKey={`plexon.flow.run.${flow.id}`}
            defaultEdge="bottom"
            defaultOffset={0.5}
            title={undefined}
            variant="strip"
            className={
              runDockOpen
                ? 'msqdx-flow-float-panel--run'
                : 'msqdx-flow-float-panel--run msqdx-flow-float-panel--run-collapsed'
            }
            ariaLabel="Run Status"
          >
            <div className="msqdx-flow-run-dock">
              <button
                type="button"
                className="msqdx-flow-run-dock-toggle"
                aria-expanded={runDockOpen}
                aria-controls={`plexon-flow-run-body-${flow.id}`}
                onClick={toggleRunDock}
              >
                <span className="msqdx-flow-run-dock-title">Run</span>
                {!runDockOpen ? (
                  <span className="msqdx-flow-run-dock-summary">
                    {runMeta
                      ? `${runMeta.status} · ${jobSummary?.stepCount ?? runMeta.stepCount} steps`
                      : lastRun
                        ? [
                            lastRun.status,
                            lastRun.overallScore != null ? `score ${lastRun.overallScore}` : null,
                            verdict?.collectionReady === false
                              ? 'not ready'
                              : verdict?.collectionReady
                                ? 'ready'
                                : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Status & Verdict'}
                  </span>
                ) : null}
                <span className="msqdx-flow-run-dock-chevron" aria-hidden>
                  {runDockOpen ? '▾' : '▸'}
                </span>
              </button>
              {runDockOpen ? (
                <div id={`plexon-flow-run-body-${flow.id}`} className="msqdx-flow-run-dock-body">
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
                          steps {jobSummary?.stepCount ?? runMeta.stepCount} · job{' '}
                          {runMeta.jobId.slice(0, 10)}…
                        </span>
                      ) : (
                        <Text role="meta" as="p">
                          {lastRun
                            ? [
                                `Letzter Lauf · ${lastRun.status}`,
                                lastRun.overallScore != null
                                  ? `score ${lastRun.overallScore}`
                                  : null,
                                lastRun.issueGateBranch
                                  ? `issueGate ${lastRun.issueGateBranch}`
                                  : null,
                                lastRun.criticalCount != null
                                  ? `${lastRun.criticalCount} critical`
                                  : null,
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
                      studyHref ||
                      waveHref ||
                      scanHref ||
                      issuesHref ||
                      geoHref ||
                      brandHref ||
                      softQSummary ? (
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
                          {brandHref ? (
                            <a href={brandHref} target="_blank" rel="noreferrer">
                              BRANDION Evaluate
                            </a>
                          ) : null}
                        </>
                      ) : undefined
                    }
                    verdict={<CollectionFlowVerdictCard verdict={verdict} />}
                  />
                  {(lastRun || Object.keys(runOutputs).length > 0) && !runBusy ? (
                    <>
                      <CollectionFlowOutputsDossier
                        nodes={ensureFlowDocument(flow.flow).nodes}
                        runOutputs={runOutputs}
                        pins={reportPins}
                        historyRunId={activeHistoryRunId}
                        pinBusyNodeId={pinBusyNodeId}
                        onSelectNode={(nodeId) => setInspectorId(nodeId)}
                        onTogglePin={(item) => void onToggleReportPin(item)}
                      />
                      <FlowReportCollectionBar
                        platformProjectId={platformProjectId}
                        flowId={flow.id}
                        pins={reportPins}
                        onPinsChange={setReportPins}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CollectionFlowFloatingPanel>

          {selectedFlowNode ? (
            <CollectionFlowNodeInspector
              open
              node={selectedFlowNode}
              runState={runStates[inspectorId!] ?? 'idle'}
              inspector={inspectorByNode[inspectorId!] ?? null}
              jobSummary={jobSummary}
              verdict={verdict}
              lastRun={lastRun}
              bindSourceLabel={bindSourceLabel}
              edges={edges as CollectionFlowRfEdge[]}
              rfNodes={nodes as CollectionFlowRfNodeModel[]}
              audionCatalog={audionCatalog ?? undefined}
              brandionCatalog={brandionCatalog ?? undefined}
              onClose={() => setInspectorId(null)}
              onAppendOutputToNote={() => onInspectorOutputToNote(inspectorId!)}
              onUpdate={onUpdateNode}
            />
          ) : null}

          {webhookOpen ? (
            <CollectionFlowFloatingPanel
              storageKey={`plexon.flow.webhook.${flow.id}`}
              defaultEdge="left"
              defaultOffset={0.18}
              title="Webhook"
              ariaLabel="Flow Webhook"
            >
              <CollectionFlowWebhookPanel
                platformProjectId={platformProjectId}
                flowId={flow.id}
                webhookEnabled={Boolean(flow.webhookEnabled)}
                webhookSecretHint={flow.webhookSecretHint ?? null}
                onUpdated={(next) => {
                  setFlow((f) => ({
                    ...f,
                    webhookEnabled: next.webhookEnabled,
                    webhookSecretHint: next.webhookSecretHint,
                  }))
                }}
              />
            </CollectionFlowFloatingPanel>
          ) : null}

          {historyOpen ? (
            <CollectionFlowFloatingPanel
              storageKey={`plexon.flow.history.${flow.id}`}
              defaultEdge="left"
              defaultOffset={0.72}
              title="Historie"
              ariaLabel="Flow Lauf-Historie"
            >
              <CollectionFlowHistoryPanel
                platformProjectId={platformProjectId}
                flowId={flow.id}
                selectedRunId={viewedRun?.id ?? null}
                refreshKey={historyRefreshKey}
                onSelect={(run) => paintFromRun(run)}
                onRerun={() => void onTest()}
                onClose={() => setHistoryOpen(false)}
              />
            </CollectionFlowFloatingPanel>
          ) : null}

          <ContextMenu
            open={Boolean(contextMenu)}
            x={contextMenu?.x ?? 0}
            y={contextMenu?.y ?? 0}
            onClose={closeContextMenu}
            items={contextMenuItems}
            label="Flow Board Menü"
          />
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
