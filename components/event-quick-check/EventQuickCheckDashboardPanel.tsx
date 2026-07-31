'use client';

import type { ReactNode, CSSProperties } from 'react';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = {
  title?: string;
  icon?: string;
  eyebrow?: string;
  infoTooltip?: string;
  infoTooltipAriaLabel?: string;
  children: ReactNode;
  gridColumn?: { xs?: string; lg?: string };
};

export function EventQuickCheckDashboardPanel({
  title,
  icon,
  eyebrow,
  infoTooltip,
  infoTooltipAriaLabel,
  children,
  gridColumn,
}: Props) {
  const style: CSSProperties | undefined = gridColumn?.lg
    ? { gridColumn: gridColumn.lg.startsWith('span') ? gridColumn.lg : `span ${gridColumn.lg}` }
    : undefined;

  return (
    <div className="plexon-eqc-dashboard-panel" style={style}>
      <UiBlockSurface
        title={title}
        icon={icon}
        eyebrow={eyebrow}
        infoTooltip={infoTooltip}
        infoTooltipAriaLabel={infoTooltipAriaLabel}
        sx={{ height: '100%' }}
      >
        <div className="plexon-eqc-dashboard-panel-inner">{children}</div>
      </UiBlockSurface>
    </div>
  );
}
