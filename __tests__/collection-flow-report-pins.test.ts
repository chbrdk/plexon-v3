import { describe, expect, it } from 'vitest'
import {
  flowOutputSnapshotToUiBlock,
  flowPinsToUiBlocks,
  truncateFlowPinText,
} from '@/lib/collection-flow-report-pins'
import { FLOW_REPORT_KP_SECTION_ID, buildFlowReportKnowledgeSection } from '@/lib/collection-flow-distill-report'
import type { ReportNarrative } from '@/lib/assistant/reports/types'

describe('Wave 26 flow report pins', () => {
  it('truncates long pin text', () => {
    const long = 'a'.repeat(2500)
    const out = truncateFlowPinText(long)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(2000)
  })

  it('maps snapshot to text UiBlock', () => {
    const block = flowOutputSnapshotToUiBlock({
      nodeId: 'n-prompt',
      kind: 'prompt',
      label: 'Persona Prompt',
      text: 'Technische Unsicherheit im Altbau.',
      historyRunId: 'run-1',
    })
    expect(block.type).toBe('text')
    expect(block.id).toBe('flow-out-n-prompt')
    expect(block.props.title).toBe('Persona Prompt')
    expect(String(block.props.markdown)).toMatch(/Altbau/)
    expect(String(block.props.markdown)).toMatch(/prompt/)
  })

  it('maps multiple pins preserving order', () => {
    const blocks = flowPinsToUiBlocks([
      { nodeId: 'a', kind: 'out', label: 'A', text: 'one' },
      { nodeId: 'b', kind: 'out', label: 'B', text: 'two' },
    ])
    expect(blocks.map((b) => b.id)).toEqual(['flow-out-a', 'flow-out-b'])
  })

  it('builds KP section flow-report-latest', () => {
    const narrative: ReportNarrative = {
      title: 'Vaillant Barriers',
      intro: 'Kurzüberblick',
      executiveSummary: 'Zusammenfassung der Barrieren.',
      findings: [{ title: 'Altbau', description: 'Unsicherheit bei Eignung.' }],
      recommendations: [{ title: 'Klarere Produktseiten' }],
      fazit: 'Weiter testen.',
    }
    const section = buildFlowReportKnowledgeSection({
      reportId: 'rep-1',
      flowId: 'flow-1',
      narrative,
      sharePath: '/share/reports/tok',
    })
    expect(section.id).toBe(FLOW_REPORT_KP_SECTION_ID)
    expect(section.title).toMatch(/Vaillant/)
    expect(section.plainText).toMatch(/reportId=rep-1/)
    expect(section.bullets?.some((b) => /Altbau/.test(b))).toBe(true)
  })
})
