'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Text } from '@msqdx/ui';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ADMIN_USERS,
  API_ADMIN_USAGE,
  API_ADMIN_USAGE_EVENTS,
  API_USAGE,
  API_PLATFORM_ME_PROJECT_INSIGHTS,
  PATH_PROJECTS,
  apiAdminUser,
  pathAdminUser,
} from '@/lib/constants';
import type { CollectionProjectInsight } from '@/lib/collection-project-insight';
import { CollectionProjectsList } from '@/components/projects/CollectionProjectsList';
import { ProductCatalog } from '@/components/products/ProductCatalog';
import { formatUsageEventDetail } from '@/lib/usage-event-detail';
import { UsageTokenChart } from '@/components/dashboard/UsageTokenChart';

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

type UsageByDayItem = {
  date: string;
  tokens: number;
};

type ProjectInsightEntry = CollectionProjectInsight;

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [users, setUsers] = useState<CentralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    const param = searchParams.get('editUser');
    if (!param) return;
    router.replace(pathAdminUser(param));
  }, [searchParams, router]);

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
      await fetchUsers();
    } catch {
      setError(t('dashboard.loadError'));
    } finally {
      setSaving(false);
    }
  };

  const notConfigured = error && (error.includes('not configured') || error.includes('nicht konfiguriert') || error.includes('Database not configured'));

  return (
    <div className="plexon-magazine" style={{ maxWidth: 1400, marginInline: 'auto' }}>
      {sessionStatus === 'authenticated' && (
        <div data-section="product-teasers">
          <Text role="title" as="h2" className="plexon-dash-band-title">
            {t('dashboard.productsTitle')}
          </Text>
          <ProductCatalog variant="dashboard" dataSection="product-teasers-grid" />
        </div>
      )}

      {sessionStatus === 'authenticated' && (
        <div data-section="platform-project-insights">
          <Text role="title" as="h2" className="plexon-dash-band-title">
            {t('dashboard.platformInsightsTitle')}
          </Text>
          <Text role="meta" as="p" className="plexon-dash-band-deck" style={{ marginBottom: '0.85rem' }}>
            {t('dashboard.platformInsightsSubtitle')}
          </Text>
          <div className="plexon-collection-hub-preview-actions">
            <Link href={PATH_PROJECTS} style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                {t('dashboard.platformInsightsViewAll')}
              </Button>
            </Link>
            <Link href={PATH_PROJECTS} style={{ textDecoration: 'none' }}>
              <Button variant="subtle" size="sm">
                {t('dashboard.platformInsightsCreateCta')}
              </Button>
            </Link>
          </div>
          <CollectionProjectsList
            projects={projectInsights}
            loading={projectInsightsLoading}
            error={projectInsightsError}
            meta={
              projectInsightsMeta?.truncated
                ? {
                    truncated: true,
                    shown: projectInsightsMeta.shown,
                    totalAccessible: projectInsightsMeta.totalAccessible,
                  }
                : null
            }
            limit={6}
          />
        </div>
      )}

      {/* Zentrale Nutzer – nur für Admins sichtbar */}
      {isAdmin && (
      <section className="plexon-dash-band" data-section="checkion-users">
        <header className="plexon-dash-band-head">
          <Text role="title" as="h2" className="plexon-dash-band-title">
            {t('dashboard.centralUsers') ?? 'Zentrale Nutzer'}
          </Text>
          <Text role="meta" as="p" className="plexon-dash-band-deck">
            {t('dashboard.centralUsersSubtitle') ??
              'Ein Konto für alle Dienste (CHECKION, AUDION, VIDEON). Registrierung nur hier; Anmeldung dort mit denselben Zugangsdaten.'}
          </Text>
        </header>

        {notConfigured && (
          <Text role="meta" as="p" className="plexon-dash-band-status">
            {error?.includes('Database not configured') ? t('dashboard.centralNotConfigured') : error}
          </Text>
        )}

        {!notConfigured && error && (
          <Text role="meta" as="p" className="plexon-dash-band-status is-error">
            {error}
          </Text>
        )}

        {!notConfigured && loading && (
          <Text role="meta" as="p" className="plexon-dash-band-status">
            {t('common.loading')}
          </Text>
        )}

        {!notConfigured && !loading && users.length === 0 && !error && (
          <Text role="meta" as="p" className="plexon-dash-band-status">
            {t('dashboard.noUsers')}
          </Text>
        )}

        {!notConfigured && !loading && users.length > 0 && (
          <div className="plexon-dash-table-wrap">
            <table className="plexon-dash-table">
              <thead>
                <tr>
                  <th scope="col">{t('dashboard.email')}</th>
                  <th scope="col">{t('dashboard.name')}</th>
                  <th scope="col">{t('dashboard.company')}</th>
                  <th scope="col">{t('dashboard.locale')}</th>
                  <th scope="col">{t('dashboard.role')}</th>
                  <th scope="col">{t('dashboard.createdAt')}</th>
                  <th scope="col" className="plexon-dash-table-actions">
                    {t('dashboard.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email ?? '—'}</td>
                    <td>{u.name ?? '—'}</td>
                    <td>{u.company ?? '—'}</td>
                    <td>{u.locale ?? '—'}</td>
                    <td>{u.role ?? 'user'}</td>
                    <td className="plexon-dash-table-num">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="plexon-dash-table-actions">
                      <div className="plexon-dash-row-actions">
                        <Link href={pathAdminUser(u.id)}>
                          <Button variant="ghost" size="md">
                            {t('dashboard.edit')}
                          </Button>
                        </Link>
                        <Button variant="danger" size="md" onClick={() => handleDelete(u.id)}>
                          {t('dashboard.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Nutzung (Tokens pro Dienst/Periode) — magazine band, no Panel wash */}
      {!notConfigured && (
        <section className="plexon-dash-band" data-section="usage">
          <header className="plexon-dash-band-head">
            <Text role="title" as="h2" className="plexon-dash-band-title">
              {t('dashboard.usage') ?? 'Nutzung'}
            </Text>
            <Text role="meta" as="p" className="plexon-dash-band-deck">
              {isAdmin
                ? (t('dashboard.usageSubtitleAdmin') ?? 'Token-Verbrauch aller Nutzer pro Dienst und Monat.')
                : (t('dashboard.usageSubtitle') ?? 'Dein Token-Verbrauch pro Dienst und Monat.')}
            </Text>
          </header>

          {usageLoading && (
            <Text role="meta" as="p" className="plexon-dash-band-status">
              {t('common.loading')}
            </Text>
          )}
          {!usageLoading && usageSummary.length === 0 && (
            <Text role="meta" as="p" className="plexon-dash-band-status">
              {t('dashboard.usageNoData')}
            </Text>
          )}
          {!usageLoading && usageSummary.length > 0 && (
            <div className="plexon-dash-table-wrap">
              <table className="plexon-dash-table is-compact">
                <thead>
                  <tr>
                    {isAdmin && <th scope="col">{t('dashboard.usageUser')}</th>}
                    <th scope="col">{t('dashboard.usageService')}</th>
                    <th scope="col">{t('dashboard.usagePeriod')}</th>
                    <th scope="col" className="plexon-dash-table-num is-end">
                      {t('dashboard.usageTokens')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageSummary.map((row, i) => (
                    <tr key={`${row.userId ?? ''}-${row.service}-${row.period}-${i}`}>
                      {isAdmin && (
                        <td>
                          {row.userId ? (users.find((u) => u.id === row.userId)?.email ?? row.userId) : '—'}
                        </td>
                      )}
                      <td>{row.service}</td>
                      <td>{row.period}</td>
                      <td className="plexon-dash-table-num is-end">{row.tokensTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(isAdmin || usageRecentEvents.length > 0) && !usageLoading ? (
            <div className="plexon-dash-pair">
              {isAdmin ? (
                <div className="plexon-dash-subband" data-section="usage-admin-events">
                  <Text role="title" as="h3" className="plexon-dash-subband-title">
                    {t('dashboard.usageAdminEventsTitle')}
                  </Text>
                  <Text role="meta" as="p" className="plexon-dash-subband-deck">
                    {t('dashboard.usageAdminEventsSubtitle')}
                  </Text>
                  {adminUsageEvents.length === 0 ? (
                    <Text role="meta" as="p" className="plexon-dash-band-status">
                      {t('dashboard.usageAdminEventsEmpty')}
                    </Text>
                  ) : (
                    <>
                      <div className="plexon-dash-table-wrap is-scroll">
                        <table className="plexon-dash-table">
                          <thead>
                            <tr>
                              <th scope="col">{t('dashboard.usageHistoryTime')}</th>
                              <th scope="col">{t('dashboard.usageUser')}</th>
                              <th scope="col">{t('dashboard.usageService')}</th>
                              <th scope="col">{t('dashboard.usageHistoryEvent')}</th>
                              <th scope="col">{t('dashboard.usageHistoryDetail')}</th>
                              <th scope="col" className="plexon-dash-table-num is-end">
                                {t('dashboard.usageTokens')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminUsageEvents.map((ev) => {
                              const detail = formatUsageEventDetail(ev.eventType, ev.rawUnits);
                              return (
                                <tr key={ev.id}>
                                  <td className="plexon-dash-table-num">
                                    {new Date(ev.createdAt).toLocaleString(undefined, {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                                  </td>
                                  <td style={{ maxWidth: 200, wordBreak: 'break-word' }}>
                                    {ev.userEmail || ev.userId}
                                  </td>
                                  <td>{ev.service}</td>
                                  <td>{ev.eventType}</td>
                                  <td className="plexon-dash-table-detail" title={detail || undefined}>
                                    {detail || '—'}
                                  </td>
                                  <td className="plexon-dash-table-num is-end">{ev.tokens.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {adminUsageEventsHasMore && (
                        <div>
                          <Button
                            variant="subtle"
                            size="md"
                            onClick={() => void loadMoreAdminUsageEvents()}
                            disabled={adminUsageEventsLoading}
                          >
                            {adminUsageEventsLoading ? t('common.loading') : t('dashboard.usageLoadMore')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}

              {usageRecentEvents.length > 0 ? (
                <div className="plexon-dash-subband" data-section="usage-history">
                  <Text role="title" as="h3" className="plexon-dash-subband-title">
                    {t('dashboard.usageHistory')}
                  </Text>
                  <div className="plexon-dash-table-wrap is-scroll">
                    <table className="plexon-dash-table">
                      <thead>
                        <tr>
                          <th scope="col">{t('dashboard.usageHistoryTime')}</th>
                          <th scope="col">{t('dashboard.usageService')}</th>
                          <th scope="col">{t('dashboard.usageHistoryEvent')}</th>
                          <th scope="col">{t('dashboard.usageHistoryDetail')}</th>
                          <th scope="col" className="plexon-dash-table-num is-end">
                            {t('dashboard.usageTokens')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageRecentEvents.map((ev) => {
                          const detail = formatUsageEventDetail(ev.eventType, ev.rawUnits);
                          return (
                            <tr key={ev.id}>
                              <td className="plexon-dash-table-num">
                                {new Date(ev.createdAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td>{ev.service}</td>
                              <td>{ev.eventType}</td>
                              <td className="plexon-dash-table-detail" title={detail || undefined}>
                                {detail || '—'}
                              </td>
                              <td className="plexon-dash-table-num is-end">{ev.tokens.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!usageLoading && (usageByDay.length > 0 || usageOwnSummary.length > 0) && (
            <UsageTokenChart
              range={usageChartRange}
              onRangeChange={setUsageChartRange}
              byDay={usageByDay}
              byMonth={usageByMonth}
              byYear={usageByYear}
            />
          )}
        </section>
      )}

    </div>
  );
}
