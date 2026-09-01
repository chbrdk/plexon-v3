#!/usr/bin/env npx tsx
/**
 * Run Vaillant Group MaFo UC1 or UC2 flow (operator / container bootstrap).
 *
 *   DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc2
 *   DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc2 --if-pending
 */

import { runVaillantGroupMafoFlow } from '../lib/demo/run-vaillant-group-mafo-flow';
import { VAILLANT_GROUP_PLATFORM_PROJECT_ID } from '../lib/demo/vaillant-group-mafo';

function parseArgs(argv: string[]): { kind: 'uc1' | 'uc2'; ifPending: boolean } {
  const uc2 = argv.includes('--uc2');
  const uc1 = argv.includes('--uc1');
  if (uc1 && uc2) {
    console.error('Pass exactly one of --uc1 or --uc2');
    process.exit(1);
  }
  return {
    kind: uc2 ? 'uc2' : 'uc1',
    ifPending: argv.includes('--if-pending'),
  };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const { kind, ifPending } = parseArgs(process.argv.slice(2));
  const result = await runVaillantGroupMafoFlow({
    platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
    kind,
    ifPending,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok && !result.skipped) {
    process.exit(1);
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
