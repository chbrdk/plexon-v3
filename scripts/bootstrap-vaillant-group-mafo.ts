#!/usr/bin/env npx tsx
/**
 * Upsert Vaillant Group UC1 barrier-research flow (Collection flows DB).
 *
 *   DATABASE_URL=… npx tsx scripts/bootstrap-vaillant-group-mafo.ts
 */

import { ensureVaillantGroupBarrierResearchFlow } from '../lib/demo/bootstrap-vaillant-group-mafo';
import { VAILLANT_GROUP_PLATFORM_PROJECT_ID } from '../lib/demo/vaillant-group-mafo';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const result = await ensureVaillantGroupBarrierResearchFlow({
    platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  })

  if (!result.ok) {
    console.error(result.error ?? 'bootstrap failed')
    process.exit(1)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        platformProjectId: result.platformProjectId,
        flowId: result.flowId,
        flowsUrl: `https://plexon-v3.projects-a.plygrnd.tech/projects/${result.platformProjectId}/flows`,
      },
      null,
      2,
    ),
  )
}

main().catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
