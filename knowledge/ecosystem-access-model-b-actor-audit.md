# Ecosystem Access Model B — actor gap audit (2026-09-22)

After the EQC AUDION `401 unauthorized` (machine token without `X-Plexon-User-Id`).

## Rule

Product machine auth (`*_API_TOKEN` or `PLEXON_SERVICE_SECRET`) is **not** a viewer.
Viewer = session / personal token / **`X-Plexon-User-Id`**. Spec: `specs/domain/assistant-actor-identity.md`.

## Status by product (Plexon → product clients)

| Product | Fail-closed on product | Plexon client actor | Notes |
|---------|------------------------|---------------------|-------|
| **CHECKION** | Yes | Wired (`resolveCheckionServiceAuthForActor`) | EQC / scans / research pass actor |
| **AUDION** EQC personas / TG / project | Yes | **Fixed 2026-09-21** (`buildAudionMachineHeaders`) | Was the live 401 |
| **AUDION** research | Yes | Wired | Already had actor |
| **AUDION** journey segment / outline / platform proxy | Yes on journeys list | **Gap** — token-only headers | Collection Flow journeys + outline will 401 when routes gate |
| **BRANDION** | Yes (guidelines / analysis) | Partial — actor optional on analysis client | Callers must always pass `plexonUserId` |
| **VIDEON** | Service + actor required on provisioning | Wired (`withActor`) | OK if callers pass actor |
| **METRON** | Same pattern | Wired (`withActor`) | OK if callers pass actor |
| **CREATION** | Actor on BFF/sync | Product → Plexon BFF | Not Plexon→product machine TG path |
| **ECHON** | Own token model | Bearer only | Not Access Model B Collection ACL |

## Still to fix (Plexon)

1. `lib/integrations/audion-journey-client.ts` — `requireAuthHeaders()` no actor
2. `lib/integrations/audion-platform-proxy.ts` — Bearer only
3. `lib/integrations/audion-journey-outline-client.ts` — detail/validate Bearer only (despite `plexonUserId` in input)
4. `lib/integrations/audion-connectivity.ts` — diagnostics preview fetches (token-only; OK for health, not for gated APIs)
5. Harden Brandion analysis client: require actor (same as CHECKION/AUDION)

## Not apps to “redeploy for this bug”

- **msqdx-ui** — no product machine ACL
- **msqdx-echon** — separate research island
- **CREATION / METRON / VIDEON** — actor pattern already present; smoke if Assistant tools omit actor
