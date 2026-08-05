'use client'

import { Text } from '@msqdx/ui'
import type { CollectionVerdict } from '@/lib/collection-test-flow'

type Props = {
  verdict: CollectionVerdict | null | undefined
}

export function CollectionFlowVerdictCard({ verdict }: Props) {
  if (!verdict) {
    return (
      <div className="plexon-flow-verdict" data-ready="false">
        <Text role="meta" as="p" className="plexon-flow-verdict-kicker">
          Collection verdict
        </Text>
        <Text role="headline" as="h3">
          Noch kein Lauf
        </Text>
        <Text role="body" as="p">
          Mit Testen den Quality-Pfad starten.
        </Text>
      </div>
    )
  }

  return (
    <div
      className="plexon-flow-verdict"
      data-ready={verdict.collectionReady ? 'true' : 'false'}
      data-status={verdict.status}
    >
      <Text role="meta" as="p" className="plexon-flow-verdict-kicker">
        Collection verdict
        {verdict.collectionReady ? ' · ready' : ' · not ready'}
      </Text>
      <Text role="headline" as="h3">
        {verdict.summary}
      </Text>
      <ul className="plexon-flow-verdict-flags">
        <li data-ok={verdict.flowCompleted ? 'true' : 'false'}>
          flowCompleted: {String(verdict.flowCompleted)}
        </li>
        <li data-ok={verdict.pageEvidenceValid ? 'true' : 'false'}>
          pageEvidenceValid: {String(verdict.pageEvidenceValid)}
        </li>
        <li data-ok={verdict.qualityPassed ? 'true' : 'false'}>
          qualityPassed: {String(verdict.qualityPassed)}
          {verdict.overallScore != null
            ? ` (score ${verdict.overallScore} / ≥${verdict.threshold})`
            : ''}
        </li>
        <li data-ok={verdict.collectionReady ? 'true' : 'false'}>
          collectionReady: {String(verdict.collectionReady)}
        </li>
      </ul>
      {verdict.pageEvidenceCaveat ? (
        <Text role="meta" as="p">
          {verdict.pageEvidenceCaveat}
        </Text>
      ) : null}
      {verdict.blockers.length > 0 ? (
        <Text role="meta" as="p">
          {verdict.blockers.join(' · ')}
        </Text>
      ) : null}
    </div>
  )
}
