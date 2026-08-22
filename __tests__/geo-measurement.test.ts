import { describe, expect, it } from 'vitest';
import {
  parseGeoMeasurement,
  parseGeoMeasurements,
  parseGeoMeasurementsOrDefault,
  parseGeoMeasurementsOrDefaultEqc,
  toggleGeoMeasurement,
  geoMeasurementMagazineLabel,
} from '@/lib/geo/measurement';

describe('GEO measurement helpers', () => {
  it('parses single and multi-select layers', () => {
    expect(parseGeoMeasurement(undefined)).toBe('recall');
    expect(parseGeoMeasurements(undefined)).toEqual([]);
    expect(parseGeoMeasurements('both')).toEqual(['recall', 'live']);
    expect(parseGeoMeasurements('recall,live')).toEqual(['recall', 'live']);
    expect(parseGeoMeasurementsOrDefault(undefined)).toEqual(['recall']);
    expect(parseGeoMeasurementsOrDefaultEqc(undefined)).toEqual(['recall', 'live']);
  });

  it('toggles without mixing layers', () => {
    expect(toggleGeoMeasurement(['recall'], 'live')).toEqual(['recall', 'live']);
    expect(toggleGeoMeasurement(['recall', 'live'], 'recall')).toEqual(['live']);
    expect(geoMeasurementMagazineLabel('live')).toBe('Layer 2 · Live-Suche');
  });
});
