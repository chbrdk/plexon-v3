'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxButton,
  MsqdxCard,
  MsqdxFormField,
} from '@msqdx/react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ADMIN_USERS,
  API_ADMIN_USAGE,
  API_ADMIN_USAGE_EVENTS,
  API_ADMIN_COMPANIES,
  API_USAGE,
  API_PLATFORM_ME_PROJECT_INSIGHTS,
  PATH_HOME,
  pathPlatformProjectDashboard,
  apiAdminUser,
  apiAdminUserEntitlements,
  apiAdminUserCompanies,
  apiAdminUserProvisioning,
  apiAdminUserProductProjectOptions,
} from '@/lib/constants';
import type { AdminProductProjectOption } from '@/lib/admin-product-project-options';
import { COMPANY_USER_ROLE } from '@/lib/platform-companies';
import { ProductCatalog } from '@/components/products/ProductCatalog';
import { FORM_FIELD_ACCENT_SX } from '@/lib/theme-accent';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatUsageEventDetail } from '@/lib/usage-event-detail';
import type {
  PlatformEntitlementStatus,
  PlatformLaunchContext,
  PlatformProductId,
  PlatformRole,
} from '@/lib/platform-entitlements';
import type { PlatformProductEntryPoint } from '@/lib/platform-products';

const ENTITLEMENT_PROJECT_SELECT_STYLE = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--msqdx-radius-sm)',
  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
  background: 'var(--color-card-bg)',
  color: 'var(--color-text-on-light)',
} as const;

type CentralUser = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  locale?: string;
  role?: string;
  createdAt?: string;
};

type UsageSummaryItem = {
  userId?: string;
  service: string;
  period: string;
  tokensTotal: number;
  updatedAt?: string;
};

type UsageEventItem = {
  id: string;
  service: string;
  eventType: string;
  rawUnits?: Record<string, unknown>;
  tokens: number;
  createdAt: string;
};

type AdminUsageEventItem = {
  id: string;
  userId: string;
  userEmail: string | null;
  service: string;
  eventType: string;
  rawUnits?: Record<string, unknown>;
  tokens: number;
  createdAt: string;
};

type AdminCompanyOption = { id: string; name: string; slug: string | null };
type EditOrgRow = { companyId: string; role: string };

type UsageByDayItem = {
  date: string;
  tokens: number;
};

type PlatformInsightProject = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  companyId: string;
};

type ProjectInsightEntry = {
  platformProject: PlatformInsightProject;
  checkion: { externalProjectId: string; scanCount: number } | null;
  audion: { externalProjectId: string; personaCount: number } | null;
  links: { checkionProject: string; audionProject: string };
  /** Omitted or true: `platformProject.id` is a real PLEXON platform project. */
  openPlatformProject?: boolean;
};

type EditableEntitlement = {
  productId: PlatformProductId;
  name: string;
  lifecycle: string;
  surface: string;
  defaultAccess: 'granted' | 'hidden';
  source: 'default' | 'explicit';
  status: PlatformEntitlementStatus;
  platformRole: PlatformRole;
  entryPoints: PlatformProductEntryPoint[];
  defaultContext: PlatformLaunchContext | null;
  projectAssignments: Array<{
    projectId: string;
    role: 'admin' | 'member';
  }>;
  provisioning?: {
    desiredState: 'granted' | 'disabled';
    syncStatus: 'pending' | 'in_sync' | 'failed' | 'disabled' | 'not_supported';
    syncMessage: string | null;
    lastAttemptAt: string | null;
    lastSucceededAt: string | null;
    externalUserRef: string | null;
  } | null;
};

type ProvisioningActionMode = 'retry' | 'resync';

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const openedEditUserRef = useRef<string | null>(null);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [users, setUsers] = useState<CentralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editLocale, setEditLocale] = useState('de');
  const [editRole, setEditRole] = useState('user');
  const [editEntitlements, setEditEntitlements] = useState<EditableEntitlement[]>([]);
  const [editEntitlementsLoading, setEditEntitlementsLoading] = useState(false);
  const [editCompanyMemberships, setEditCompanyMemberships] = useState<EditOrgRow[]>([]);
  const [editCompanyMembershipsLoading, setEditCompanyMembershipsLoading] = useState(false);
  const [adminCompaniesCatalog, setAdminCompaniesCatalog] = useState<AdminCompanyOption[]>([]);
  const [provisioningAction, setProvisioningAction] = useState<{
    productId: PlatformProductId;
    mode: ProvisioningActionMode;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryItem[]>([]);
  const [usageOwnSummary, setUsageOwnSummary] = useState<UsageSummaryItem[]>([]);
  const [usageRecentEvents, setUsageRecentEvents] = useState<UsageEventItem[]>([]);
  const [usageByDay, setUsageByDay] = useState<UsageByDayItem[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [adminUsageEvents, setAdminUsageEvents] = useState<AdminUsageEventItem[]>([]);
  const [adminUsageEventsLoading, setAdminUsageEventsLoading] = useState(false);
  const [adminUsageEventsHasMore, setAdminUsageEventsHasMore] = useState(false);
  const [usageChartRange, setUsageChartRange] = useState<'day' | 'month' | 'year'>('day');
  const [projectInsights, setProjectInsights] = useState<ProjectInsightEntry[]>([]);
  const [projectInsightsLoading, setProjectInsightsLoading] = useState(false);
  const [projectInsightsError, setProjectInsightsError] = useState<string | null>(null);
  const [projectInsightsMeta, setProjectInsightsMeta] = useState<{
    truncated: boolean;
    totalAccessible: number;
    shown: number;
  } | null>(null);
  const [productProjectOptions, setProductProjectOptions] = useState<
    Partial<Record<'checkion' | 'audion', AdminProductProjectOption[]>>
  >({});
  const [productProjectOptionsLoading, setProductProjectOptionsLoading] = useState(false);

  const formatProvisioningTimestamp = useCallback((value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }, []);

  const projectPickerRowsFor = useCallback(
    (productId: 'checkion' | 'audion', currentValue: string): AdminProductProjectOption[] => {
      const base = productProjectOptions[productId] ?? [];
      const trimmed = currentValue.trim();
      if (!trimmed || base.some((o) => o.projectId === trimmed)) return base;
      return [
        {
          projectId: trimmed,
          platformProjectId: null,
          platformProjectName: null,
          platformProjectDomain: null,
        },
        ...base,
      ];
    },
    [productProjectOptions]
  );

  const formatProductProjectLabel = useCallback(
    (o: AdminProductProjectOption) => {
      if (o.platformProjectName) {
        return o.platformProjectDomain
          ? `${o.platformProjectName} · ${o.platformProjectDomain}`
          : o.platformProjectName;
      }
      return t('dashboard.productProjectPickerLegacyId', { id: o.projectId });
    },
    [t]
  );

  const usageByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of usageOwnSummary) {
      const p = r.period;
      if (p) map.set(p, (map.get(p) ?? 0) + r.tokensTotal);
    }
    return Array.from(map.entries()).map(([period, tokens]) => ({ period, tokens })).sort((a, b) => a.period.localeCompare(b.period)).slice(-12);
  }, [usageOwnSummary]);

  const usageByYear = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of usageOwnSummary) {
      const y = r.period?.slice(0, 4) ?? '';
      if (y) map.set(y, (map.get(y) ?? 0) + r.tokensTotal);
    }
    return Array.from(map.entries()).map(([year, tokens]) => ({ year, tokens })).sort((a, b) => a.year.localeCompare(b.year));
  }, [usageOwnSummary]);

  const fetchUsage = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      setUsageLoading(false);
      return;
    }
    setUsageLoading(true);
    try {
      const [ownRes, adminRes, adminEventsRes] = await Promise.all([
        fetch(API_USAGE),
        isAdmin ? fetch(API_ADMIN_USAGE) : Promise.resolve(null),
        isAdmin
          ? fetch(`${API_ADMIN_USAGE_EVENTS}?limit=100&offset=0`, { credentials: 'same-origin' })
          : Promise.resolve(null),
      ]);
      const ownData = await ownRes.json().catch(() => ({}));
      if (ownRes.ok) {
        setUsageRecentEvents(Array.isArray(ownData?.recentEvents) ? ownData.recentEvents : []);
        setUsageByDay(Array.isArray(ownData?.byDay) ? ownData.byDay : []);
        setUsageOwnSummary(Array.isArray(ownData?.summary) ? ownData.summary : []);
        if (!isAdmin) setUsageSummary(Array.isArray(ownData?.summary) ? ownData.summary : []);
      } else {
        setUsageRecentEvents([]);
        setUsageByDay([]);
        setUsageOwnSummary([]);
        if (!isAdmin) setUsageSummary([]);
      }
      if (isAdmin && adminRes?.ok) {
        const adminData = await adminRes.json().catch(() => ({}));
        setUsageSummary(Array.isArray(adminData?.summary) ? adminData.summary : []);
      } else if (isAdmin && ownRes.ok && Array.isArray(ownData?.summary)) {
        setUsageSummary(ownData.summary);
      }

      if (!isAdmin) {
        setAdminUsageEvents([]);
        setAdminUsageEventsHasMore(false);
      } else if (adminEventsRes?.ok) {
        const evData = await adminEventsRes.json().catch(() => ({}));
        const batch = Array.isArray(evData?.events) ? evData.events : [];
        setAdminUsageEvents(batch as AdminUsageEventItem[]);
        setAdminUsageEventsHasMore(batch.length === 100);
      } else {
        setAdminUsageEvents([]);
        setAdminUsageEventsHasMore(false);
      }
    } catch {
      setUsageSummary([]);
      setUsageOwnSummary([]);
      setUsageRecentEvents([]);
      setUsageByDay([]);
      setAdminUsageEvents([]);
      setAdminUsageEventsHasMore(false);
    } finally {
      setUsageLoading(false);
    }
  }, [sessionStatus, isAdmin]);

  const loadMoreAdminUsageEvents = useCallback(async () => {
    if (!isAdmin || adminUsageEventsLoading || !adminUsageEventsHasMore) return;
    setAdminUsageEventsLoading(true);
    try {
      const offset = adminUsageEvents.length;
      const res = await fetch(`${API_ADMIN_USAGE_EVENTS}?limit=100&offset=${offset}`, {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      const batch = Array.isArray(data?.events) ? data.events : [];
      setAdminUsageEvents((prev) => [...prev, ...(batch as AdminUsageEventItem[])]);
      setAdminUsageEventsHasMore(batch.length === 100);
    } catch {
      setAdminUsageEventsHasMore(false);
    } finally {
      setAdminUsageEventsLoading(false);
    }
  }, [
    isAdmin,
    adminUsageEventsLoading,
    adminUsageEventsHasMore,
    adminUsageEvents.length,
  ]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ADMIN_USERS);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? t('dashboard.loadError'));
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setError(t('dashboard.loadError'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!editId || !isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setAdminCompaniesCatalog(
          items
            .map((row: { id?: string; name?: string; slug?: string | null }) => ({
              id: String(row.id ?? ''),
              name: String(row.name ?? ''),
              slug: row.slug ?? null,
            }))
            .filter((c: AdminCompanyOption) => c.id && c.name)
        );
      } catch {
        /* ignore catalog errors; save will still surface API errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, isAdmin]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setProjectInsights([]);
      setProjectInsightsMeta(null);
      setProjectInsightsError(null);
      setProjectInsightsLoading(false);
      return;
    }
    let cancelled = false;
    setProjectInsightsLoading(true);
    setProjectInsightsError(null);
    void (async () => {
      try {
        const res = await fetch(API_PLATFORM_ME_PROJECT_INSIGHTS, { credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setProjectInsightsError(typeof data?.error === 'string' ? data.error : String(res.status));
          setProjectInsights([]);
          setProjectInsightsMeta(null);
          return;
        }
        setProjectInsights(Array.isArray(data?.projects) ? (data.projects as ProjectInsightEntry[]) : []);
        setProjectInsightsMeta({
          truncated: Boolean(data?.truncated),
          totalAccessible: typeof data?.totalAccessible === 'number' ? data.totalAccessible : 0,
          shown: typeof data?.shown === 'number' ? data.shown : 0,
        });
      } catch {
        if (!cancelled) {
          setProjectInsightsError(t('dashboard.loadError'));
          setProjectInsights([]);
          setProjectInsightsMeta(null);
        }
      } finally {
        if (!cancelled) setProjectInsightsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, t]);

  useEffect(() => {
    if (!editId || !isAdmin) {
      setProductProjectOptions({});
      setProductProjectOptionsLoading(false);
      return;
    }
    let cancelled = false;
    setProductProjectOptionsLoading(true);
    void (async () => {
      try {
        const [chkRes, audRes] = await Promise.all([
          fetch(apiAdminUserProductProjectOptions(editId, 'checkion'), {
            credentials: 'same-origin',
            cache: 'no-store',
          }),
          fetch(apiAdminUserProductProjectOptions(editId, 'audion'), {
            credentials: 'same-origin',
            cache: 'no-store',
          }),
        ]);
        const chk = await chkRes.json().catch(() => ({}));
        const aud = await audRes.json().catch(() => ({}));
        if (cancelled) return;
        setProductProjectOptions({
          checkion: chkRes.ok && Array.isArray(chk?.items) ? (chk.items as AdminProductProjectOption[]) : [],
          audion: audRes.ok && Array.isArray(aud?.items) ? (aud.items as AdminProductProjectOption[]) : [],
        });
      } catch {
        if (!cancelled) setProductProjectOptions({});
      } finally {
        if (!cancelled) setProductProjectOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, isAdmin]);

  const loadUserEntitlements = useCallback(
    async (userId: string) => {
      setEditEntitlementsLoading(true);
      try {
        const res = await fetch(apiAdminUserEntitlements(userId), { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? 'Failed to load entitlements');
          setEditEntitlements([]);
          return;
        }
        setEditEntitlements(Array.isArray(data?.items) ? (data.items as EditableEntitlement[]) : []);
      } catch {
        setError(t('dashboard.loadError'));
        setEditEntitlements([]);
      } finally {
        setEditEntitlementsLoading(false);
      }
    },
    [t]
  );

  const loadUserCompanyMemberships = useCallback(async (userId: string) => {
    setEditCompanyMembershipsLoading(true);
    try {
      const res = await fetch(apiAdminUserCompanies(userId), { cache: 'no-store', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to load organizations');
        setEditCompanyMemberships([]);
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      setEditCompanyMemberships(
        items.map((row: { companyId?: string; role?: string }) => ({
          companyId: typeof row.companyId === 'string' ? row.companyId : '',
          role: typeof row.role === 'string' ? row.role : COMPANY_USER_ROLE.MEMBER,
        }))
      );
    } catch {
      setError(t('dashboard.loadError'));
      setEditCompanyMemberships([]);
    } finally {
      setEditCompanyMembershipsLoading(false);
    }
  }, [t]);

  const updateEntitlement = useCallback(
    (
      productId: PlatformProductId,
      updater: (current: EditableEntitlement) => EditableEntitlement
    ) => {
      setEditEntitlements((current) =>
        current.map((item) => (item.productId === productId ? updater(item) : item))
      );
    },
    []
  );

  const addProjectAssignment = useCallback((productId: PlatformProductId) => {
    updateEntitlement(productId, (current) => ({
      ...current,
      projectAssignments: [...(current.projectAssignments ?? []), { projectId: '', role: 'member' }],
    }));
  }, [updateEntitlement]);

  const updateProjectAssignment = useCallback(
    (
      productId: PlatformProductId,
      index: number,
      updater: (current: { projectId: string; role: 'admin' | 'member' }) => {
        projectId: string;
        role: 'admin' | 'member';
      }
    ) => {
      updateEntitlement(productId, (current) => ({
        ...current,
        projectAssignments: (current.projectAssignments ?? []).map((assignment, assignmentIndex) =>
          assignmentIndex === index ? updater(assignment) : assignment
        ),
      }));
    },
    [updateEntitlement]
  );

  const removeProjectAssignment = useCallback((productId: PlatformProductId, index: number) => {
    updateEntitlement(productId, (current) => ({
      ...current,
      projectAssignments: (current.projectAssignments ?? []).filter(
        (_assignment, assignmentIndex) => assignmentIndex !== index
      ),
    }));
  }, [updateEntitlement]);

  const runProvisioningAction = useCallback(
    async (productId: PlatformProductId, mode: ProvisioningActionMode) => {
      if (!editId) return;
      setProvisioningAction({ productId, mode });
      try {
        const res = await fetch(apiAdminUserProvisioning(editId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, productIds: [productId] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? 'Provisioning action failed');
          return;
        }
        await loadUserEntitlements(editId);
      } catch {
        setError(t('dashboard.loadError'));
      } finally {
        setProvisioningAction(null);
      }
    },
    [editId, loadUserEntitlements, t]
  );

  const openEdit = useCallback(
    (u: CentralUser) => {
      setEditId(u.id);
      setEditName(u.name ?? '');
      setEditEmail(u.email ?? '');
      setEditCompany(u.company ?? '');
      setEditLocale(u.locale ?? 'de');
      setEditRole(u.role ?? 'user');
      setEditEntitlements([]);
      setEditCompanyMemberships([]);
      void loadUserEntitlements(u.id);
      void loadUserCompanyMemberships(u.id);
    },
    [loadUserEntitlements, loadUserCompanyMemberships]
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isAdmin || loading) return;
    const param = searchParams.get('editUser');
    if (!param) {
      openedEditUserRef.current = null;
      return;
    }
    if (openedEditUserRef.current === param) return;
    const u = users.find((x) => x.id === param);
    if (u) {
      openedEditUserRef.current = param;
      openEdit(u);
      router.replace(PATH_HOME, { scroll: false });
    }
  }, [sessionStatus, isAdmin, loading, users, searchParams, router, openEdit]);

  const handleSaveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        company: editCompany.trim() || undefined,
        locale: editLocale || undefined,
      };
      if (isAdmin) body.role = editRole;
      const res = await fetch(apiAdminUser(editId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Update failed');
        return;
      }

      if (isAdmin) {
        const orgItems = editCompanyMemberships
          .filter((m) => m.companyId.trim())
          .map((m) => ({ companyId: m.companyId.trim(), role: m.role }));
        const orgRes = await fetch(apiAdminUserCompanies(editId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ items: orgItems }),
        });
        const orgData = await orgRes.json().catch(() => ({}));
        if (!orgRes.ok) {
          setError(orgData?.error ?? 'Organizations update failed');
          return;
        }
      }

      const entitlementRes = await fetch(apiAdminUserEntitlements(editId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editEntitlements.map((item) => ({
            productId: item.productId,
            status: item.status,
            platformRole: item.platformRole,
            defaultContext: item.defaultContext,
            projectAssignments: (item.projectAssignments ?? [])
              .map((assignment) => ({
                projectId: assignment.projectId.trim(),
                role: assignment.role,
              }))
              .filter((assignment) => assignment.projectId),
          })),
        }),
      });
      const entitlementData = await entitlementRes.json().catch(() => ({}));
      if (!entitlementRes.ok) {
        setError(entitlementData?.error ?? 'Entitlements update failed');
        return;
      }

      setEditId(null);
      setEditEntitlements([]);
      setEditCompanyMemberships([]);
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('dashboard.deleteUserConfirm'))) return;
    setSaving(true);
    try {
      const res = await fetch(apiAdminUser(id), { method: 'DELETE', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Delete failed');
        return;
      }
      if (editId === id) {
        setEditId(null);
        setEditEntitlements([]);
        setEditCompanyMemberships([]);
      }
      await fetchUsers();
    } catch {
      setError(t('dashboard.loadError'));
    } finally {
      setSaving(false);
    }
  };

  const notConfigured = error && (error.includes('not configured') || error.includes('nicht konfiguriert') || error.includes('Database not configured'));

  return (
    <Box className="plexon-magazine" sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 'var(--msqdx-spacing-lg)' }}>
        <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('dashboard.title')}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 1 }}>
          {t('dashboard.subtitle')}
        </MsqdxTypography>
      </Box>

      {sessionStatus === 'authenticated' && (
        <Box sx={{ mb: 'var(--msqdx-spacing-lg)' }} data-section="product-teasers">
          <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 1.5 }}>
            {t('dashboard.productsTitle')}
          </MsqdxTypography>
          <ProductCatalog variant="dashboard" dataSection="product-teasers-grid" />
        </Box>
      )}

      {sessionStatus === 'authenticated' && (
        <Box sx={{ mb: 'var(--msqdx-spacing-lg)' }} data-section="platform-project-insights">
          <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 0.5 }}>
            {t('dashboard.platformInsightsTitle')}
          </MsqdxTypography>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
            {t('dashboard.platformInsightsSubtitle')}
          </MsqdxTypography>
          {projectInsightsLoading && (
            <MsqdxTypography variant="body2" color="text.secondary">
              {t('common.loading')}
            </MsqdxTypography>
          )}
          {!projectInsightsLoading && projectInsightsError && (
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              {projectInsightsError}
            </MsqdxTypography>
          )}
          {!projectInsightsLoading && !projectInsightsError && projectInsights.length === 0 && (
            <MsqdxTypography variant="body2" color="text.secondary">
              {t('dashboard.platformInsightsEmpty')}
            </MsqdxTypography>
          )}
          {!projectInsightsLoading && !projectInsightsError && projectInsights.length > 0 && (
            <>
              {projectInsightsMeta?.truncated && (
                <MsqdxTypography
                  variant="caption"
                  sx={{ display: 'block', color: 'var(--color-text-secondary)', mb: 2 }}
                >
                  {t('dashboard.platformInsightsTruncated', {
                    shown: projectInsightsMeta.shown,
                    total: projectInsightsMeta.totalAccessible,
                  })}
                </MsqdxTypography>
              )}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--msqdx-spacing-md)',
                }}
              >
                {projectInsights.map((row) => {
                  const pid = row.platformProject?.id ?? '';
                  if (!pid) return null;
                  const canOpenPlatform = row.openPlatformProject !== false;
                  return (
                    <MsqdxCard
                      key={pid}
                      variant="flat"
                      borderRadius="button"
                      sx={{
                        p: 'var(--msqdx-spacing-md)',
                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                        bgcolor: 'var(--color-card-bg)',
                        color: 'var(--color-text-on-light)',
                      }}
                    >
                      <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 0.25 }}>
                        {row.platformProject.name ?? pid}
                      </MsqdxTypography>
                      {row.platformProject.domain ? (
                        <MsqdxTypography
                          variant="caption"
                          sx={{ display: 'block', color: 'var(--color-text-secondary)', mb: 1.5 }}
                        >
                          {row.platformProject.domain}
                        </MsqdxTypography>
                      ) : (
                        <Box sx={{ mb: 1.5 }} />
                      )}
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <MsqdxTypography variant="body2">
                          {row.checkion != null
                            ? `${t('dashboard.platformInsightsScans')}: ${row.checkion.scanCount}`
                            : `${t('dashboard.platformInsightsScans')}: — (${t('dashboard.platformInsightsNoProduct')})`}
                        </MsqdxTypography>
                        <MsqdxTypography variant="body2">
                          {row.audion != null
                            ? `${t('dashboard.platformInsightsPersonas')}: ${row.audion.personaCount}`
                            : `${t('dashboard.platformInsightsPersonas')}: — (${t('dashboard.platformInsightsNoProduct')})`}
                        </MsqdxTypography>
                      </Stack>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {canOpenPlatform ? (
                          <Link href={pathPlatformProjectDashboard(pid)} style={{ textDecoration: 'none' }}>
                            <MsqdxButton variant="outlined" size="small" brandColor="green">
                              {t('dashboard.platformInsightsOpenProject')}
                            </MsqdxButton>
                          </Link>
                        ) : null}
                        <a
                          href={row.links.checkionProject}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', display: 'inline-flex' }}
                        >
                          <MsqdxButton variant="text" size="small" component="span">
                            {t('dashboard.platformInsightsOpenCheckion')}
                          </MsqdxButton>
                        </a>
                        <a
                          href={row.links.audionProject}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', display: 'inline-flex' }}
                        >
                          <MsqdxButton variant="text" size="small" component="span">
                            {t('dashboard.platformInsightsOpenAudion')}
                          </MsqdxButton>
                        </a>
                      </Stack>
                    </MsqdxCard>
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Zentrale Nutzer – nur für Admins sichtbar */}
      {isAdmin && (
      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{
          p: 'var(--msqdx-spacing-md)',
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-card-bg)',
          color: 'var(--color-text-on-light)',
        }}
        data-section="checkion-users"
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 0.5 }}>
          {t('dashboard.centralUsers') ?? 'Zentrale Nutzer'}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
          {t('dashboard.centralUsersSubtitle') ?? 'Ein Konto für alle Dienste (CHECKION, AUDION, VIDEON). Registrierung nur hier; Anmeldung dort mit denselben Zugangsdaten.'}
        </MsqdxTypography>

        {notConfigured && (
          <Box
            sx={{
              p: 2,
              borderRadius: 'var(--msqdx-radius-sm)',
              bgcolor: 'var(--color-bg-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <MsqdxTypography variant="body2">
              {error?.includes('Database not configured') ? t('dashboard.centralNotConfigured') : error}
            </MsqdxTypography>
          </Box>
        )}

        {!notConfigured && error && (
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'error.light', color: 'error.contrastText', mb: 2 }}>
            <MsqdxTypography variant="body2">{error}</MsqdxTypography>
          </Box>
        )}

        {!notConfigured && loading && (
          <MsqdxTypography variant="body2" color="text.secondary">{t('common.loading')}</MsqdxTypography>
        )}

        {!notConfigured && !loading && users.length === 0 && !error && (
          <MsqdxTypography variant="body2" color="text.secondary">
            {t('dashboard.noUsers')}
          </MsqdxTypography>
        )}

        {!notConfigured && !loading && users.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.email')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.name')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.company')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.locale')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.role')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.createdAt')}
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '8px 12px' }}>{u.email ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{u.name ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{u.company ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{u.locale ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{u.role ?? 'user'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <MsqdxButton variant="text" size="small" onClick={() => openEdit(u)}>
                        {t('dashboard.edit')}
                      </MsqdxButton>
                      <MsqdxButton variant="text" size="small" color="error" onClick={() => handleDelete(u.id)} sx={{ ml: 0.5 }}>
                        {t('dashboard.delete')}
                      </MsqdxButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </MsqdxCard>
      )}

      {/* Nutzung (Tokens pro Dienst/Periode) */}
      {!notConfigured && (
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            mt: 'var(--msqdx-spacing-lg)',
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
          data-section="usage"
        >
          <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 0.5 }}>
            {t('dashboard.usage') ?? 'Nutzung'}
          </MsqdxTypography>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
            {isAdmin ? (t('dashboard.usageSubtitleAdmin') ?? 'Token-Verbrauch aller Nutzer pro Dienst und Monat.') : (t('dashboard.usageSubtitle') ?? 'Dein Token-Verbrauch pro Dienst und Monat.')}
          </MsqdxTypography>
          {usageLoading && (
            <MsqdxTypography variant="body2" color="text.secondary">{t('common.loading')}</MsqdxTypography>
          )}
          {!usageLoading && usageSummary.length === 0 && (
            <MsqdxTypography variant="body2" color="text.secondary">
              {t('dashboard.usageNoData')}
            </MsqdxTypography>
          )}
          {!usageLoading && usageSummary.length > 0 && (
            <Box sx={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {t('dashboard.usageUser')}
                      </th>
                    )}
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {t('dashboard.usageService')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {t('dashboard.usagePeriod')}
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {t('dashboard.usageTokens')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageSummary.map((row, i) => (
                    <tr key={`${row.userId ?? ''}-${row.service}-${row.period}-${i}`} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {isAdmin && (
                        <td style={{ padding: '8px 12px' }}>
                          {row.userId ? (users.find((u) => u.id === row.userId)?.email ?? row.userId) : '—'}
                        </td>
                      )}
                      <td style={{ padding: '8px 12px' }}>{row.service}</td>
                      <td style={{ padding: '8px 12px' }}>{row.period}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.tokensTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {/* Admin: alle Nutzer – letzte Roh-Events */}
          {isAdmin && !usageLoading && (
            <Box sx={{ mt: 3 }}>
              <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 0.5 }}>
                {t('dashboard.usageAdminEventsTitle')}
              </MsqdxTypography>
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1.5 }}>
                {t('dashboard.usageAdminEventsSubtitle')}
              </MsqdxTypography>
              {adminUsageEvents.length === 0 ? (
                <MsqdxTypography variant="body2" color="text.secondary">
                  {t('dashboard.usageAdminEventsEmpty')}
                </MsqdxTypography>
              ) : (
                <>
                  <Box sx={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageHistoryTime')}
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageUser')}
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageService')}
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageHistoryEvent')}
                          </th>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageHistoryDetail')}
                          </th>
                          <th
                            style={{
                              textAlign: 'right',
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              position: 'sticky',
                              top: 0,
                              background: 'var(--color-card-bg)',
                            }}
                          >
                            {t('dashboard.usageTokens')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsageEvents.map((ev) => {
                          const detail = formatUsageEventDetail(ev.eventType, ev.rawUnits);
                          return (
                            <tr key={ev.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                              <td style={{ padding: '8px 12px' }}>
                                {new Date(ev.createdAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td style={{ padding: '8px 12px', maxWidth: 200, wordBreak: 'break-word' }}>
                                {ev.userEmail || ev.userId}
                              </td>
                              <td style={{ padding: '8px 12px' }}>{ev.service}</td>
                              <td style={{ padding: '8px 12px' }}>{ev.eventType}</td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  maxWidth: 320,
                                  color: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
                                  fontSize: '0.8125rem',
                                  wordBreak: 'break-word',
                                }}
                                title={detail || undefined}
                              >
                                {detail || '—'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                {ev.tokens.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                  {adminUsageEventsHasMore && (
                    <Box sx={{ mt: 1.5 }}>
                      <MsqdxButton
                        variant="outlined"
                        size="small"
                        onClick={() => void loadMoreAdminUsageEvents()}
                        disabled={adminUsageEventsLoading}
                      >
                        {adminUsageEventsLoading ? t('common.loading') : t('dashboard.usageLoadMore')}
                      </MsqdxButton>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Verlauf: letzte Nutzungen (eigene Events) */}
          {!usageLoading && usageRecentEvents.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1.5 }}>
                {t('dashboard.usageHistory')}
              </MsqdxTypography>
              <Box sx={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-card-bg)' }}>
                        {t('dashboard.usageHistoryTime')}
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-card-bg)' }}>
                        {t('dashboard.usageService')}
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-card-bg)' }}>
                        {t('dashboard.usageHistoryEvent')}
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-card-bg)' }}>
                        {t('dashboard.usageHistoryDetail')}
                      </th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)', position: 'sticky', top: 0, background: 'var(--color-card-bg)' }}>
                        {t('dashboard.usageTokens')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageRecentEvents.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: '8px 12px' }}>
                          {new Date(ev.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{ev.service}</td>
                        <td style={{ padding: '8px 12px' }}>{ev.eventType}</td>
                        <td
                          style={{
                            padding: '8px 12px',
                            maxWidth: 360,
                            color: 'var(--color-text-secondary, rgba(0,0,0,0.6))',
                            fontSize: '0.8125rem',
                            wordBreak: 'break-word',
                          }}
                          title={formatUsageEventDetail(ev.eventType, ev.rawUnits) || undefined}
                        >
                          {formatUsageEventDetail(ev.eventType, ev.rawUnits) || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{ev.tokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}

          {/* Diagramm: Verbrauch nach Tag / Monat / Jahr */}
          {!usageLoading && (usageByDay.length > 0 || usageOwnSummary.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1.5 }}>
                {t('dashboard.usageChart')}
              </MsqdxTypography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {(['day', 'month', 'year'] as const).map((range) => (
                  <MsqdxButton
                    key={range}
                    variant={usageChartRange === range ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setUsageChartRange(range)}
                  >
                    {range === 'day' ? t('dashboard.usageChartDay') : range === 'month' ? t('dashboard.usageChartMonth') : t('dashboard.usageChartYear')}
                  </MsqdxButton>
                ))}
              </Stack>
              {(() => {
                const chartData = usageChartRange === 'day'
                  ? usageByDay.map((d) => ({ label: d.date.slice(5) || d.date, tokens: d.tokens }))
                  : usageChartRange === 'month'
                    ? usageByMonth.map((d) => ({ label: d.period, tokens: d.tokens }))
                    : usageByYear.map((d) => ({ label: d.year, tokens: d.tokens }));
                const hasData = chartData.length > 0 && chartData.some((d) => d.tokens > 0);
                return hasData ? (
                  <Box sx={{ width: '100%', minWidth: 0, height: 260 }}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => [Number(value ?? 0).toLocaleString(), t('dashboard.usageTokens')]}
                        />
                        <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill="var(--color-primary-main, #1976d2)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <MsqdxTypography variant="body2" color="text.secondary">
                    {t('dashboard.usageNoData')}
                  </MsqdxTypography>
                );
              })()}
            </Box>
          )}
        </MsqdxCard>
      )}

      {editId && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            p: 2,
          }}
          onClick={() => {
            if (!saving) {
              setEditId(null);
              setEditEntitlements([]);
              setEditCompanyMemberships([]);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <MsqdxCard
            variant="flat"
            borderRadius="button"
            sx={{
              p: 'var(--msqdx-spacing-md)',
              maxWidth: 760,
              width: '100%',
              bgcolor: 'var(--color-card-bg)',
              color: 'var(--color-text-on-light)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MsqdxTypography id="edit-user-title" variant="h6" weight="semibold" sx={{ mb: 2 }}>
              {t('dashboard.editUser')}
            </MsqdxTypography>
            <Stack spacing={2}>
              <MsqdxFormField
                label={t('dashboard.email')}
                value={editEmail}
                onChange={(e) => setEditEmail((e.target as HTMLInputElement).value)}
                fullWidth
                sx={FORM_FIELD_ACCENT_SX}
              />
              <MsqdxFormField
                label={t('dashboard.name')}
                value={editName}
                onChange={(e) => setEditName((e.target as HTMLInputElement).value)}
                fullWidth
                sx={FORM_FIELD_ACCENT_SX}
              />
              <MsqdxFormField
                label={t('dashboard.company')}
                value={editCompany}
                onChange={(e) => setEditCompany((e.target as HTMLInputElement).value)}
                fullWidth
                sx={FORM_FIELD_ACCENT_SX}
              />
              {isAdmin && (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                  {t('dashboard.companyProfileHint')}
                </MsqdxTypography>
              )}
              {isAdmin && (
                <Box sx={{ pt: 0.5 }}>
                  <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('dashboard.organizationsTitle')}
                  </MsqdxTypography>
                  <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 1.5 }}>
                    {t('dashboard.organizationsSubtitle')}
                  </MsqdxTypography>
                  {editCompanyMembershipsLoading ? (
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      {t('common.loading')}
                    </MsqdxTypography>
                  ) : (
                    <Stack spacing={1.5}>
                      {editCompanyMemberships.map((row, idx) => {
                        const takenElsewhere = new Set(
                          editCompanyMemberships
                            .map((m, mi) => (mi !== idx && m.companyId.trim() ? m.companyId : null))
                            .filter(Boolean) as string[]
                        );
                        const selectOptions = adminCompaniesCatalog.filter((c) => !takenElsewhere.has(c.id));
                        return (
                          <Stack
                            key={idx}
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ sm: 'flex-end' }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                {t('dashboard.organizationSelect')}
                              </MsqdxTypography>
                              <select
                                value={row.companyId}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditCompanyMemberships((prev) =>
                                    prev.map((m, i) => (i === idx ? { ...m, companyId: v } : m))
                                  );
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--msqdx-radius-sm)',
                                  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                  background: 'var(--color-card-bg)',
                                  color: 'var(--color-text-on-light)',
                                }}
                              >
                                <option value="">—</option>
                                {selectOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.slug ? ` (${c.slug})` : ''}
                                  </option>
                                ))}
                                {row.companyId.trim() &&
                                !adminCompaniesCatalog.some((c) => c.id === row.companyId) ? (
                                  <option value={row.companyId}>{row.companyId}</option>
                                ) : null}
                              </select>
                            </Box>
                            <Box sx={{ minWidth: { sm: 160 } }}>
                              <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                {t('admin.memberRole')}
                              </MsqdxTypography>
                              <select
                                value={row.role}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditCompanyMemberships((prev) =>
                                    prev.map((m, i) => (i === idx ? { ...m, role: v } : m))
                                  );
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--msqdx-radius-sm)',
                                  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                  background: 'var(--color-card-bg)',
                                  color: 'var(--color-text-on-light)',
                                }}
                              >
                                <option value={COMPANY_USER_ROLE.OWNER}>{t('admin.roleOwner')}</option>
                                <option value={COMPANY_USER_ROLE.ADMIN}>{t('admin.roleCompanyAdmin')}</option>
                                <option value={COMPANY_USER_ROLE.MEMBER}>{t('admin.roleCompanyMember')}</option>
                              </select>
                            </Box>
                            <MsqdxButton
                              variant="text"
                              color="error"
                              size="small"
                              onClick={() =>
                                setEditCompanyMemberships((prev) => prev.filter((_, i) => i !== idx))
                              }
                              sx={{ flexShrink: 0 }}
                            >
                              {t('dashboard.delete')}
                            </MsqdxButton>
                          </Stack>
                        );
                      })}
                      <MsqdxButton
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setEditCompanyMemberships((prev) => [
                            ...prev,
                            { companyId: '', role: COMPANY_USER_ROLE.MEMBER },
                          ])
                        }
                      >
                        {t('dashboard.addOrganizationRow')}
                      </MsqdxButton>
                    </Stack>
                  )}
                </Box>
              )}
              <Box>
                <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>{t('dashboard.locale')}</MsqdxTypography>
                <select
                  value={editLocale}
                  onChange={(e) => setEditLocale(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--msqdx-radius-sm)',
                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    background: 'var(--color-card-bg)',
                    color: 'var(--color-text-on-light)',
                  }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </Box>
              {isAdmin && (
                <Box>
                  <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>{t('dashboard.role')}</MsqdxTypography>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--msqdx-radius-sm)',
                      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                      background: 'var(--color-card-bg)',
                      color: 'var(--color-text-on-light)',
                    }}
                  >
                    <option value="user">{t('dashboard.roleUser')}</option>
                    <option value="admin">{t('dashboard.roleAdmin')}</option>
                  </select>
                </Box>
              )}
              {isAdmin && (
                <Box sx={{ pt: 1 }}>
                  <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 0.5 }}>
                    {t('dashboard.entitlementsTitle')}
                  </MsqdxTypography>
                  <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
                    {t('dashboard.entitlementsSubtitle')}
                  </MsqdxTypography>
                  {editEntitlementsLoading ? (
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      {t('common.loading')}
                    </MsqdxTypography>
                  ) : (
                    <Stack spacing={1.5}>
                      {editEntitlements.map((entitlement) => (
                        <Box
                          key={entitlement.productId}
                          sx={{
                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            borderRadius: 'var(--msqdx-radius-md)',
                            p: 'var(--msqdx-spacing-md)',
                            bgcolor: 'var(--color-bg-subtle)',
                          }}
                        >
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={1}
                            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 1.5 }}
                          >
                            <Box>
                              <MsqdxTypography variant="subtitle2" weight="semibold">
                                {entitlement.name}
                              </MsqdxTypography>
                              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                                {entitlement.source === 'explicit'
                                  ? t('dashboard.entitlementExplicit')
                                  : entitlement.defaultAccess === 'granted'
                                    ? t('dashboard.entitlementDefaultGranted')
                                    : t('dashboard.entitlementDefaultHidden')}
                              </MsqdxTypography>
                            </Box>
                            <Box
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: '999px',
                                bgcolor: 'var(--color-card-bg)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {entitlement.lifecycle}
                            </Box>
                          </Stack>

                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                  {t('dashboard.entitlementStatus')}
                                </MsqdxTypography>
                                <select
                                  value={entitlement.status}
                                  onChange={(e) =>
                                    updateEntitlement(entitlement.productId, (current) => ({
                                      ...current,
                                      status: e.target.value as PlatformEntitlementStatus,
                                    }))
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--msqdx-radius-sm)',
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    background: 'var(--color-card-bg)',
                                    color: 'var(--color-text-on-light)',
                                  }}
                                >
                                  <option value="active">{t('dashboard.entitlementActive')}</option>
                                  <option value="disabled">{t('dashboard.entitlementDisabled')}</option>
                                </select>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                  {t('dashboard.entitlementPlatformRole')}
                                </MsqdxTypography>
                                <select
                                  value={entitlement.platformRole}
                                  onChange={(e) =>
                                    updateEntitlement(entitlement.productId, (current) => ({
                                      ...current,
                                      platformRole: e.target.value as PlatformRole,
                                    }))
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--msqdx-radius-sm)',
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    background: 'var(--color-card-bg)',
                                    color: 'var(--color-text-on-light)',
                                  }}
                                >
                                  <option value="member">{t('dashboard.platformRoleMember')}</option>
                                  <option value="manager">{t('dashboard.platformRoleManager')}</option>
                                  <option value="admin">{t('dashboard.platformRoleAdmin')}</option>
                                </select>
                              </Box>
                            </Stack>

                            <Box>
                              <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                {t('dashboard.entitlementEntryPoint')}
                              </MsqdxTypography>
                              <select
                                value={entitlement.defaultContext?.entryPointId ?? ''}
                                onChange={(e) =>
                                  updateEntitlement(entitlement.productId, (current) => ({
                                    ...current,
                                    defaultContext: {
                                      ...(current.defaultContext ?? {}),
                                      entryPointId: e.target.value || null,
                                    },
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--msqdx-radius-sm)',
                                  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                  background: 'var(--color-card-bg)',
                                  color: 'var(--color-text-on-light)',
                                }}
                              >
                                <option value="">{t('dashboard.entitlementEntryPointDefault')}</option>
                                {entitlement.entryPoints.map((entryPoint) => (
                                  <option key={entryPoint.id} value={entryPoint.id}>
                                    {t(entryPoint.labelKey)}
                                  </option>
                                ))}
                              </select>
                            </Box>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              {entitlement.productId === 'checkion' || entitlement.productId === 'audion' ? (
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                    {t('dashboard.entitlementProjectId')}
                                  </MsqdxTypography>
                                  <select
                                    value={entitlement.defaultContext?.projectId ?? ''}
                                    onChange={(e) =>
                                      updateEntitlement(entitlement.productId, (current) => ({
                                        ...current,
                                        defaultContext: {
                                          ...(current.defaultContext ?? {}),
                                          projectId: e.target.value || null,
                                        },
                                      }))
                                    }
                                    disabled={productProjectOptionsLoading}
                                    style={{ ...ENTITLEMENT_PROJECT_SELECT_STYLE }}
                                  >
                                    <option value="">{t('dashboard.productProjectPickerPlaceholder')}</option>
                                    {projectPickerRowsFor(
                                      entitlement.productId,
                                      entitlement.defaultContext?.projectId ?? ''
                                    ).map((opt) => (
                                      <option key={opt.projectId} value={opt.projectId}>
                                        {formatProductProjectLabel(opt)}
                                      </option>
                                    ))}
                                  </select>
                                  {!productProjectOptionsLoading &&
                                    (productProjectOptions[entitlement.productId]?.length ?? 0) === 0 && (
                                      <MsqdxTypography
                                        variant="caption"
                                        sx={{ color: 'var(--color-text-secondary)', mt: 0.5, display: 'block' }}
                                      >
                                        {t('dashboard.productProjectPickerEmptyBound')}
                                      </MsqdxTypography>
                                    )}
                                  <MsqdxTypography
                                    variant="caption"
                                    sx={{ color: 'var(--color-text-secondary)', mt: 0.75, display: 'block' }}
                                  >
                                    {t('dashboard.productProjectPickerConcept')}
                                  </MsqdxTypography>
                                </Box>
                              ) : (
                                <MsqdxFormField
                                  label={t('dashboard.entitlementProjectId')}
                                  value={entitlement.defaultContext?.projectId ?? ''}
                                  onChange={(e) =>
                                    updateEntitlement(entitlement.productId, (current) => ({
                                      ...current,
                                      defaultContext: {
                                        ...(current.defaultContext ?? {}),
                                        projectId: (e.target as HTMLInputElement).value || null,
                                      },
                                    }))
                                  }
                                  fullWidth
                                  sx={FORM_FIELD_ACCENT_SX}
                                />
                              )}
                              <MsqdxFormField
                                label={t('dashboard.entitlementDeepLink')}
                                value={entitlement.defaultContext?.deepLink ?? ''}
                                onChange={(e) =>
                                  updateEntitlement(entitlement.productId, (current) => ({
                                    ...current,
                                    defaultContext: {
                                      ...(current.defaultContext ?? {}),
                                      deepLink: (e.target as HTMLInputElement).value || null,
                                    },
                                  }))
                                }
                                fullWidth
                                sx={FORM_FIELD_ACCENT_SX}
                              />
                            </Stack>
                            {['audion', 'checkion'].includes(entitlement.productId) ? (
                              <Box
                                sx={{
                                  borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                  pt: 1.5,
                                }}
                              >
                                <Stack
                                  direction={{ xs: 'column', md: 'row' }}
                                  spacing={1}
                                  sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 1 }}
                                >
                                  <Box>
                                    <MsqdxTypography variant="body2" weight="semibold">
                                      {t('dashboard.projectAssignmentsTitle')}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                      {t('dashboard.projectAssignmentsSubtitle', { product: entitlement.name })}
                                    </MsqdxTypography>
                                    <MsqdxTypography
                                      variant="caption"
                                      sx={{ color: 'var(--color-text-secondary)', display: 'block', mt: 0.5 }}
                                    >
                                      {t('dashboard.productProjectPickerConcept')}
                                    </MsqdxTypography>
                                  </Box>
                                  <MsqdxButton
                                    variant="outlined"
                                    onClick={() => addProjectAssignment(entitlement.productId)}
                                    disabled={saving || Boolean(provisioningAction)}
                                  >
                                    {t('dashboard.projectAssignmentsAdd')}
                                  </MsqdxButton>
                                </Stack>
                                {!productProjectOptionsLoading &&
                                  (productProjectOptions[entitlement.productId as 'checkion' | 'audion']?.length ??
                                    0) === 0 && (
                                    <MsqdxTypography
                                      variant="caption"
                                      sx={{ color: 'var(--color-text-secondary)', display: 'block', mb: 1 }}
                                    >
                                      {t('dashboard.productProjectPickerEmptyBound')}
                                    </MsqdxTypography>
                                  )}
                                <Stack spacing={1}>
                                  {(entitlement.projectAssignments ?? []).map((assignment, assignmentIndex) => (
                                    <Stack
                                      key={`${entitlement.productId}-assignment-${assignmentIndex}`}
                                      direction={{ xs: 'column', md: 'row' }}
                                      spacing={1}
                                      sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                          {t('dashboard.projectAssignmentsProjectId')}
                                        </MsqdxTypography>
                                        <select
                                          value={assignment.projectId}
                                          onChange={(e) =>
                                            updateProjectAssignment(
                                              entitlement.productId,
                                              assignmentIndex,
                                              (current) => ({
                                                ...current,
                                                projectId: e.target.value,
                                              })
                                            )
                                          }
                                          disabled={productProjectOptionsLoading}
                                          style={{ ...ENTITLEMENT_PROJECT_SELECT_STYLE }}
                                        >
                                          <option value="">{t('dashboard.productProjectPickerPlaceholder')}</option>
                                          {projectPickerRowsFor(
                                            entitlement.productId as 'checkion' | 'audion',
                                            assignment.projectId
                                          ).map((opt) => (
                                            <option key={opt.projectId} value={opt.projectId}>
                                              {formatProductProjectLabel(opt)}
                                            </option>
                                          ))}
                                        </select>
                                      </Box>
                                      <Box sx={{ minWidth: { md: 180 } }}>
                                        <MsqdxTypography variant="body2" sx={{ mb: 0.5 }}>
                                          {t('dashboard.projectAssignmentsRole')}
                                        </MsqdxTypography>
                                        <select
                                          value={assignment.role}
                                          onChange={(e) =>
                                            updateProjectAssignment(
                                              entitlement.productId,
                                              assignmentIndex,
                                              (current) => ({
                                                ...current,
                                                role: e.target.value as 'admin' | 'member',
                                              })
                                            )
                                          }
                                          style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: 'var(--msqdx-radius-sm)',
                                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                            background: 'var(--color-card-bg)',
                                            color: 'var(--color-text-on-light)',
                                          }}
                                        >
                                          <option value="member">{t('dashboard.projectAssignmentRoleMember')}</option>
                                          <option value="admin">{t('dashboard.projectAssignmentRoleAdmin')}</option>
                                        </select>
                                      </Box>
                                      <MsqdxButton
                                        variant="outlined"
                                        onClick={() => removeProjectAssignment(entitlement.productId, assignmentIndex)}
                                        disabled={saving || Boolean(provisioningAction)}
                                      >
                                        {t('dashboard.projectAssignmentsRemove')}
                                      </MsqdxButton>
                                    </Stack>
                                  ))}
                                  {(entitlement.projectAssignments ?? []).length === 0 ? (
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                      {t('dashboard.projectAssignmentsEmpty')}
                                    </MsqdxTypography>
                                  ) : null}
                                </Stack>
                              </Box>
                            ) : null}
                            <Box
                              sx={{
                                borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                pt: 1.5,
                              }}
                            >
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1}
                                sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
                              >
                                <MsqdxTypography variant="body2" weight="semibold">
                                  {t('dashboard.provisioningTitle')}
                                </MsqdxTypography>
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: '999px',
                                    bgcolor: 'var(--color-card-bg)',
                                    fontSize: '0.75rem',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {t(`dashboard.provisioningStatus.${entitlement.provisioning?.syncStatus ?? 'pending'}`)}
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <MsqdxButton
                                  variant="outlined"
                                  onClick={() => void runProvisioningAction(entitlement.productId, 'retry')}
                                  disabled={Boolean(provisioningAction) || saving || editEntitlementsLoading}
                                >
                                  {provisioningAction?.productId === entitlement.productId &&
                                  provisioningAction.mode === 'retry'
                                    ? t('dashboard.provisioningRetrying')
                                    : t('dashboard.provisioningRetry')}
                                </MsqdxButton>
                                <MsqdxButton
                                  variant="outlined"
                                  onClick={() => void runProvisioningAction(entitlement.productId, 'resync')}
                                  disabled={Boolean(provisioningAction) || saving || editEntitlementsLoading}
                                >
                                  {provisioningAction?.productId === entitlement.productId &&
                                  provisioningAction.mode === 'resync'
                                    ? t('dashboard.provisioningResyncing')
                                    : t('dashboard.provisioningResync')}
                                </MsqdxButton>
                              </Stack>
                              {entitlement.provisioning?.syncMessage ? (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 0.75 }}>
                                  {entitlement.provisioning.syncMessage}
                                </MsqdxTypography>
                              ) : null}
                              <Stack spacing={0.5} sx={{ mt: 1 }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                  {t('dashboard.provisioningDesiredState')}: {t(`dashboard.provisioningDesired.${entitlement.provisioning?.desiredState ?? 'granted'}`)}
                                </MsqdxTypography>
                                {entitlement.provisioning?.externalUserRef ? (
                                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                    {t('dashboard.provisioningExternalUserRef')}: {entitlement.provisioning.externalUserRef}
                                  </MsqdxTypography>
                                ) : null}
                                {formatProvisioningTimestamp(entitlement.provisioning?.lastAttemptAt) ? (
                                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                    {t('dashboard.provisioningLastAttempt')}: {formatProvisioningTimestamp(entitlement.provisioning?.lastAttemptAt)}
                                  </MsqdxTypography>
                                ) : null}
                                {formatProvisioningTimestamp(entitlement.provisioning?.lastSucceededAt) ? (
                                  <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
                                    {t('dashboard.provisioningLastSuccess')}: {formatProvisioningTimestamp(entitlement.provisioning?.lastSucceededAt)}
                                  </MsqdxTypography>
                                ) : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                {isAdmin ? (
                  <MsqdxButton
                    variant="text"
                    color="error"
                    onClick={() => editId && void handleDelete(editId)}
                    disabled={saving || !editId || Boolean(provisioningAction)}
                  >
                    {t('dashboard.delete')}
                  </MsqdxButton>
                ) : (
                  <span />
                )}
                <Stack direction="row" spacing={1}>
                  <MsqdxButton
                    variant="outlined"
                    onClick={() => {
                      setEditId(null);
                      setEditEntitlements([]);
                      setEditCompanyMemberships([]);
                    }}
                    disabled={saving || Boolean(provisioningAction)}
                  >
                    {t('common.cancel')}
                  </MsqdxButton>
                  <MsqdxButton
                    variant="contained"
                    onClick={handleSaveEdit}
                    disabled={saving || editEntitlementsLoading || editCompanyMembershipsLoading || Boolean(provisioningAction)}
                  >
                    {saving ? t('dashboard.saving') : t('common.save')}
                  </MsqdxButton>
                </Stack>
              </Stack>
            </Stack>
          </MsqdxCard>
        </Box>
      )}
    </Box>
  );
}
