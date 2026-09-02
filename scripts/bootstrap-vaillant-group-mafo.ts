#!/usr/bin/env npx tsx
/**
 * Vaillant Group MaFo demo bootstrap (flows + knowledge pack).
 *
 *   DATABASE_URL=… npx tsx scripts/bootstrap-vaillant-group-mafo.ts
 */

import { ensureVaillantGroupKnowledgePackSeed } from '../lib/demo/bootstrap-vaillant-group-knowledge-pack';
import {
  ensureVaillantGroupBarrierResearchFlow,
  ensureVaillantGroupInstallerDualFlow,
} from '../lib/demo/bootstrap-vaillant-group-mafo';
import { ensureVaillantCheckionCorpus } from '../lib/demo/ensure-vaillant-checkion-corpus';
import { VAILLANT_GROUP_PLATFORM_PROJECT_ID } from '../lib/demo/vaillant-group-mafo';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const corpusNoWait = process.argv.includes('--corpus-no-wait');
  const forceCorpusRefresh =
    process.argv.includes('--force-corpus-refresh') ||
    process.env.VAILLANT_MAFO_CORPUS_FORCE_REFRESH === '1';
  const platformProjectId = VAILLANT_GROUP_PLATFORM_PROJECT_ID;

  const knowledge = await ensureVaillantGroupKnowledgePackSeed({ platformProjectId });
  if (!knowledge.ok) {
    console.error(knowledge.error ?? 'knowledge pack seed failed');
    process.exit(1);
  }

  const uc1 = await ensureVaillantGroupBarrierResearchFlow({ platformProjectId });
  if (!uc1.ok) {
    console.error(uc1.error ?? 'UC1 flow bootstrap failed');
    process.exit(1);
  }

  const uc2 = await ensureVaillantGroupInstallerDualFlow({ platformProjectId });
  if (!uc2.ok) {
    console.error(uc2.error ?? 'UC2 flow bootstrap failed');
    process.exit(1);
  }

  const corpus = await ensureVaillantCheckionCorpus({
    platformProjectId,
    waitForCompletion: !corpusNoWait,
    forceRefresh: forceCorpusRefresh,
  });
  if (!corpus.ok) {
    console.warn('[vaillant-mafo] CHECKION corpus bootstrap incomplete:', corpus.error);
    for (const spine of corpus.spines) {
      if (!spine.ok) {
        console.warn(`  ${spine.spine}: ${spine.error ?? 'failed'}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        platformProjectId,
        knowledge: {
          revision: knowledge.revision,
          skipped: knowledge.skipped ?? false,
        },
        flows: {
          uc1: uc1.flowId,
          uc2: uc2.flowId,
        },
        corpus: {
          ok: corpus.ok,
          checkionProjectId: corpus.checkionProjectId,
          spines: corpus.spines,
        },
        flowsUrl: `https://plexon-v3.projects-a.plygrnd.tech/projects/${platformProjectId}/flows`,
        knowledgeUrl: `https://plexon-v3.projects-a.plygrnd.tech/projects/${platformProjectId}/knowledge`,
      },
      null,
      2,
    ),
  );
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
