import { describe, expect, it } from 'vitest';
import { nodeIoSchemaForKind } from '@/lib/collection-flow-node-ports';

describe('collection-flow-node-ports', () => {
  it('defines fixed input counts per quality kind', () => {
    expect(nodeIoSchemaForKind('start').inputs).toHaveLength(0);
    expect(nodeIoSchemaForKind('scan').inputs).toHaveLength(1);
    expect(nodeIoSchemaForKind('scan').inputs[0]?.label).toBe('Ablauf');
    expect(nodeIoSchemaForKind('compare').inputs.map((i) => i.label)).toEqual([
      'Ablauf',
      'Wert',
    ]);
    expect(nodeIoSchemaForKind('compare').controlOutputs.map((o) => o.handleId)).toEqual([
      'when',
      'otherwise',
    ]);
  });

  it('marks action kinds as catalog output writers', () => {
    expect(nodeIoSchemaForKind('scan').catalogOutputs).toBe(true);
    expect(nodeIoSchemaForKind('geo_job').catalogOutputs).toBe(true);
    expect(nodeIoSchemaForKind('compare').catalogOutputs).toBe(false);
  });
});
