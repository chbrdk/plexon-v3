'use client';

import type { alertPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiAlert } from '@/components/assistant-ui/molecules/UiAlert';

type Props = z.infer<typeof alertPropsSchema>;

export function UiAlertBlock(props: Props) {
  return <UiAlert {...props} />;
}
