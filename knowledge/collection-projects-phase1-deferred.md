# Collection projects — Phase 1 done

Phase 1 create enforcement shipped 2026-07-31.

## What changed

- Assistant: all project-create intents → Collection (`create_project`); product-only targets removed from `detectCreateProjectTarget`.
- Legacy audion/checkion create handlers redirect to Collection workflow.
- Admin + `/api/platform/companies/.../platform-projects` POST sync CHECKION **and** AUDION after placeholders.
- AUDION-origin end state remains Collection with both capabilities (CHECKION sync after AUDION bind; idempotent repair).

## Next

- Phase 3: legacy backfill (2C).

Phase 2 shipped: Collection home + insights capability chips + assistant Collection picker.

See `specs/domain/collection-projects.md`.
