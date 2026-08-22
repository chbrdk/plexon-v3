import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('EQC GEO measurement switch', () => {
  it('confirm panel is multi-select and posts measurements', () => {
    const panel = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckGeoQuestionsPanel.tsx'),
      'utf8'
    );
    expect(panel).toContain('aria-label="GEO measurement"');
    expect(panel).toContain('role="checkbox"');
    expect(panel).toContain('parseGeoMeasurementsOrDefaultEqc');
    expect(panel).toContain('toggleGeoMeasurement');
    expect(panel).toContain('onConfirm(flattenGroups(nextGroups), nextGroups, measurements)');

    const route = readFileSync(
      path.join(
        root,
        'app/api/assistant/event-quick-check/runs/[runId]/geo-questions/route.ts'
      ),
      'utf8'
    );
    expect(route).toContain('measurements: body.measurements');

    const execute = readFileSync(
      path.join(root, 'lib/collection-flow-eqc-execute.ts'),
      'utf8'
    );
    expect(execute).toContain('resolveGeoJobMeasurementsFromContext');
    expect(execute).toContain('GEO_MEASUREMENT_DEFAULTS_EQC');
    expect(execute).toContain('for (const measurement of measurements)');
  });
});
