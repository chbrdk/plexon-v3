import { handleCreateProjectIntent } from '@/lib/assistant/handlers/create-platform-project'
import type { IntentHandler } from '@/lib/assistant/handlers/context'

/**
 * Legacy intents — Phase 1 redirects to Collection create (both product mirrors).
 * Prefer `create_project` from the intent router; these remain for registry compatibility.
 */
export const handleCreateAudionProjectIntent: IntentHandler<'create_audion_project'> = async (
  ctx,
  intent,
) =>
  handleCreateProjectIntent(ctx, {
    type: 'create_project',
    name: intent.name,
    startResearch: intent.startResearch,
  })

export const handleCreateCheckionProjectIntent: IntentHandler<'create_checkion_project'> = async (
  ctx,
  intent,
) =>
  handleCreateProjectIntent(ctx, {
    type: 'create_project',
    name: intent.name,
    domain: intent.domain,
    startResearch: intent.startResearch,
  })
