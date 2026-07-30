'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Link as MuiLink } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { apiPlatformProjectDashboard } from '@/lib/constants';

type DashboardPayload = {
  platformProject: { id: string; name: string; companyId: string; status: string; domain: string | null };
  bindings: Array<{
    productId: string;
    externalProjectId: string | null;
    syncStatus: string;
    syncMessage: string | null;
  }>;
  checkion: { externalProjectId: string; scanCount: number } | null;
  audion: { externalProjectId: string; personaCount: number } | null;
  links: { checkionProject: string; audionProject: string };
};

export default function PlatformProjectDashboardPage() {
  const params = useParams<{ platformProjectId: string }>();
  const platformProjectId = params.platformProjectId;
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!platformProjectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiPlatformProjectDashboard(platformProjectId), {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || res.statusText);
        }
        const json = (await res.json()) as DashboardPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platformProjectId]);

  if (!platformProjectId) {
    return null;
  }

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 960, mx: 'auto' }}>
      <MsqdxTypography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Platform project
      </MsqdxTypography>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}
      {error && (
        <MsqdxTypography variant="body2" sx={{ color: 'error.main' }}>
          {error}
        </MsqdxTypography>
      )}
      {data && !loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <MsqdxTypography variant="h6">{data.platformProject.name}</MsqdxTypography>
          <MsqdxTypography variant="body2" color="text.secondary">
            Status: {data.platformProject.status}
            {data.platformProject.domain ? ` · Domain: ${data.platformProject.domain}` : ''}
          </MsqdxTypography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                CHECKION
              </MsqdxTypography>
              {data.checkion ? (
                <MsqdxTypography variant="body2">
                  Scans: {data.checkion.scanCount}
                  <br />
                  Local id: {data.checkion.externalProjectId}
                </MsqdxTypography>
              ) : (
                <MsqdxTypography variant="body2" color="text.secondary">
                  No summary (sync product or configure CHECKION API URL / secret).
                </MsqdxTypography>
              )}
              <MuiLink href={data.links.checkionProject} target="_blank" rel="noreferrer" sx={{ mt: 1, display: 'inline-block' }}>
                Open CHECKION
              </MuiLink>
            </Box>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                AUDION
              </MsqdxTypography>
              {data.audion ? (
                <MsqdxTypography variant="body2">
                  Personas: {data.audion.personaCount}
                  <br />
                  Local id: {data.audion.externalProjectId}
                </MsqdxTypography>
              ) : (
                <MsqdxTypography variant="body2" color="text.secondary">
                  No summary (sync product or configure AUDION API URL / secret).
                </MsqdxTypography>
              )}
              <MuiLink href={data.links.audionProject} target="_blank" rel="noreferrer" sx={{ mt: 1, display: 'inline-block' }}>
                Open AUDION
              </MuiLink>
            </Box>
          </Box>
          <MsqdxTypography variant="subtitle2" sx={{ mt: 2 }}>
            Product bindings
          </MsqdxTypography>
          {data.bindings.map((b) => (
            <MsqdxTypography key={b.productId} variant="body2">
              {b.productId}: {b.syncStatus}
              {b.externalProjectId ? ` → ${b.externalProjectId}` : ''}
              {b.syncMessage ? ` (${b.syncMessage})` : ''}
            </MsqdxTypography>
          ))}
        </Box>
      )}
    </Box>
  );
}
