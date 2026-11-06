# Notes

## Setup

Straightforward except for `docker compose up`. I needed to restart my Linux machine after installing. I don't have Docker installed locally; my containers run on my homelab.

- Started: 4:54 PM
- Finished: 6:04 PM. I went about 10 minutes over the hour while finishing the Toggle All fix.

## What I fixed, and why

- **Bulk delete stopped at the first locked document.** (`documents.controller.ts`)
  - The loop let the `ConflictException` escape. Every document before the locked one was already deleted, nothing after it was attempted, and the client got a 409 that only mentioned one failure.
  - Each ID is now handled on its own. `ConflictException` and `NotFoundException` are caught per ID, the loop keeps going, and the response is `{ success, deleted, locked, notFound }`. Any other error still throws.
- **The document list never refreshed.** (`documents.service.ts`)
  - `findAll()` returned a cache that was filled once at startup and never updated, so deleted docs stayed in the list and new docs never appeared.
  - Added a private `refreshCache()` that runs after `create()` and `delete()`.
  - Noticed this while testing the corrected bulk delete.
- **`remove()` deleted the wrong document when the ID was missing.** (`documents.store.ts`)
  - `findIndex` returns `-1`, and `splice(-1, 1)` deletes the last document in the array. I added a check so a missing ID does nothing.
  - Nothing triggers this today because the service checks `findById` first, but any future caller that skips that check would delete the wrong document without any error.
- **Lock status wasn't showing on the front end.** (`client/src/DocumentList.tsx`, `client/src/types.ts`)
  - The client checked `doc.locked`, but the server only sends `lockedBy`.
  - At first I added a `locked` field on the server. I switched to working it out on the client instead: `isLocked` returns `doc.lockedBy !== null`, and I removed `locked` from the client `Doc` type. This keeps one source of truth, so the client and server types can't drift apart, and the server needed no changes.
- **Locked documents could be selected for delete.** (`DocumentList.tsx`)
  - Disabled the checkbox on locked rows, so users can't send locked documents to delete and can see which rows are locked.
  - Toggle All selected every document, locked ones included. It now only selects unlocked documents, `allSelected` is based on the selectable rows, and the header checkbox is disabled when every document is locked.
- **Flicker after every create or delete.** (`App.tsx`)
  - `load()` set `loading` to `true` on every call, which swapped the whole table out for the loading message. I removed that `setLoading(true)`. `loading` already starts as `true`, so the first load still shows the message.
- **The create form could get stuck or lose input.** (`CreateDocumentForm.tsx`)
  - Changed the submit to try/catch/finally. The title only clears when the create succeeds, and `submitting` always resets so the button can't stay disabled.
- **Tests.** (`documents.service.spec.ts`)
  - Added 5 tests:
    - a new document shows up in `findAll`
    - a deleted document is gone from `findAll`
    - deleting a locked document throws `ConflictException` and keeps the document
    - deleting an unknown ID throws `NotFoundException`
    - `remove()` with an unknown ID does nothing
  - All 8 tests pass.
- **`server/tsconfig.json`**
  - Added `"types": ["node", "jest"]` so VS Code stops complaining that it can't find `describe`/`it` in the spec file. The build was fine; this was only the editor.
- **Formatting**
  - My editor reformatted the files I touched (single quotes to double quotes, line wrapping), so the diff is noisier than the actual changes.

## Decisions where the requirement was unclear

- **Bulk delete allows partial success instead of all-or-nothing.**
  - It deletes what it can and reports what it skipped. The alternative was to check every ID for a lock first and delete nothing if any were locked. I went with partial success because a user who selects 10 docs and has 1 locked probably still wants the other 9 gone.
  - Trade-off: the endpoint now returns 200 even when some IDs fail, so the client has to read the response body to find out what happened (see below).
- **Kept the cache and refresh it on every write instead of removing it.**
  - Removing it would have been simpler since the store is already in memory, but I kept it in case the store becomes a real database later.
  - Kept `refreshCache()` private rather than public. Bulk delete gets the refresh automatically through `delete()`, and callers don't have to remember to call it.
  - Trade-off: bulk delete rebuilds the cache once per document. That's negligible at this size, and a `deleteMany` in the service could fix it later.
- **Locked documents can't be selected at all.**
  - It's better to stop the action in the UI than to let the user confirm a delete that will partly fail.

## What I would flag in code review but didn't have time to fix

- **The client ignores the bulk-delete response.**
  - `handleDeleteSelected` doesn't read `{ locked, notFound }`, so skipped documents just stay in the list with no message.
  - Locked docs can't be selected anymore, but a doc can still be locked or deleted by someone else between page load and the delete.
  - `bulkDeleteDocuments` in `api.ts` also returns `any`; it should have a typed result.
- **The create form's new error handling is only half wired up.**
  - `handleCreate` in `App.tsx` catches its own error and never rethrows, so the form's `catch` never runs and a failed create still clears the title.
  - Fix: rethrow after `setError` in `handleCreate`.
- **No input validation on bulk delete.**
  - A body without an `ids` array (`{}` or `{ ids: null }`) throws a `TypeError` and returns a 500 instead of a 400.
  - Fix: add a DTO with `class-validator`, or an `Array.isArray` guard.
  - `create` has no server-side validation of `title` either.
- **Toggle All cleanup.**
  - `toggleAll` repeats the filter instead of reusing `selectableIDs`.
  - `allSelected` compares lengths, so a stale ID in `selectedIds` could show the header as checked. `selectableIDs.every(...)` would be exact.
- **No client tests.**
  - Only the server has a test runner. There's also no controller spec for the bulk-delete response shape.

## Where I used AI (Claude Code)

- Sanity-checked my reading of the bulk delete bug and the per-ID fix in the controller.
- Reviewed the cache fix and the decision to keep `refreshCache` private.
- Diagnosed the VS Code "Cannot find name 'describe'" error.
- Talked through moving the lock state from a server `locked` field to working it out from `lockedBy` on the client.
- Checked my Toggle All fix, and suggested making `selectableIDs` a computed value.
- Cleaned up formatting and grammar in these notes.
- In each case I wrote or reviewed the code changes myself and used AI as a second opinion.
