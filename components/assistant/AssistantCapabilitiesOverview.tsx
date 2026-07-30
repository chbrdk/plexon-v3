'use client';

import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import {
  ASSISTANT_CAPABILITIES_EXAMPLES,
  ASSISTANT_CAPABILITIES_FOOTER,
  ASSISTANT_CAPABILITIES_INTRO,
  ASSISTANT_CAPABILITIES_SECTIONS,
  ASSISTANT_CAPABILITIES_TITLE,
} from '@/lib/assistant/capabilities-overview';

export function AssistantCapabilitiesOverview() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <MsqdxTypography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {ASSISTANT_CAPABILITIES_TITLE}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ lineHeight: 1.6 }}>
          {ASSISTANT_CAPABILITIES_INTRO}
        </MsqdxTypography>
      </Box>

      {ASSISTANT_CAPABILITIES_SECTIONS.map((section) => (
        <Box key={section.id}>
          <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {section.title}
          </MsqdxTypography>

          {section.rows && section.rows.length > 0 && (
            <Box
              sx={{
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                borderRadius: 'var(--msqdx-radius-sm)',
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'var(--color-secondary-dx-grey-light-tint, rgba(0,0,0,0.04))' }}>
                    <TableCell sx={{ fontWeight: 600, width: '32%' }}>Funktion</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Beschreibung</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {section.rows.map((row) => (
                    <TableRow key={row.name} hover>
                      <TableCell sx={{ fontWeight: 500, verticalAlign: 'top' }}>{row.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', verticalAlign: 'top' }}>
                        {row.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {section.bullets && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {section.bullets.map((item) => (
                <Box component="li" key={item} sx={{ mb: 0.5 }}>
                  <MsqdxTypography variant="body2" sx={{ lineHeight: 1.55 }}>
                    {item}
                  </MsqdxTypography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}

      <Box>
        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Beispiele
        </MsqdxTypography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {ASSISTANT_CAPABILITIES_EXAMPLES.map((example) => (
            <Box
              key={example}
              sx={{
                px: 1.25,
                py: 0.75,
                borderLeft: '3px solid var(--color-primary-main, #1976d2)',
                bgcolor: 'rgba(25, 118, 210, 0.06)',
                borderRadius: '0 var(--msqdx-radius-sm) var(--msqdx-radius-sm) 0',
              }}
            >
              <MsqdxTypography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                „{example}"
              </MsqdxTypography>
            </Box>
          ))}
        </Box>
      </Box>

      <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>
        {ASSISTANT_CAPABILITIES_FOOTER}
      </MsqdxTypography>
    </Box>
  );
}
