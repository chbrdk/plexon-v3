/* ------------------------------------------------------------------ */
/*  PLEXON – Database schema (Drizzle + PostgreSQL)                    */
/* ------------------------------------------------------------------ */

import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
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
