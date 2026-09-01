/**
 * Upsert Vaillant Group MaFo demo flow for an existing Collection (no new Collection create).
 * @see knowledge/vaillant-group-mafo-demo.md
 */

import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  createVaillantBarrierResearchTemplate,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
  createVaillantInstallerDualPerspectiveTemplate,
  ensureFlowDocument,
} from '@/lib/collection-test-flow';
import {
  createCollectionTestFlow,
  listCollectionTestFlows,
  patchCollectionTestFlow,
} from '@/lib/db/collection-test-flows';
import {
  VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
  VAILLANT_GROUP_B2B_FACHPARTNER_URL,
  VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
  VAILLANT_GROUP_FLOW_DEFAULT_NAME,
  VAILLANT_GROUP_FLOW_UC2_DEFAULT_NAME,
  VAILLANT_GROUP_FLOW_TEMPLATE_ID,
  VAILLANT_GROUP_FLOW_UC2_TEMPLATE_ID,
  isVaillantGroupCollection,
} from '@/lib/demo/vaillant-group-mafo';

export type BootstrapVaillantGroupMafoResult = {
  ok: boolean;
  platformProjectId?: string;
  flowId?: string;
  error?: string;
};

export async function ensureVaillantGroupBarrierResearchFlow(input: {
  platformProjectId: string;
  ownerId?: string | null;
  journeyUrl?: string;
  scanUrl?: string;
}): Promise<BootstrapVaillantGroupMafoResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!isVaillantGroupCollection(platformProjectId)) {
    return {
      ok: false,
      error: 'Not the Vaillant Group Collection — refusing to seed (use Vaillant Group only).',
    };
  }

  const journeyUrl = input.journeyUrl ?? VAILLANT_GROUP_B2C_WAERMEPUMPE_URL;
  const scanUrl = input.scanUrl ?? VAILLANT_GROUP_B2C_WAERMEPUMPE_URL;

  const template = createVaillantBarrierResearchTemplate({
    journeyUrl,
    scanUrl,
    guidelineId: VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
  });

  const existing = await listCollectionTestFlows(platformProjectId);
  const row = existing.find(
    (r) =>
      r.templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH ||
      r.templateId === VAILLANT_GROUP_FLOW_TEMPLATE_ID ||
      ensureFlowDocument(r.flow).templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  );

  if (row) {
    const current = ensureFlowDocument(row.flow);
    const next = {
      ...template,
      lastRun: current.lastRun,
      lastVerdict: current.lastVerdict,
    };
    await patchCollectionTestFlow({
      platformProjectId,
      flowId: row.id,
      name: row.name || VAILLANT_GROUP_FLOW_DEFAULT_NAME,
      flow: next,
    });
    return { ok: true, platformProjectId, flowId: row.id };
  }

  const created = await createCollectionTestFlow({
    platformProjectId,
    name: VAILLANT_GROUP_FLOW_DEFAULT_NAME,
    flow: template,
    templateId: COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
    ownerId: input.ownerId ?? null,
  });
  return { ok: true, platformProjectId, flowId: created.id };
}

export async function ensureVaillantGroupInstallerDualFlow(input: {
  platformProjectId: string;
  ownerId?: string | null;
  customerUrl?: string;
  installerUrl?: string;
  scanUrl?: string;
}): Promise<BootstrapVaillantGroupMafoResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!isVaillantGroupCollection(platformProjectId)) {
    return {
      ok: false,
      error: 'Not the Vaillant Group Collection — refusing to seed (use Vaillant Group only).',
    };
  }

  const customerUrl = input.customerUrl ?? VAILLANT_GROUP_B2C_WAERMEPUMPE_URL;
  const installerUrl = input.installerUrl ?? VAILLANT_GROUP_B2B_FACHPARTNER_URL;
  const scanUrl = input.scanUrl ?? VAILLANT_GROUP_B2C_WAERMEPUMPE_URL;

  const template = createVaillantInstallerDualPerspectiveTemplate({
    customerUrl,
    installerUrl,
    scanUrl,
    guidelineId: VAILLANT_GROUP_BRANDION_GUIDELINE_ID,
  });

  const existing = await listCollectionTestFlows(platformProjectId);
  const row = existing.find(
    (r) =>
      r.templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL ||
      r.templateId === VAILLANT_GROUP_FLOW_UC2_TEMPLATE_ID ||
      ensureFlowDocument(r.flow).templateId === COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
  );

  if (row) {
    const current = ensureFlowDocument(row.flow);
    const next = {
      ...template,
      lastRun: current.lastRun,
      lastVerdict: current.lastVerdict,
    };
    await patchCollectionTestFlow({
      platformProjectId,
      flowId: row.id,
      name: row.name || VAILLANT_GROUP_FLOW_UC2_DEFAULT_NAME,
      flow: next,
    });
    return { ok: true, platformProjectId, flowId: row.id };
  }

  const created = await createCollectionTestFlow({
    platformProjectId,
    name: VAILLANT_GROUP_FLOW_UC2_DEFAULT_NAME,
    flow: template,
    templateId: COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
    ownerId: input.ownerId ?? null,
  });
  return { ok: true, platformProjectId, flowId: created.id };
}
