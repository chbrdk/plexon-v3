import { describe, expect, it } from 'vitest';
import { apiPublicReportPptx } from '@/lib/constants';
import { checkionApiPlexonAssistantReportPptx } from '@/lib/paths/checkion-api';
import {
  isAssistantReportPptxDebugPlanRequest,
  withAssistantReportPptxDebugPlan,
} from '@/lib/paths/assistant-report-export';

describe('assistant report pptx debug paths', () => {
  it('builds public debug URL', () => {
    expect(apiPublicReportPptx('rpt_test123456789012345678', { debugPlan: true })).toBe(
      '/api/public/reports/rpt_test123456789012345678/pptx?debug=plan'
    );
  });

  it('builds CHECKION debug URL', () => {
    const url = checkionApiPlexonAssistantReportPptx({ debugPlan: true });
    expect(url).toContain('/api/integrations/plexon/assistant-report/pptx?debug=plan');
  });

  it('detects debug=plan on request URL', () => {
    expect(isAssistantReportPptxDebugPlanRequest('http://localhost/api/public/reports/rpt_x/pptx?debug=plan')).toBe(
      true
    );
  });

  it('appends debug query to relative path', () => {
    expect(withAssistantReportPptxDebugPlan('/api/public/reports/rpt_x/pptx')).toBe(
      '/api/public/reports/rpt_x/pptx?debug=plan'
    );
  });
});
