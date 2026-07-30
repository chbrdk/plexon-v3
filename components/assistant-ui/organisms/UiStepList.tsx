'use client';

import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { MsqdxStepper } from '@msqdx/react';
import type { stepListPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { plexonAssistantStepperSx } from '@/lib/plexon-surface-styles';

type Props = z.infer<typeof stepListPropsSchema>;

function workflowActiveStep(steps: Array<{ status: WorkflowStep['status'] }>): number {
  const runningIdx = steps.findIndex((s) => s.status === 'running');
  if (runningIdx >= 0) return runningIdx;

  const errorIdx = steps.findIndex((s) => s.status === 'error');
  if (errorIdx >= 0) return errorIdx;

  const pendingIdx = steps.findIndex((s) => s.status === 'pending');
  if (pendingIdx >= 0) return pendingIdx;

  return steps.length;
}

export function UiStepList({ title, steps }: Props) {
  const activeStep = workflowActiveStep(steps);

  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.step_list}>
      <MsqdxStepper
        orientation="vertical"
        activeStep={activeStep}
        sx={plexonAssistantStepperSx}
        steps={steps.map((step) => ({
          label: step.label,
          description: [
            step.detail,
            typeof step.progress === 'number' && step.status === 'running' ? `${step.progress}%` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }))}
      />
    </UiBlockSurface>
  );
}
