import { describe, expect, it } from 'vitest';
import {
  checkionApiGeoEeatJob,
  checkionApiGeoEeatProject,
  checkionApiGeoEeatStart,
  checkionApiGeoEeatStatus,
  checkionApiScanProject,
  checkionApiScansDomainProject,
  checkionApiToolsSsl,
  checkionApiToolsWayback,
  checkionApiScanDomainCreate,
  checkionApiScanDomainStatus,
  checkionApiScanSummarize,
  checkionApiToolsContrast,
  pathCheckionDomainResult,
  pathCheckionDomainScan,
  pathCheckionScanIssues,
  pathCheckionScanResult,
} from '@/lib/paths/checkion-api';

describe('checkion-api paths', () => {
  it('builds geo endpoints', () => {
    expect(checkionApiGeoEeatStart()).toMatch(/\/api\/scan\/geo-eeat$/);
    expect(checkionApiGeoEeatJob('job-1')).toMatch(/\/api\/scan\/geo-eeat\/job-1$/);
    expect(checkionApiGeoEeatStatus('job-1')).toMatch(/\/api\/scan\/geo-eeat\/job-1\/status$/);
  });

  it('builds tool endpoints with query params', () => {
    expect(checkionApiToolsSsl('example.com')).toContain('host=example.com');
    expect(checkionApiToolsWayback('https://example.com')).toContain('url=');
    expect(checkionApiToolsContrast('000000', 'ffffff')).toContain('f=000000');
  });

  it('builds domain scan and summarize endpoints', () => {
    expect(checkionApiScanDomainCreate()).toMatch(/\/api\/scan\/domain$/);
    expect(checkionApiScanDomainStatus('dom-1')).toMatch(/\/status$/);
    expect(checkionApiScanSummarize('scan-1')).toMatch(/\/summarize$/);
    expect(pathCheckionDomainScan({ url: 'https://a.com', scanId: 'dom-1' })).toContain('scanId=dom-1');
  });

  it('builds catalog deep-links', () => {
    expect(pathCheckionDomainResult('dom-1')).toMatch(/\/domain\/dom-1$/);
    expect(pathCheckionScanResult('scan-1')).toMatch(/\/results\/scan-1$/);
    expect(pathCheckionScanIssues('scan-1')).toMatch(/\/results\/scan-1\/issues$/);
  });

  it('builds project assign endpoints', () => {
    expect(checkionApiScanProject('scan-1')).toMatch(/\/api\/scan\/scan-1\/project$/);
    expect(checkionApiScansDomainProject('dom-1')).toMatch(/\/api\/scans\/domain\/dom-1\/project$/);
    expect(checkionApiGeoEeatProject('job-1')).toMatch(/\/api\/scan\/geo-eeat\/job-1\/project$/);
  });
});
