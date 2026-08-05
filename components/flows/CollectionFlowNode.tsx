'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Text } from '@msqdx/ui'
import type { CollectionFlowNodeKind, CollectionFlowNodeRunState } from '@/lib/collection-test-flow'

export type CollectionFlowRfNodeData = {
  kind: CollectionFlowNodeKind
  label: string
  detail?: string
  runState?: CollectionFlowNodeRunState
}

function CollectionFlowNodeInner({ data }: NodeProps) {
  const d = data as CollectionFlowRfNodeData
  const state = d.runState ?? 'idle'
  return (
    <div className="plexon-flow-node" data-kind={d.kind} data-state={state}>
      <Handle type="target" position={Position.Left} className="plexon-flow-handle" />
      <Text role="meta" as="p" className="plexon-flow-node-kind">
        {d.kind}
      </Text>
      <Text role="title" as="p" className="plexon-flow-node-label">
        {d.label}
      </Text>
      {d.detail ? (
        <Text role="meta" as="p" className="plexon-flow-node-detail">
          {d.detail}
        </Text>
      ) : null}
      <Handle type="source" position={Position.Right} className="plexon-flow-handle" />
    </div>
  )
}

export const CollectionFlowNode = memo(CollectionFlowNodeInner)
