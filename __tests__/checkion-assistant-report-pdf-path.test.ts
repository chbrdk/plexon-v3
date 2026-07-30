import { describe, expect, it } from 'vitest';
import { checkionApiPlexonAssistantReportPdf } from '@/lib/paths/checkion-api';

describe('checkion-api plexon report pdf path', () => {
  it('points to CHECKION integrations endpoint', () => {
    const path = checkionApiPlexonAssistantReportPdf();
    expect(path).toContain('/api/integrations/plexon/assistant-report/pdf');
  });
});
