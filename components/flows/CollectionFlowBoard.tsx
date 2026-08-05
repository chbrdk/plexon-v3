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
  apiPlatformProjectDashboard,
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
  PALETTE_QUALITY_KINDS,
  edgeKindLabel,
  flowToRf,
  isCatalogBindConnection,
  makeBindRfEdge,
  newCollectionFlowNode,
  newCollectionFlowNodeFromPreset,
  nextEdgeKindForSource,
  removeNodesFromRfGraph,
  duplicateNodesInRfGraph,
  rfToDocument,
  syncBindEdgesForComparePath,
  type CollectionFlowRfEdge,
  type CollectionFlowRfNode as CollectionFlowRfNodeModel,
} from '@/lib/collection-flow-canvas'
import { PALETTE_JOURNEY_GROUPS } from '@/lib/collection-flow-presets'
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
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'
import type { AudionJourneyJobSnapshot } from '@/lib/integrations/audion-journey-client'
import { CollectionFlowFloatingPanel } from './CollectionFlowFloatingPanel'
import { CollectionFlowRfNode } from './CollectionFlowRfNode'
import { CollectionFlowNodeInspector } from './CollectionFlowNodeInspector'
import { CollectionFlowVerdictCard } from './CollectionFlowVerdictCard'
import {
  IconDelete,
  IconDuplicate,
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
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [audionCatalog, setAudionCatalog] = useState<{
    personas: Array<{ id: string; name: string }>
    targetGroups: Array<{ id: string; name: string; segment: string }>
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
        } | null
        if (cancelled || !json?.audion) return
        setAudionCatalog({
          personas: (json.audion.personas ?? []).map((p) => ({ id: p.id, name: p.name })),
          targetGroups: (json.audion.targetGroups ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            segment: t.segment ?? '',
          })),
        })
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
  }, [
    dirty,
    flow.id,
    getSnapshot,
    onSave,
    platformProjectId,
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

  const addPreset = useCallback(
    (presetId: string) => {
      pushHistory()
      const flowNode = newCollectionFlowNodeFromPreset(presetId)
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
    selectedIdRef.current = null
    setDirty(true)
    setSaveMsg(null)
  }, [runBusy, nodes, edges, setNodes, setEdges, pushHistory])

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
      selectedIdRef.current = newIds[0]
    }
    setDirty(true)
    setSaveMsg(null)
  }, [runBusy, nodes, setNodes, pushHistory])

  const onNodesDelete = useCallback((deleted: CollectionFlowRfNodeModel[]) => {
    const ids = new Set(deleted.map((n) => n.id))
    if (selectedIdRef.current && ids.has(selectedIdRef.current)) {
      setSelectedId(null)
      selectedIdRef.current = null
    }
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
          onOpenInspector: () => setSelectedId(n.id),
          audionCatalog,
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
    ]
  )

  const selectedFlowNode = useMemo(() => {
    if (!selectedId) return null
    const rf = nodes.find((n) => n.id === selectedId) as CollectionFlowRfNodeModel | undefined
    return rf?.data?.flowNode ?? null
  }, [nodes, selectedId])

  const bindSourceLabel = useMemo(() => {
    if (!selectedId || selectedFlowNode?.kind !== 'compare') return null
    const bind = (edges as CollectionFlowRfEdge[]).find(
      (e) => e.target === selectedId && e.data?.edgeKind === 'bind'
    )
    if (!bind) return null
    const src = nodes.find((n) => n.id === bind.source) as CollectionFlowRfNodeModel | undefined
    const label = src?.data?.flowNode?.label ?? bind.source
    const path = bind.data?.bindPath ?? selectedFlowNode.path
    return path ? `${label} · ${path}` : label
  }, [edges, nodes, selectedFlowNode, selectedId])

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
          isValidConnection={isValidConnection}
          onEdgesDelete={onEdgesDelete}
          onNodesDelete={onNodesDelete}
          onSelectionChange={onSelectionChange}
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
                        </>
                      ) : undefined
                    }
                    verdict={<CollectionFlowVerdictCard verdict={verdict} />}
                  />
                </div>
              ) : null}
            </div>
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
                lastRun={lastRun}
                bindSourceLabel={bindSourceLabel}
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
