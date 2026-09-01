#!/usr/bin/env npx tsx
/**
 * Run Vaillant Group MaFo UC1 or UC2 flow (operator / container bootstrap).
 *
 *   DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc2
 *   DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc2 --if-pending
 */

import { runVaillantGroupMafoFlow } from '../lib/demo/run-vaillant-group-mafo-flow';
import { VAILLANT_GROUP_PLATFORM_PROJECT_ID } from '../lib/demo/vaillant-group-mafo';

function parseArgs(argv: string[]): {
  kinds: Array<'uc1' | 'uc2'>;
  ifPending: boolean;
} {
  const all = argv.includes('--all');
  const uc2 = argv.includes('--uc2');
  const uc1 = argv.includes('--uc1');
  if (all && (uc1 || uc2)) {
    console.error('Pass --all or exactly one of --uc1 / --uc2');
    process.exit(1);
  }
  if (uc1 && uc2) {
    console.error('Pass exactly one of --uc1 or --uc2');
    process.exit(1);
  }
  return {
    kinds: all ? ['uc1', 'uc2'] : [uc2 ? 'uc2' : 'uc1'],
    ifPending: argv.includes('--if-pending'),
  };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const { kinds, ifPending } = parseArgs(process.argv.slice(2));
  let exitCode = 0;

  for (const kind of kinds) {
    const result = await runVaillantGroupMafoFlow({
      platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
      kind,
      ifPending,
    });
    console.log(JSON.stringify({ kind, ...result }, null, 2));
    if (!result.ok && !result.skipped) {
      exitCode = 1;
    }
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
