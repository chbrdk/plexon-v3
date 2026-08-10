'use client'

import { useMemo, type ReactNode } from 'react'
import {
  parseChatBlocks,
  type ChatBlock,
  type ChatInline,
} from '@/lib/assistant/format-chat-answer'

function renderInlines(inlines: ChatInline[], keyPrefix: string): ReactNode[] {
  return inlines.map((seg, i) => {
    const key = `${keyPrefix}-${i}`
    if (seg.type === 'text') return <span key={key}>{seg.value}</span>
    if (seg.type === 'strong') return <strong key={key}>{seg.value}</strong>
    if (seg.type === 'em') return <em key={key}>{seg.value}</em>
    if (seg.type === 'code') {
      return (
        <code key={key} className="chat-answer-code">
          {seg.value}
        </code>
      )
    }
    if (seg.type === 'link') {
      return (
        <a
          key={key}
          className="chat-answer-link"
          href={seg.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {seg.label}
        </a>
      )
    }
    return (
      <span key={key} className="chat-answer-cite">
        [{seg.n}]
      </span>
    )
  })
}

function BlockView({ block, index }: { block: ChatBlock; index: number }) {
  const prefix = `b${index}`
  if (block.type === 'h') {
    const Tag = block.level === 3 ? 'h4' : 'h3'
    return (
      <Tag className={`chat-answer-h chat-answer-h${block.level}`}>
        {renderInlines(block.inlines, prefix)}
      </Tag>
    )
  }
  if (block.type === 'ol') {
    return (
      <ol className="chat-answer-ol">
        {block.items.map((item, j) => (
          <li key={`${prefix}-li-${j}`}>{renderInlines(item, `${prefix}-li-${j}`)}</li>
        ))}
      </ol>
    )
  }
  if (block.type === 'ul') {
    return (
      <ul className="chat-answer-ul">
        {block.items.map((item, j) => (
          <li key={`${prefix}-li-${j}`}>{renderInlines(item, `${prefix}-li-${j}`)}</li>
        ))}
      </ul>
    )
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="chat-answer-quote">
        {renderInlines(block.inlines, prefix)}
      </blockquote>
    )
  }
  if (block.type === 'code') {
    return (
      <pre className="chat-answer-pre" data-lang={block.lang || undefined}>
        <code>{block.value}</code>
      </pre>
    )
  }
  return <p className="chat-answer-p">{renderInlines(block.inlines, prefix)}</p>
}

/** Formatted assistant answer using DS `.chat-answer-*` chrome. */
export function AssistantChatAnswer({ answer }: { answer: string }) {
  const blocks = useMemo(() => parseChatBlocks(answer), [answer])

  return (
    <div className="chat-answer plexon-assistant-markdown" role="article" aria-label="Assistant answer">
      {blocks.map((block, i) => (
        <BlockView key={`block-${i}`} block={block} index={i} />
      ))}
    </div>
  )
}
