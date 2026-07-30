'use client';

import { Box, alpha } from '@mui/material';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { dataTablePropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS, UI_FONT_SANS, uiMonoLabelSx } from '@/lib/assistant/ui-typography';

type Props = z.infer<typeof dataTablePropsSchema>;

const LIGHT_TEXT = MSQDX_THEME.light.text.primary;
const LIGHT_BORDER = MSQDX_THEME.light.border.default;

export function UiDataTable({ title, columns, rows }: Props) {
  const borderColor = LIGHT_BORDER;
  const headerBg = alpha(LIGHT_TEXT, 0.03);

  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.data_table} noPadding>
      <Box sx={{ overflowX: 'auto', p: `${MSQDX_SPACING.scale.md}px` }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
            fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
            color: 'var(--color-text-on-light)',
            '& th, & td': {
              border: `1px solid ${borderColor}`,
              px: `${MSQDX_SPACING.scale.sm}px`,
              py: `${MSQDX_SPACING.scale.xs}px`,
              textAlign: 'left',
            },
            '& th': {
              bgcolor: headerBg,
              ...uiMonoLabelSx,
              fontSize: MSQDX_TYPOGRAPHY.fontSize.xs,
            },
            '& td': {
              fontFamily: UI_FONT_SANS,
            },
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={`row-${ri}`}>
                {columns.map((_, ci) => (
                  <td key={`${ri}-${ci}`}>{row[ci] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </UiBlockSurface>
  );
}
