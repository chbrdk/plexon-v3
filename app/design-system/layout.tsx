import type { ReactNode } from 'react';
import { RequireAdminRole } from '@/components/auth/RequireAdminRole';

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return <RequireAdminRole>{children}</RequireAdminRole>;
}
