/* ------------------------------------------------------------------ */
/*  PLEXON – Database schema (Drizzle + PostgreSQL)                    */
/* ------------------------------------------------------------------ */

import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  PLATFORM_ENTITLEMENT_STATUS,
  PLATFORM_ROLE,
  type PlatformLaunchContext,
} from '../platform-entitlements'
import {
  COMPANY_USER_ROLE,
  PLATFORM_PROJECT_BINDING_SYNC_STATUS,
  PLATFORM_PROJECT_STATUS,
} from '../platform-companies'
import {
  PLATFORM_PROVISIONING_DESIRED_STATE,
  PLATFORM_PROJECT_ASSIGNMENT_ROLE,
  PLATFORM_PROVISIONING_SYNC_STATUS,
} from '../platform-provisioning';

/** Role: 'user' (default) or 'admin'. Admins can see all users' usage and manage roles. */
export const USER_ROLE = { USER: 'user', ADMIN: 'admin' } as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  company: text('company'),
  avatarUrl: text('avatar_url'),
  locale: text('locale'),
  /** light | dark | auto — UI appearance preference (cross-app SSOT). */
  themePreference: text('theme_preference'),
  /** purple|blue|pink|orange|green|yellow|grey|ink — UI accent (cross-app SSOT). */
  accentPreference: text('accent_preference'),
  role: text('role').notNull().default(USER_ROLE.USER), // 'user' | 'admin'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One-time tokens for password reset (hashed at rest). */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: index('password_reset_tokens_token_hash_idx').on(t.tokenHash),
    userIdx: index('password_reset_tokens_user_id_idx').on(t.userId),
  })
);

/** Tenant / organization (canonical parent for platform projects). */
export const companies = pgTable(
  'companies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex('companies_slug_unique').on(t.slug),
  })
);

/** PLEXON user membership in a company. */
export const companyUsers = pgTable(
  'company_users',
  {
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default(COMPANY_USER_ROLE.MEMBER),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.companyId, t.userId] }),
    userIdx: index('company_users_user_id_idx').on(t.userId),
  })
);

/** Canonical platform project (one logical project across CHECKION / AUDION). */
export const platformProjects = pgTable(
  'platform_projects',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    domain: text('domain'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    status: text('status').notNull().default(PLATFORM_PROJECT_STATUS.ACTIVE),
    createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index('platform_projects_company_id_idx').on(t.companyId),
  })
);

/**
 * Collection Knowledge Pack — shared cross-product brief (facets), one row per Collection.
 * Spec: specs/domain/collection-knowledge-pack.md — dedicated table (not platform_projects.metadata).
 */
export const collectionKnowledgePacks = pgTable(
  'collection_knowledge_packs',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull().default(1),
    schemaVersion: text('schema_version').notNull(),
    facets: jsonb('facets').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedByUserId: text('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    platformProjectUnique: uniqueIndex('collection_knowledge_packs_platform_project_id_uidx').on(
      t.platformProjectId
    ),
  })
);

/**
 * Collection Test Flow — quality / journey graph per Collection (many rows).
 * Spec: specs/domain/collection-test-flow.md — Wave 1 quality path; lastVerdict on flow jsonb.
 */
export const collectionTestFlows = pgTable(
  'collection_test_flows',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    flow: jsonb('flow').$type<Record<string, unknown>>().notNull(),
    ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
    templateId: text('template_id'),
    webhookEnabled: boolean('webhook_enabled').notNull().default(false),
    webhookSecretHash: text('webhook_secret_hash'),
    webhookSecretHint: text('webhook_secret_hint'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    platformProjectIdx: index('collection_test_flows_platform_project_id_idx').on(t.platformProjectId),
  })
);

/** Async Collection Test Flow runs (Wave 15 webhook / service triggers). */
export const collectionFlowRuns = pgTable(
  'collection_flow_runs',
  {
    id: text('id').primaryKey(),
    flowId: text('flow_id')
      .notNull()
      .references(() => collectionTestFlows.id, { onDelete: 'cascade' }),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('queued'),
    trigger: text('trigger').notNull(),
    request: jsonb('request').$type<Record<string, unknown>>(),
    verdict: jsonb('verdict').$type<Record<string, unknown>>(),
    lastRun: jsonb('last_run').$type<Record<string, unknown>>(),
    callbackUrl: text('callback_url'),
    callbackStatus: text('callback_status'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    flowCreatedIdx: index('collection_flow_runs_flow_id_created_at_idx').on(t.flowId, t.createdAt),
  })
);

/** Pinned flow node outputs for curated Share reports (Wave 26). */
export const collectionFlowReportPins = pgTable(
  'collection_flow_report_pins',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    flowId: text('flow_id')
      .notNull()
      .references(() => collectionTestFlows.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Empty string when no run scope — never NULL (unique index). */
    historyRunId: text('history_run_id').notNull().default(''),
    nodeId: text('node_id').notNull(),
    outputSnapshot: jsonb('output_snapshot').$type<Record<string, unknown>>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    flowUserIdx: index('collection_flow_report_pins_flow_user_idx').on(t.flowId, t.userId),
    uniquePin: uniqueIndex('collection_flow_report_pins_unique_uidx').on(
      t.flowId,
      t.userId,
      t.nodeId,
      t.historyRunId,
    ),
  }),
);

/** Local product project id per platform project (CHECKION / AUDION mirror). */
export const platformProjectProductBindings = pgTable(
  'platform_project_product_bindings',
  {
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    externalProjectId: text('external_project_id'),
    syncStatus: text('sync_status')
      .notNull()
      .default(PLATFORM_PROJECT_BINDING_SYNC_STATUS.PENDING),
    syncMessage: text('sync_message'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.platformProjectId, t.productId] }),
  })
);

/**
 * User access to a platform project (product-agnostic).
 * Expanded to per-product external ids via {@link platformProjectProductBindings} during provisioning.
 */
export const userPlatformProjectAssignments = pgTable(
  'user_platform_project_assignments',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default(PLATFORM_PROJECT_ASSIGNMENT_ROLE.MEMBER),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.platformProjectId] }),
    projectIdx: index('user_platform_project_assignments_project_idx').on(t.platformProjectId),
  })
);

/** API tokens for programmatic access (Bearer auth). */
export const apiTokens = pgTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Raw usage events (for detail/debug). */
export const usageEvents = pgTable('usage_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  service: text('service').notNull(),
  eventType: text('event_type').notNull(),
  rawUnits: jsonb('raw_units').$type<Record<string, unknown>>(),
  tokens: integer('tokens').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Aggregated usage per user, service, period (e.g. month). */
export const usageAggregated = pgTable(
  'usage_aggregated',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    service: text('service').notNull(),
    period: text('period').notNull(),
    tokensTotal: integer('tokens_total').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.service, t.period] })]
);

/** Central per-user product access and default launch context. */
export const userProductEntitlements = pgTable(
  'user_product_entitlements',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    status: text('status').notNull().default(PLATFORM_ENTITLEMENT_STATUS.ACTIVE),
    platformRole: text('platform_role').notNull().default(PLATFORM_ROLE.MEMBER),
    defaultContext: jsonb('default_context').$type<PlatformLaunchContext | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })]
);

/** Central sync telemetry for each product grant intent. */
export const userProductProvisioning = pgTable(
  'user_product_provisioning',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    desiredState: text('desired_state')
      .notNull()
      .default(PLATFORM_PROVISIONING_DESIRED_STATE.GRANTED),
    syncStatus: text('sync_status')
      .notNull()
      .default(PLATFORM_PROVISIONING_SYNC_STATUS.PENDING),
    syncMessage: text('sync_message'),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastSucceededAt: timestamp('last_succeeded_at', { withTimezone: true }),
    lastSourceHash: text('last_source_hash'),
    externalUserRef: text('external_user_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })]
);

/** Explicit product-local project memberships managed from the platform. */
export const userProductProjectAssignments = pgTable(
  'user_product_project_assignments',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    externalProjectId: text('external_project_id').notNull(),
    role: text('role').notNull().default(PLATFORM_PROJECT_ASSIGNMENT_ROLE.MEMBER),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId, t.externalProjectId] })]
);

/** Assistant orchestrator chat conversations. */
export const assistantConversations = pgTable(
  'assistant_conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    platformProjectId: text('platform_project_id').references(() => platformProjects.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('assistant_conversations_user_id_idx').on(t.userId),
  })
);

/** Messages within an assistant conversation. */
export const assistantMessages = pgTable(
  'assistant_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => assistantConversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('assistant_messages_conversation_id_idx').on(t.conversationId),
  })
);

/** Pinned UI blocks per conversation (report cart). */
export const assistantReportPins = pgTable(
  'assistant_report_pins',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => assistantConversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull(),
    blockId: text('block_id').notNull(),
    blockSnapshot: jsonb('block_snapshot').$type<Record<string, unknown>>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('assistant_report_pins_conversation_id_idx').on(t.conversationId),
    uniquePin: uniqueIndex('assistant_report_pins_conv_msg_block_uidx').on(
      t.conversationId,
      t.messageId,
      t.blockId
    ),
  })
);

/** Generated shareable reports from pinned blocks (public via token). */
export const assistantSharedReports = pgTable(
  'assistant_shared_reports',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => assistantConversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    uiLayout: jsonb('ui_layout').$type<Record<string, unknown>>().notNull(),
    narrative: jsonb('narrative').$type<Record<string, unknown>>().notNull(),
    shareTokenHash: text('share_token_hash').notNull(),
    isPublic: integer('is_public').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('assistant_shared_reports_conversation_id_idx').on(t.conversationId),
    tokenHashIdx: uniqueIndex('assistant_shared_reports_token_hash_uidx').on(t.shareTokenHash),
  })
);

/** Deterministic workflow runs (project create, sync, research). */
export const assistantWorkflowRuns = pgTable(
  'assistant_workflow_runs',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => assistantConversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    status: text('status').notNull().default('pending'),
    steps: jsonb('steps').$type<Record<string, unknown>[]>(),
    result: jsonb('result').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    conversationIdx: index('assistant_workflow_runs_conversation_id_idx').on(t.conversationId),
  })
);

/** Public read-only share links for Event Quick Check magazine reports. */
export const eventQuickCheckShares = pgTable(
  'event_quick_check_shares',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => assistantWorkflowRuns.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shareTokenHash: text('share_token_hash').notNull(),
    reportSnapshot: jsonb('report_snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index('event_quick_check_shares_run_id_idx').on(t.runId),
    tokenHashIdx: uniqueIndex('event_quick_check_shares_token_hash_uidx').on(t.shareTokenHash),
  })
);

/** Public read-only share links for METRON dashboard assistant snapshots. */
export const metronDashboardShares = pgTable(
  'metron_dashboard_shares',
  {
    id: text('id').primaryKey(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platformProjectId: text('platform_project_id'),
    dashboardId: text('dashboard_id').notNull(),
    shareTokenHash: text('share_token_hash').notNull(),
    reportSnapshot: jsonb('report_snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dashboardIdx: index('metron_dashboard_shares_dashboard_id_idx').on(t.dashboardId),
    tokenHashIdx: uniqueIndex('metron_dashboard_shares_token_hash_uidx').on(t.shareTokenHash),
  })
);

/**
 * Authenticated Collection invite links (Access Model B).
 * Spec: collection-invite-links.md — store token hash only.
 */
export const collectionInvites = pgTable(
  'collection_invites',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    role: text('role').notNull().default(PLATFORM_PROJECT_ASSIGNMENT_ROLE.MEMBER),
    sceneId: text('scene_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    maxUses: integer('max_uses'),
    useCount: integer('use_count').notNull().default(0),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('collection_invites_project_idx').on(t.platformProjectId),
    tokenHashIdx: uniqueIndex('collection_invites_token_hash_uidx').on(t.tokenHash),
  })
);

/**
 * Durable delivery outbox — Wave A data plane.
 * Spec: specs/domain/platform-outbox-delivery.md
 */
export const platformOutbox = pgTable(
  'platform_outbox',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(8),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusNextIdx: index('platform_outbox_status_next_attempt_idx').on(t.status, t.nextAttemptAt),
  })
);

/**
 * Append-only Knowledge Pack provenance events — Wave A.
 * Spec: specs/domain/platform-outbox-delivery.md · collection-knowledge-pack.md
 */
export const collectionKnowledgePackEvents = pgTable(
  'collection_knowledge_pack_events',
  {
    id: text('id').primaryKey(),
    packId: text('pack_id')
      .notNull()
      .references(() => collectionKnowledgePacks.id, { onDelete: 'cascade' }),
    facetId: text('facet_id').notNull(),
    revision: integer('revision').notNull(),
    actorType: text('actor_type').notNull(),
    actorUserId: text('actor_user_id'),
    productId: text('product_id'),
    runId: text('run_id'),
    sourceUri: text('source_uri'),
    patchSummary: text('patch_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    packIdx: index('collection_knowledge_pack_events_pack_id_idx').on(t.packId),
  })
);

/**
 * Rebuildable Collection read model — Wave B.
 * Spec: specs/domain/collection-read-model.md
 */
export const collectionProjections = pgTable('collection_projections', {
  platformProjectId: text('platform_project_id')
    .primaryKey()
    .references(() => platformProjects.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(1),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Per-Collection Client Page Share policy (CREATION).
 * Spec: creation-client-share.md
 */
export const collectionClientSharePolicies = pgTable('collection_client_share_policies', {
  platformProjectId: text('platform_project_id')
    .primaryKey()
    .references(() => platformProjects.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  allowPublicLink: boolean('allow_public_link').notNull().default(false),
  requirePassword: boolean('require_password').notNull().default(true),
  maxTtlDays: integer('max_ttl_days'),
  allowLiveHead: boolean('allow_live_head').notNull().default(true),
  allowEmailAllowlist: boolean('allow_email_allowlist').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: text('updated_by_user_id'),
});

/**
 * Company-level Client Page Share defaults (P6). Collection may only tighten.
 * Spec: creation-client-share.md
 */
export const companyClientSharePolicies = pgTable('company_client_share_policies', {
  companyId: text('company_id')
    .primaryKey()
    .references(() => companies.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  allowPublicLink: boolean('allow_public_link').notNull().default(false),
  requirePassword: boolean('require_password').notNull().default(true),
  maxTtlDays: integer('max_ttl_days'),
  allowLiveHead: boolean('allow_live_head').notNull().default(true),
  allowEmailAllowlist: boolean('allow_email_allowlist').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: text('updated_by_user_id'),
});

/**
 * Metadata-only projection of CREATION client shares (no tokens).
 * Spec: creation-client-share.md
 */
export const creationClientShareProjections = pgTable(
  'creation_client_share_projections',
  {
    shareId: text('share_id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').notNull(),
    pageIds: jsonb('page_ids').$type<string[]>().notNull().default([]),
    accessMode: text('access_mode').notNull(),
    contentMode: text('content_mode').notNull(),
    label: text('label'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('creation_client_share_projections_project_idx').on(t.platformProjectId),
  })
);

/**
 * Append-only Client Page Share audit events (P5). No tokens/passwords in meta.
 * Spec: creation-client-share.md
 */
export const creationClientShareEvents = pgTable(
  'creation_client_share_events',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    shareId: text('share_id').notNull(),
    eventType: text('event_type').notNull(),
    actorUserId: text('actor_user_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectCreatedIdx: index('creation_client_share_events_project_created_idx').on(
      t.platformProjectId,
      t.createdAt
    ),
    shareCreatedIdx: index('creation_client_share_events_share_created_idx').on(
      t.shareId,
      t.createdAt
    ),
  })
);

/**
 * Cross-product share-link registry (metadata only).
 * Spec: collection-share-links.md
 */
export const COLLECTION_SHARE_LINK_PRODUCT_IDS = [
  'creation',
  'plexon',
  'metron',
  'videon',
  'checkion',
  'brandion',
] as const;

export type CollectionShareLinkProductId = (typeof COLLECTION_SHARE_LINK_PRODUCT_IDS)[number];

export const COLLECTION_SHARE_LINK_KINDS = [
  'client_page',
  'quick_check',
  'dashboard',
  'cut',
  'scan_overview',
  'brand_findings',
] as const;

export type CollectionShareLinkKind = (typeof COLLECTION_SHARE_LINK_KINDS)[number];

export const collectionShareLinks = pgTable(
  'collection_share_links',
  {
    productId: text('product_id').notNull(),
    shareId: text('share_id').notNull(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    href: text('href'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.shareId] }),
    projectIdx: index('collection_share_links_project_idx').on(t.platformProjectId, t.createdAt),
  })
);

/**
 * Enterprise E2 — one public ClientRoom per Collection (approved slots only).
 * Spec: suite-enterprise-program.md § E2
 */
export const CLIENT_ROOM_SLOT_IDS = [
  'quick_check',
  'checkion_overview',
  'brand_findings',
  'creation_pages',
  'metron_dashboard',
  'videon_cut',
] as const;

export type ClientRoomSlotId = (typeof CLIENT_ROOM_SLOT_IDS)[number];

export type ClientRoomSlot = {
  productId: string;
  subjectRef: string;
  title: string;
  href?: string | null;
  approvedAt: string;
  approvedByUserId: string;
};

export type ClientRoomSlots = Partial<Record<ClientRoomSlotId, ClientRoomSlot>>;

export const collectionClientRooms = pgTable(
  'collection_client_rooms',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    passwordHash: text('password_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revision: integer('revision').notNull().default(1),
    slots: jsonb('slots').$type<ClientRoomSlots>().notNull().default({}),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('collection_client_rooms_project_idx').on(t.platformProjectId),
    tokenHashIdx: uniqueIndex('collection_client_rooms_token_hash_uidx').on(t.tokenHash),
  })
);

/**
 * Enterprise E4 — append-only suite audit.
 * Spec: suite-enterprise-program.md § E4
 */
export const SUITE_AUDIT_ACTIONS = [
  'run_started',
  'run_finished',
  'published',
  'approved',
  'revoked',
  'exported',
] as const;

export type SuiteAuditAction = (typeof SUITE_AUDIT_ACTIONS)[number];

export const suiteAuditEvents = pgTable(
  'suite_audit_events',
  {
    id: text('id').primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorUserId: text('actor_user_id').notNull(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    action: text('action').notNull(),
    subjectRef: text('subject_ref'),
    modelRef: text('model_ref'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => ({
    projectAtIdx: index('suite_audit_events_project_at_idx').on(t.platformProjectId, t.at),
    actorIdx: index('suite_audit_events_actor_idx').on(t.actorUserId, t.at),
  })
);

/**
 * Enterprise E1 — product activity distillates for Collection Lagebild.
 * Spec: suite-enterprise-program.md § E1
 */
export const collectionActivityItems = pgTable(
  'collection_activity_items',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    subjectRef: text('subject_ref').notNull(),
    title: text('title').notNull(),
    href: text('href'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorUserId: text('actor_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectAtIdx: index('collection_activity_items_project_at_idx').on(t.platformProjectId, t.at),
  })
);

/**
 * Enterprise E7 — CampaignBrief SSOT on the Collection.
 * Spec: suite-enterprise-program.md § E7
 */
export const CAMPAIGN_BRIEF_STATUSES = ['draft', 'active', 'closed'] as const;
export type CampaignBriefStatus = (typeof CAMPAIGN_BRIEF_STATUSES)[number];

export const collectionCampaignBriefs = pgTable(
  'collection_campaign_briefs',
  {
    id: text('id').primaryKey(),
    platformProjectId: text('platform_project_id')
      .notNull()
      .references(() => platformProjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'),
    marketRef: text('market_ref'),
    personaRefs: jsonb('persona_refs').$type<string[]>().notNull().default([]),
    guidelineId: text('guideline_id'),
    pageRefs: jsonb('page_refs').$type<string[]>().notNull().default([]),
    sceneId: text('scene_id'),
    mediaRefs: jsonb('media_refs').$type<string[]>().notNull().default([]),
    kpiRefs: jsonb('kpi_refs').$type<string[]>().notNull().default([]),
    spirionRefs: jsonb('spirion_refs').$type<string[]>().notNull().default([]),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index('collection_campaign_briefs_project_idx').on(t.platformProjectId),
  })
);

/**
 * Enterprise E9 — company directory stub (OIDC/SAML/SCIM config placeholder).
 * Spec: suite-enterprise-program.md § E9
 */
export const COMPANY_DIRECTORY_PROVIDERS = ['none', 'oidc', 'saml'] as const;
export type CompanyDirectoryProvider = (typeof COMPANY_DIRECTORY_PROVIDERS)[number];

export const companyDirectorySettings = pgTable(
  'company_directory_settings',
  {
    companyId: text('company_id')
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default('none'),
    passwordLoginDisabled: boolean('password_login_disabled').notNull().default(false),
    /** Opaque provider config — never returned to product apps. */
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    scimEnabled: boolean('scim_enabled').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
);
