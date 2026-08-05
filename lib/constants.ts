/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components — reference these constants.
 */

import { runtimeEnv } from '@/lib/runtime-env';
import {
  ASSISTANT_REPORT_PPTX_DEBUG_PARAM,
  ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN,
} from '@/lib/paths/assistant-report-export';

export const PATH_HOME = '/';
export const PATH_LOGIN = '/login';
export const PATH_REGISTER = '/register';
export const PATH_FORGOT_PASSWORD = '/forgot-password';
export const PATH_RESET_PASSWORD = '/reset-password';
export const PATH_PRODUCTS = '/products';
export const PATH_PROJECTS = '/projects';
export const PATH_SETTINGS = '/settings';
export const PATH_DESIGN_SYSTEM = '/design-system';
export const PATH_BOARD = '/board';
/** User-facing orchestrator chat (all authenticated users). */
export const PATH_ASSISTANT = '/assistant';
/** Standalone Quick Check — URL input + full dashboard report (no chat). */
export { PATH_EVENT_QUICK_CHECK } from '@/lib/paths/event-quick-check-page';
export {
  API_EVENT_QUICK_CHECK_RUNS,
  EVENT_QUICK_CHECK_RUN_QUERY_PARAM,
  apiEventQuickCheckRun,
  apiEventQuickCheckRunPdf,
  apiEventQuickCheckRunPptx,
  pathEventQuickCheckRun,
} from '@/lib/paths/event-quick-check-page';
/** Query param on `PATH_ASSISTANT` to restore a saved conversation. */
export const ASSISTANT_CONVERSATION_QUERY_PARAM = 'c';
/** Query param on `PATH_ASSISTANT` to pin Collection context (`platform_projects.id`). */
export const ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM = 'project';
export const pathAssistantChat = (conversationId?: string | null): string => {
  if (!conversationId) return PATH_ASSISTANT;
  return `${PATH_ASSISTANT}?${ASSISTANT_CONVERSATION_QUERY_PARAM}=${encodeURIComponent(conversationId)}`;
};
/** Open assistant with a Collection project already selected. */
export const pathAssistantWithProject = (platformProjectId: string): string => {
  const id = platformProjectId.trim();
  if (!id) return PATH_ASSISTANT;
  return `${PATH_ASSISTANT}?${ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM}=${encodeURIComponent(id)}`;
};
/** Public shared assistant report (no login required). */
export const PATH_SHARE_REPORTS = '/share/reports';
export const pathShareReport = (token: string) =>
  `${PATH_SHARE_REPORTS}/${encodeURIComponent(token)}`;
/** Admin console (companies, platform projects, user directory). Requires admin role. */
export const PATH_ADMIN = '/admin';
export const PATH_ADMIN_COMPANIES = `${PATH_ADMIN}/companies`;
export const PATH_ADMIN_USERS = `${PATH_ADMIN}/users`;
export const pathAdminCompany = (id: string) =>
  `${PATH_ADMIN_COMPANIES}/${encodeURIComponent(id)}`;
export const pathAdminUser = (id: string) =>
  `${PATH_ADMIN_USERS}/${encodeURIComponent(id)}`;
/** @deprecated Prefer pathAdminUser — edit lives at /admin/users/[id]. */
export const pathAdminUserEditOnDashboard = (userId: string) => pathAdminUser(userId);
export const pathPlatformProjectDashboard = (platformProjectId: string) =>
  `/projects/${encodeURIComponent(platformProjectId)}`;

/** Collection Test Flow gallery + board (Wave 1). Spec: collection-test-flow.md */
export const pathPlatformProjectFlows = (platformProjectId: string) =>
  `${pathPlatformProjectDashboard(platformProjectId)}/flows`;
export const pathPlatformProjectFlow = (platformProjectId: string, flowId: string) =>
  `${pathPlatformProjectFlows(platformProjectId)}/${encodeURIComponent(flowId)}`;

/** Google Fonts for assistant generative UI (Noto Sans + IBM Plex Mono). */
export const FONT_URL_ASSISTANT_UI =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap';

export const API_AUTH_REGISTER = '/api/auth/register';
export const API_AUTH_REQUEST_PASSWORD_RESET = '/api/auth/request-password-reset';
export const API_AUTH_RESET_PASSWORD = '/api/auth/reset-password';
export const API_AUTH_PROFILE = '/api/auth/profile';
export const API_AUTH_CHANGE_PASSWORD = '/api/auth/change-password';
export const API_AUTH_TOKENS = '/api/auth/tokens';
export const apiAuthTokenRevoke = (id: string) => `${API_AUTH_TOKENS}/${encodeURIComponent(id)}`;

/** Mailgun REST API bases (sending domain must be verified in Mailgun). */
export const MAILGUN_API_BASE_US = 'https://api.mailgun.net';
export const MAILGUN_API_BASE_EU = 'https://api.eu.mailgun.net';

/** Mailgun: sending messages (POST body is form-urlencoded). */
export const mailgunMessagesPath = (mailgunDomain: string): string =>
  `/v3/${encodeURIComponent(mailgunDomain)}/messages`;

/** Mailgun control panel (activation, domains, API keys). */
export const URL_MAILGUN_APP = 'https://app.mailgun.com/';

/** Mailgun API authentication (Basic: user `api`, password = private API key). */
export const URL_MAILGUN_API_AUTH = 'https://documentation.mailgun.com/docs/mailgun/api-reference/mg-auth';

/** Mailgun: sending messages overview. */
export const URL_MAILGUN_DOCS_SENDING = 'https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages';

export function getMailgunApiBaseUrl(): string {
  if (typeof process === 'undefined') return MAILGUN_API_BASE_US;
  const override = runtimeEnv('MAILGUN_API_BASE_URL');
  if (override) {
    return override.replace(/\/+$/, '');
  }
  const r = runtimeEnv('MAILGUN_REGION').toLowerCase();
  const euFlag = runtimeEnv('MAILGUN_EU');
  const eu =
    r === 'eu' ||
    euFlag === '1' ||
    euFlag.toLowerCase() === 'true';
  return eu ? MAILGUN_API_BASE_EU : MAILGUN_API_BASE_US;
}

export function getMailgunMessagesUrl(mailgunDomain: string): string {
  const d = (mailgunDomain ?? '').trim();
  return `${getMailgunApiBaseUrl()}${mailgunMessagesPath(d)}`;
}

export const API_PLATFORM_PRODUCTS = '/api/platform/products';
/** Aggregated CHECKION/AUDION summaries for all platform projects the user can access. */
export const API_PLATFORM_ME_PROJECT_INSIGHTS = '/api/platform/me/project-insights';
/** Companies the session user can create Collections under. */
export const API_PLATFORM_ME_COMPANIES = '/api/platform/me/companies';

/**
 * External product entry points.
 * Keep these URLs centralized; do not hardcode them in components.
 */
export const getAudionAdminUrl = (): string => {
  if (typeof process === 'undefined') return 'https://audion.projects-a.plygrnd.tech/admin/';
  return (process.env.NEXT_PUBLIC_AUDION_ADMIN_URL?.trim() || 'https://audion.projects-a.plygrnd.tech/admin/');
};

/** AUDION Next.js origin (strips trailing `/admin`). Used for federation routes. */
export const getAudionWebOrigin = (): string => {
  const trimmed = getAudionAdminUrl().replace(/\/+$/, '');
  return trimmed.endsWith('/admin')
    ? trimmed.slice(0, -'/admin'.length) || trimmed
    : trimmed;
};

/**
 * Base for AUDION Next.js `/api/platform/...` federation (not FastAPI).
 * Prefer `AUDION_PLATFORM_API_URL`, else `{NEXT_PUBLIC_AUDION_ADMIN_URL origin}/api`.
 * Do not use `AUDION_API_URL` here — that is often `http://audion-api:8000` (FastAPI).
 */
export const getAudionPlatformApiBase = (): string => {
  const explicit =
    typeof process !== 'undefined' ? process.env.AUDION_PLATFORM_API_URL?.trim() : '';
  if (explicit) {
    const t = explicit.replace(/\/+$/, '');
    return t.endsWith('/api') ? t : `${t}/api`;
  }
  return `${getAudionWebOrigin().replace(/\/+$/, '')}/api`;
};

export const getCheckionUrl = (): string => {
  if (typeof process === 'undefined') return 'https://checkion.projects-a.plygrnd.tech/';
  return (process.env.NEXT_PUBLIC_CHECKION_URL?.trim() || 'https://checkion.projects-a.plygrnd.tech/');
};

export const getCheckionServiceApiUrl = (): string => {
  if (typeof process === 'undefined') return getCheckionUrl();
  return process.env.CHECKION_API_URL?.trim() || getCheckionUrl();
};

export const getVideonUrl = (): string | null => {
  if (typeof process === 'undefined') return null;
  return process.env.NEXT_PUBLIC_VIDEON_URL?.trim() || null;
};

export const getBrandionUrl = (): string | null => {
  if (typeof process === 'undefined') return null;
  return process.env.NEXT_PUBLIC_BRANDION_URL?.trim() || null;
};

export const getAudionServiceApiUrl = (): string => {
  const explicit =
    typeof process !== 'undefined' ? process.env.AUDION_API_URL?.trim() : '';
  if (explicit) return explicit;

  // Production: FastAPI is proxied under /api on the same host as the AUDION web app.
  return `${getAudionWebOrigin().replace(/\/+$/, '')}/api`;
};

/** sessionStorage: admin subnav “last visited” hint (`{ currentPath, currentAt }`). */
export const ADMIN_NAV_STORAGE_KEY = 'plexon_admin_nav_current';

/** Cookie and localStorage key for UI language (de/en). */
export const LOCALE_STORAGE_KEY = 'plexon_locale';

/** localStorage key for board page state (prismions, connections, results). */
export const BOARD_STORAGE_KEY = 'plexon_board_state';

/** Central user management (PLEXON DB – single source of truth for CHECKION, AUDION, etc.). */
export const API_ADMIN_USERS = '/api/admin/users';
export const apiAdminUser = (id: string) => `${API_ADMIN_USERS}/${encodeURIComponent(id)}`;
export const apiAdminUserEntitlements = (id: string) =>
  `${API_ADMIN_USERS}/${encodeURIComponent(id)}/entitlements`;
/** Admin: CHECKION/AUDION project ids for entitlement pickers (platform bindings + legacy assignments). */
export const apiAdminUserProductProjectOptions = (userId: string, productId: 'checkion' | 'audion') =>
  `${API_ADMIN_USERS}/${encodeURIComponent(userId)}/product-project-options?${new URLSearchParams({ productId })}`;
export const apiAdminUserCompanies = (id: string) =>
  `${API_ADMIN_USERS}/${encodeURIComponent(id)}/companies`;
export const apiAdminUserProvisioning = (id: string) =>
  `${API_ADMIN_USERS}/${encodeURIComponent(id)}/provisioning`;

/** Admin: companies and canonical platform projects. */
export const API_ADMIN_COMPANIES = '/api/admin/companies';
export const API_ADMIN_COMPANIES_BULK = `${API_ADMIN_COMPANIES}/bulk`;
export const apiAdminCompany = (id: string) =>
  `${API_ADMIN_COMPANIES}/${encodeURIComponent(id)}`;
export const apiAdminCompanyMembers = (id: string) => `${apiAdminCompany(id)}/members`;
export const apiAdminCompanyPlatformProjects = (id: string) =>
  `${apiAdminCompany(id)}/platform-projects`;
export const apiAdminPlatformProject = (id: string) =>
  `/api/admin/platform-projects/${encodeURIComponent(id)}`;
export const apiAdminPlatformProjectSync = (id: string) =>
  `${apiAdminPlatformProject(id)}/sync`;

/** Aggregated dashboard for one platform project (requires session). */
export const apiPlatformProjectDashboard = (platformProjectId: string) =>
  `/api/platform/projects/${encodeURIComponent(platformProjectId)}/dashboard`;

/** Collection Knowledge Pack (session or service secret). Spec: collection-knowledge-pack. */
export const apiPlatformProjectKnowledge = (platformProjectId: string) =>
  `/api/platform/projects/${encodeURIComponent(platformProjectId)}/knowledge`;
export const apiPlatformProjectKnowledgeFacet = (
  platformProjectId: string,
  facetId: string
) =>
  `${apiPlatformProjectKnowledge(platformProjectId)}/facets/${encodeURIComponent(facetId)}`;
export const apiPlatformProjectKnowledgeFacetPublish = (
  platformProjectId: string,
  facetId: string
) => `${apiPlatformProjectKnowledgeFacet(platformProjectId, facetId)}/publish`;
export const apiPlatformProjectKnowledgeSuggest = (platformProjectId: string) =>
  `${apiPlatformProjectKnowledge(platformProjectId)}/suggest`;

/** Collection Test Flow CRUD + run (session). Spec: collection-test-flow.md Wave 1 */
export const apiPlatformProjectFlows = (platformProjectId: string) =>
  `/api/platform/projects/${encodeURIComponent(platformProjectId)}/flows`;
export const apiPlatformProjectFlow = (platformProjectId: string, flowId: string) =>
  `${apiPlatformProjectFlows(platformProjectId)}/${encodeURIComponent(flowId)}`;
export const apiPlatformProjectFlowRun = (platformProjectId: string, flowId: string) =>
  `${apiPlatformProjectFlow(platformProjectId, flowId)}/run`;
/** Wave 6: start-only Audion journey segment (create study + wave + start, no poll). */
export const apiPlatformProjectFlowRunJourney = (platformProjectId: string, flowId: string) =>
  `${apiPlatformProjectFlow(platformProjectId, flowId)}/run/journey`;
/** Wave 6: poll a live journey job started via `apiPlatformProjectFlowRunJourney`. */
export const apiPlatformProjectFlowJourneyJob = (
  platformProjectId: string,
  flowId: string,
  jobId: string
) => `${apiPlatformProjectFlow(platformProjectId, flowId)}/journey-jobs/${encodeURIComponent(jobId)}`;
export const apiPlatformProjectFlowJourneyGateBranch = (
  platformProjectId: string,
  flowId: string,
  jobId: string
) => `${apiPlatformProjectFlowJourneyJob(platformProjectId, flowId, jobId)}/gate-branch`;
export const apiPlatformProjectFlowHybridSegment = (platformProjectId: string, flowId: string) =>
  `${apiPlatformProjectFlow(platformProjectId, flowId)}/hybrid-segment`;
export const apiPlatformProjectFlowWaveSummary = (platformProjectId: string, flowId: string) =>
  `${apiPlatformProjectFlow(platformProjectId, flowId)}/wave-summary`;

/** Service proxy: CHECKION (legacy/optional when not using central DB). */
export const API_SERVICES_CHECKION_USERS = '/api/services/checkion/users';
export const apiServicesCheckionUser = (id: string) => `${API_SERVICES_CHECKION_USERS}/${encodeURIComponent(id)}`;
export const API_SERVICES_AUDION_STATUS = '/api/services/audion/status';

/** Service-authenticated: AUDION created a project first; PLEXON registers platform row + CHECKION mirror. */
export const API_PLATFORM_PROVISIONING_AUDION_PROJECT_ORIGIN =
  '/api/platform/provisioning/audion-project-origin';

/** Service-authenticated: CHECKION created a project first; PLEXON registers platform row + AUDION mirror. */
export const API_PLATFORM_PROVISIONING_CHECKION_PROJECT_ORIGIN =
  '/api/platform/provisioning/checkion-project-origin';

/** Usage (tokens) for current user. */
export const API_USAGE = '/api/usage';

/** Usage for all users (admin only). */
export const API_ADMIN_USAGE = '/api/admin/usage';

/** Raw usage events across all users (admin only). Query: limit, offset, userId?, service?, eventType? */
export const API_ADMIN_USAGE_EVENTS = '/api/admin/usage/events';

/** Board: complete prompt with Claude. When MCP server URL is set, CHECKION MCP tools are available to the prompt card. */
export const API_BOARD_COMPLETE = '/api/board/complete';

/** Assistant orchestrator chat APIs. */
export const API_ASSISTANT_COMPLETE = '/api/assistant/complete';
export const API_ASSISTANT_COMPLETE_STREAM = '/api/assistant/complete/stream';
export const API_ASSISTANT_CONVERSATIONS = '/api/assistant/conversations';
export const apiAssistantConversation = (id: string) =>
  `${API_ASSISTANT_CONVERSATIONS}/${encodeURIComponent(id)}`;
export const apiAssistantConversationMessages = (id: string) =>
  `${apiAssistantConversation(id)}/messages`;
export const apiAssistantConversationReportPins = (id: string) =>
  `${apiAssistantConversation(id)}/report-pins`;
export const apiAssistantConversationReports = (id: string) =>
  `${apiAssistantConversation(id)}/reports`;
export const apiAssistantConversationReportGenerate = (id: string) =>
  `${apiAssistantConversationReports(id)}/generate`;
export const API_PUBLIC_REPORTS = '/api/public/reports';
export const apiPublicReport = (token: string) =>
  `${API_PUBLIC_REPORTS}/${encodeURIComponent(token)}`;
export const apiPublicReportPdf = (token: string) =>
  `${apiPublicReport(token)}/pdf`;

export const apiPublicReportPptx = (token: string, options?: { debugPlan?: boolean }) => {
  const base = `${apiPublicReport(token)}/pptx`;
  if (options?.debugPlan) {
    return `${base}?${ASSISTANT_REPORT_PPTX_DEBUG_PARAM}=${ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN}`;
  }
  return base;
};
export const API_ASSISTANT_WORKFLOWS = '/api/assistant/workflows';
export const apiAssistantWorkflowStream = (runId: string) =>
  `${API_ASSISTANT_WORKFLOWS}/${encodeURIComponent(runId)}/stream`;

/** User-facing platform project APIs (non-admin). */
export const apiPlatformCompanyPlatformProjects = (companyId: string) =>
  `/api/platform/companies/${encodeURIComponent(companyId)}/platform-projects`;
export const apiPlatformProjectSync = (platformProjectId: string) =>
  `/api/platform/projects/${encodeURIComponent(platformProjectId)}/sync`;

/** Claude model for board completion. Default Sonnet 4.6 (Sonnet 4 snapshot retired 2026-06-15). Override with ANTHROPIC_BOARD_MODEL. */
export const getBoardCompletionModel = (): string => {
  const env = typeof process !== 'undefined' ? process.env.ANTHROPIC_BOARD_MODEL?.trim() : '';
  if (env) return env;
  return 'claude-sonnet-4-6';
};

/** Claude model for assistant orchestrator chat. */
export const getAssistantCompletionModel = (): string => {
  const env =
    typeof process !== 'undefined'
      ? process.env.ANTHROPIC_ASSISTANT_MODEL?.trim() || process.env.ANTHROPIC_BOARD_MODEL?.trim()
      : '';
  if (env) return env;
  return 'claude-sonnet-4-6';
};

/** Assistant model when MCP tools are enabled. */
export const getAssistantCompletionModelWithMcp = (): string => {
  return getAssistantCompletionModel();
};

/** Fast model for assistant planner (tool routing). */
export const getAssistantPlannerModel = (): string => {
  const env =
    typeof process !== 'undefined' ? process.env.ANTHROPIC_PLANNER_MODEL?.trim() : '';
  if (env) return env;
  return 'claude-haiku-4-5';
};

/**
 * Extended-thinking token budget for assistant orchestrator (0 = disabled).
 * Override with ANTHROPIC_ASSISTANT_THINKING_BUDGET (set 0/off/false to disable).
 */
export const getAssistantThinkingBudgetTokens = (): number => {
  if (typeof process === 'undefined') return 4096;
  const raw = process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET?.trim().toLowerCase();
  if (raw === '0' || raw === 'off' || raw === 'false' || raw === 'disabled') return 0;
  const parsed = raw ? Number.parseInt(raw, 10) : 4096;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** CHECKION API token for service calls (research, etc.). */
export const getCheckionServiceToken = (): string | undefined => {
  if (typeof process === 'undefined') return undefined;
  return process.env.CHECKION_API_TOKEN?.trim() || process.env.CHECKION_SERVICE_TOKEN?.trim() || undefined;
};

/** AUDION API token for service calls (research, etc.). */
export const getAudionServiceToken = (): string | undefined => {
  if (typeof process === 'undefined') return undefined;
  return process.env.AUDION_API_TOKEN?.trim() || process.env.AUDION_SERVICE_TOKEN?.trim() || undefined;
};

/** Model used when CHECKION/AUDION MCP is enabled. */
export const getBoardCompletionModelWithMcp = (): string => {
  return getBoardCompletionModel();
};

/** Prismion id for the CHECKION MCP badge card shown when MCP is enabled. */
export const CHECKION_MCP_BADGE_ID = 'checkion-mcp-badge';

/** Prismion id for the AUDION MCP badge card shown when AUDION MCP is enabled. */
export const AUDION_MCP_BADGE_ID = 'audion-mcp-badge';

/** Prismion id for the ECHON MCP badge card shown when ECHON MCP is enabled. */
export const ECHON_MCP_BADGE_ID = 'echon-mcp-badge';

/** MCP server URL (Streamable HTTP) for board prompt card tools. Reads CHECKION_MCP_URL or MCP_SERVER_URL (e.g. https://checkion.projects-a.plygrnd.tech/mcp). When set, board prompt cards can use CHECKION tools. */
export const getCheckionMcpUrl = (): string | undefined => {
  if (typeof process === 'undefined') return undefined;
  const url = process.env.CHECKION_MCP_URL?.trim() || process.env.MCP_SERVER_URL?.trim();
  return url || undefined;
};

/** MCP server URL for AUDION board tools. Reads AUDION_MCP_URL (e.g. https://audion.example.com/mcp or http://audion-mcp:3100). When set, board prompt cards can use AUDION tools. */
export const getAudionMcpUrl = (): string | undefined => {
  if (typeof process === 'undefined') return undefined;
  const url = process.env.AUDION_MCP_URL?.trim();
  return url || undefined;
};

/** MCP server URL for ECHON market intelligence tools. Reads ECHON_MCP_URL (e.g. http://echon-mcp:3101). */
export const getEchonMcpUrl = (): string | undefined => {
  if (typeof process === 'undefined') return undefined;
  const url = process.env.ECHON_MCP_URL?.trim();
  return url || undefined;
};
