'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { apiPublicReport } from '@/lib/constants';
import { PublicReportView } from '@/components/assistant/PublicReportView';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { MsqdxTypography } from '@msqdx/react';

export default function ShareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    title: string;
    narrative: { intro?: string; fazit?: string };
    uiLayout: UiLayout;
  } | null>(null);

  useEffect(() => {
    void params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiPublicReport(token));
        if (!res.ok) throw new Error('Report not found');
        const data = (await res.json()) as {
          title: string;
          narrative: { intro?: string; fazit?: string };
          uiLayout: UiLayout;
        };
        setReport(data);
      } catch {
        setError('Dieser Report ist nicht verfügbar.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <MsqdxTypography variant="h6">{error ?? 'Nicht gefunden'}</MsqdxTypography>
      </Box>
    );
  }

  return (
    <PublicReportView title={report.title} shareToken={token ?? undefined} uiLayout={report.uiLayout} />
  );
}
