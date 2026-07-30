import { describe, expect, it } from 'vitest';
import { checkionApiPlexonAssistantReportPptx } from '@/lib/paths/checkion-api';
import { apiPublicReportPptx } from '@/lib/constants';

describe('checkion-api plexon report pptx path', () => {
  it('points to CHECKION integrations endpoint', () => {
    const path = checkionApiPlexonAssistantReportPptx();
    expect(path).toContain('/api/integrations/plexon/assistant-report/pptx');
  });
});

describe('apiPublicReportPptx', () => {
  it('builds public pptx download route', () => {
    expect(apiPublicReportPptx('rpt_test123456789012345678')).toBe(
      '/api/public/reports/rpt_test123456789012345678/pptx'
    );
  });
});