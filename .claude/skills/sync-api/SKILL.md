---
name: sync-api
description: Regenerate the frontend's OpenAPI-derived TypeScript types after a backend API change, then verify the client still type-checks against them. Use after editing a controller, DTO, or request/response shape under server/src/main/java, or whenever client/src/lib/types/api.d.ts might be stale relative to the backend.
---

You are syncing the frontend's generated API types with the current backend contract, then confirming nothing downstream broke.

## Process

1. **Run the sync script** from the repo root:
   ```
   ./scripts/openapi-sync.sh
   ```
   This starts the backend, downloads `server/openapi.json` from `/api/v1/public/docs`, regenerates `client/src/lib/types/api.d.ts` via `bun run generate:api`, then stops the backend. If it fails, report the failing step (backend didn't start, curl failed, generation failed) — don't retry blindly.

2. **Summarize what changed.** `client/src/lib/types/api.d.ts` is committed to git, so diff it:
   ```
   git diff --stat client/src/lib/types/api.d.ts
   git diff client/src/lib/types/api.d.ts
   ```
   Call out added/removed endpoints or changed request/response shapes in plain terms — not the raw diff.

3. **Verify the client still compiles against the new types:**
   ```
   cd client && bun run check
   ```

4. **If `check` fails**, this is expected signal, not a bug in the sync: the API shape changed and call sites need updating. List the failing files/lines so they can be fixed — don't attempt to silence the errors by hand-editing `api.d.ts` (it's generated and will be overwritten next sync).

5. **If `check` passes**, report that the sync is clean and summarize the API diff.

## Rules

- Never hand-edit `client/src/lib/types/api.d.ts` directly — always regenerate via the script.
- If `git diff` shows no changes after running the sync, say so plainly (nothing was out of sync) instead of manufacturing a summary.
- This skill only syncs types and reports check failures — it does not fix the call sites itself unless asked to.
