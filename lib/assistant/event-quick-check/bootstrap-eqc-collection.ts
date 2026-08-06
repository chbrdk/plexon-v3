/**
 * Wave 23 — Collection + product bindings before EQC Flow execute.
 * @see specs/domain/eqc-as-collection-flow.md
 */

import type { RequestUser } from '@/lib/auth-request-user';
import {
  createPlatformProjectWorkflow,
  getProjectBindingIds,
} from '@/lib/assistant/workflows/create-platform-project';
import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';
import { provisionAudionDirect } from '@/lib/assistant/workflows/provision-audion-direct';
import {
  COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
  createEqcQualityTemplate,
  documentHasEqcSpine,
  ensureFlowDocument,
} from '@/lib/collection-test-flow';
import {
  createCollectionTestFlow,
  listCollectionTestFlows,
  patchCollectionTestFlow,
} from '@/lib/db/collection-test-flows';
import { pathPlatformProjectDashboard } from '@/lib/constants';
import {
  EVENT_QUICK_CHECK_BINDING_SOURCE,
  resolveEventQuickCheckProfile,
  type EventQuickCheckDepth,
} from '@/lib/paths/assistant-workflows';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return undefined;
  }
}

export type BootstrapEqcCollectionResult = {
  ok: boolean;
  platformProjectId?: string;
  dashboardPath?: string;
  checkionProjectId?: string | null;
  audionProjectId?: string;
  audionSetupRequired?: boolean;
  flowId?: string;
  error?: string;
};

/**
 * Ensure Collection exists, AUDION/CHECKION bindings, and upsert `eqc-quality-v1` flow doc.
 */
export async function bootstrapEqcCollection(input: {
  user: RequestUser;
  projectName: string;
  url: string;
  platformProjectId?: string | null;
  depth?: EventQuickCheckDepth;
}): Promise<BootstrapEqcCollectionResult> {
  const url = normalizeUrl(input.url);
  const projectName = input.projectName.trim() || domainFromUrl(url) || 'Quick Check';
  const profile = resolveEventQuickCheckProfile(input.depth ?? 'quick');
  let platformProjectId = input.platformProjectId?.trim() || undefined;
  let dashboardPath: string | undefined;

  if (!platformProjectId) {
    const created = await createPlatformProjectWorkflow(
      input.user,
      { name: projectName, domain: domainFromUrl(url), syncProducts: true },
      {}
    );
    if (!created.result.ok || !created.result.platformProjectId) {
      return {
        ok: false,
        error: created.result.error ?? 'Collection konnte nicht angelegt werden',
      };
    }
    platformProjectId = created.result.platformProjectId;
    dashboardPath = created.result.dashboardPath;
  } else {
    dashboardPath = pathPlatformProjectDashboard(platformProjectId);
  }

  const ensured = await ensurePlatformProductBindings(platformProjectId, {
    source: EVENT_QUICK_CHECK_BINDING_SOURCE,
    domain: domainFromUrl(url),
    required: ['audion', 'checkion'],
  });

  let audionProjectId = ensured.audionProjectId ?? undefined;
  let audionSetupRequired = false;
  const checkionProjectId = ensured.checkionProjectId;

  if (!audionProjectId) {
    const direct = await provisionAudionDirect({
      projectName,
      platformProjectId,
      source: EVENT_QUICK_CHECK_BINDING_SOURCE,
    });
    if (direct.ok) {
      audionProjectId = direct.audionProjectId;
    } else {
      audionSetupRequired = true;
    }
  }

  const bindings = await getProjectBindingIds(platformProjectId);
  const flowId = await ensureEqcFlowDocument({
    platformProjectId,
    url,
    depth: profile.depth,
    ownerId: input.user.id,
  });

  return {
    ok: true,
    platformProjectId,
    dashboardPath,
    checkionProjectId: checkionProjectId ?? bindings.checkionProjectId ?? null,
    audionProjectId: audionProjectId ?? bindings.audionProjectId ?? undefined,
    audionSetupRequired,
    flowId,
  };
}

export async function ensureEqcFlowDocument(input: {
  platformProjectId: string;
  url: string;
  depth: EventQuickCheckDepth;
  ownerId?: string | null;
}): Promise<string> {
  const profile = resolveEventQuickCheckProfile(input.depth);
  const template = createEqcQualityTemplate(input.url, {
    maxPages: profile.scanMaxPages,
    includeCompetitors: profile.scanCompetitors,
  });

  const existing = await listCollectionTestFlows(input.platformProjectId);
  const eqcRow = existing.find((row) => {
    const doc = ensureFlowDocument(row.flow);
    return (
      row.templateId === COLLECTION_FLOW_TEMPLATE_EQC_QUALITY ||
      doc.templateId === COLLECTION_FLOW_TEMPLATE_EQC_QUALITY ||
      documentHasEqcSpine(doc)
    );
  });

  if (eqcRow) {
    const current = ensureFlowDocument(eqcRow.flow);
    // Keep operator edits when spine already present; refresh start URL + maxPages only when virgin.
    const next =
      current.lastRun || current.nodes.length !== template.nodes.length
        ? {
            ...current,
            templateId: COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
            nodes: current.nodes.map((n) =>
              n.kind === 'start' || n.kind === 'domain_scan' || n.kind === 'geo_job'
                ? {
                    ...n,
                    url: n.url?.trim() || input.url,
                    ...(n.kind === 'domain_scan' ? { maxPages: profile.scanMaxPages } : {}),
                  }
                : n
            ),
          }
        : template;
    await patchCollectionTestFlow({
      platformProjectId: input.platformProjectId,
      flowId: eqcRow.id,
      name: eqcRow.name || 'Event Quick Check',
      flow: next,
    });
    return eqcRow.id;
  }

  const created = await createCollectionTestFlow({
    platformProjectId: input.platformProjectId,
    name: 'Event Quick Check',
    flow: template,
    templateId: COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
    ownerId: input.ownerId ?? null,
  });
  return created.id;
}
