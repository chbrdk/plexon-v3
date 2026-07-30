'use client';

import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';

export type ReportBinaryFormat = 'pdf' | 'pptx';

type ReportBinaryDownloadButtonProps = {
  downloadUrl: string;
  label: string;
  format: ReportBinaryFormat;
  errorLabel?: string;
  loadingLabel?: string;
  size?: 'small' | 'medium';
  sx?: Record<string, unknown>;
};

function isValidBuffer(bytes: Uint8Array, format: ReportBinaryFormat, contentType: string): boolean {
  if (format === 'pdf') {
    return (
      contentType.includes('application/pdf') ||
      (bytes.length >= 5 && String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === '%PDF')
    );
  }
  return (
    contentType.includes('presentationml') ||
    contentType.includes('application/vnd.openxmlformats') ||
    (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b)
  );
}

function defaultFilename(format: ReportBinaryFormat): string {
  return format === 'pdf' ? 'plexon-assistant-report.pdf' : 'plexon-assistant-report.pptx';
}

function blobMime(format: ReportBinaryFormat): string {
  return format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
}

export function ReportBinaryDownloadButton({
  downloadUrl,
  label,
  format,
  errorLabel = 'Export fehlgeschlagen',
  loadingLabel = '…',
  size = 'small',
  sx,
}: ReportBinaryDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(downloadUrl, { credentials: 'same-origin' });
      const contentType = res.headers.get('content-type') ?? '';
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const valid = isValidBuffer(bytes, format, contentType);

      if (!res.ok || !valid) {
        const text = new TextDecoder().decode(bytes);
        let message = errorLabel;
        try {
          const json = JSON.parse(text) as { error?: string };
          if (json.error) message = json.error;
        } catch {
          if (text) message = text.slice(0, 200);
        }
        throw new Error(message);
      }

      const blob = new Blob([buf], { type: blobMime(format) });
      const disposition = res.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? defaultFilename(format);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : errorLabel);
    } finally {
      setLoading(false);
    }
  }, [downloadUrl, errorLabel, format]);

  return (
    <Box sx={sx}>
      <MsqdxButton
        variant="outlined"
        size={size}
        disabled={loading}
        onClick={() => void download()}
        sx={sx}
      >
        {loading ? loadingLabel : label}
      </MsqdxButton>
      {error ? (
        <Box component="span" sx={{ display: 'block', fontSize: 12, color: 'error.main', mt: 0.5 }}>
          {error}
        </Box>
      ) : null}
    </Box>
  );
}
