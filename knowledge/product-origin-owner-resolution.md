# Product-origin owner resolution (AUDION / CHECKION → Collection)

**Date:** 2026-08-03  
**Code:** `lib/resolve-product-origin-owner.ts`  
**Used by:** `audion-project-origin` · `checkion-project-origin`

Service-authenticated origin calls may omit `ownerPlexonUserId` / `platformCompanyId`. Plexon then:

1. Uses explicit pair when both valid  
2. Else owner’s first company / company’s best member (owner → admin → member)  
3. Else any existing membership  
4. Else attach first user ↔ first company  
5. Else bootstrap `FEDERATION_BOOTSTRAP` user + company (`federation@plexon.local`)

No Coolify demo-user env required for machine/Bearer creates.
