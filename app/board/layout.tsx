import type { ReactNode } from 'react';
import { RequireAdminRole } from '@/components/auth/RequireAdminRole';

export default function BoardLayout({ children }: { children: ReactNode }) {
  return <RequireAdminRole>{children}</RequireAdminRole>;
}
