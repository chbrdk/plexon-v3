'use client';

import { Box, MenuItem, Select } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { plexonLightInputSx } from '@/lib/plexon-surface-styles';

export type ProjectInsightOption = {
  platformProjectId: string;
  name: string;
  domain?: string | null;
};

type ProjectContextChipProps = {
  projects: ProjectInsightOption[];
  value: string | null;
  onChange: (platformProjectId: string | null) => void;
};

export function ProjectContextChip({ projects, value, onChange }: ProjectContextChipProps) {
  const { t } = useI18n();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
        {t('assistant.projectContext')}
      </MsqdxTypography>
      <Select
        size="small"
        value={value ?? ''}
        displayEmpty
        onChange={(e) => onChange(e.target.value ? String(e.target.value) : null)}
        sx={{ minWidth: 200, ...plexonLightInputSx }}
      >
        <MenuItem value="">
          <em>{t('assistant.noProjects')}</em>
        </MenuItem>
        {projects.map((p) => (
          <MenuItem key={p.platformProjectId} value={p.platformProjectId}>
            {p.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
