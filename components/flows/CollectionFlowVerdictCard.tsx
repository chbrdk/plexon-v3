'use client'

import { Text } from '@msqdx/ui'
import type { CollectionVerdict } from '@/lib/collection-test-flow'

type Props = {
  verdict: CollectionVerdict | null | undefined
}

/** Collection-domain verdict band — chrome via `.msqdx-flow-verdict`; flags stay product-local. */
export function CollectionFlowVerdictCard({ verdict }: Props) {
  if (!verdict) {
    return (
      <div className="msqdx-flow-verdict plexon-flow-verdict" data-ready="false">
        <Text role="meta" as="p" className="plexon-flow-verdict-kicker">
          Collection verdict
        </Text>
        <Text role="headline" as="h3">
          Noch kein Lauf
        </Text>
        <Text role="body" as="p">
          Mit Testen den Flow starten.
        </Text>
      </div>
    )
  }

  return (
    <div
      className="msqdx-flow-verdict plexon-flow-verdict"
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
        {verdict.hasJourneySegment ? (
          <li data-ok={verdict.taskCompleted ? 'true' : 'false'}>
            taskCompleted: {String(verdict.taskCompleted)}
          </li>
        ) : null}
        <li data-ok={verdict.validEvidence ? 'true' : 'false'}>
          validEvidence: {String(verdict.validEvidence)}
        </li>
        <li data-ok={verdict.scorePassed ? 'true' : 'false'}>
          scorePassed: {String(verdict.scorePassed)}
          {verdict.overallScore != null
            ? ` (score ${verdict.overallScore} / ≥${verdict.threshold})`
            : ''}
        </li>
        {verdict.hasIssueGate ? (
          <li data-ok={verdict.issueGatePassed ? 'true' : 'false'}>
            issueGate: {verdict.issueGateBranch ?? '—'}
            {verdict.criticalCount != null
              ? ` · ${verdict.criticalCount} critical / ${verdict.issueCount ?? 0} issues`
              : ''}
          </li>
        ) : null}
        {verdict.hasGeoGate ? (
          <li data-ok={verdict.geoGatePassed ? 'true' : 'false'}>
            geoGate: {verdict.geoGateBranch ?? '—'}
            {verdict.citedShare != null ? ` · cited ${verdict.citedShare}%` : ''}
            {verdict.geoFitness != null ? ` · fitness ${verdict.geoFitness}` : ''}
          </li>
        ) : null}
        <li data-ok={verdict.qualityPassed ? 'true' : 'false'}>
          qualityPassed: {String(verdict.qualityPassed)}
        </li>
        <li data-ok={verdict.collectionReady ? 'true' : 'false'}>
          collectionReady: {String(verdict.collectionReady)}
        </li>
      </ul>
      {verdict.pageEvidenceCaveat ? (
        <Text role="meta" as="p" className="msqdx-flow-verdict-caveat">
          {verdict.pageEvidenceCaveat}
        </Text>
      ) : null}
      {verdict.blockers.length > 0 ? (
        <Text role="meta" as="p" className="msqdx-flow-verdict-blockers">
          {verdict.blockers.join(' · ')}
        </Text>
      ) : null}
    </div>
  )
}
