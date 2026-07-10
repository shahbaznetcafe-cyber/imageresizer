# Changelog

## 2026-07-09 13:43:12 +05:00

### What Changed

- Added recovery and checkpoint documentation files for safer continuation after shutdown.
- Captured the project stack, current git state, known untracked files, and recovery process.
- Ran available frontend verification commands.

### Files Changed

- `AGENTS.md`
- `PROJECT.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- The requested checkpoint files did not exist, so future Codex sessions had no reliable recovery baseline.
- This keeps the project resumable and reduces the chance of repeated or unsafe work after sudden shutdown.

### Risks Or Pending Work

- No app behavior changed in this checkpoint.
- Existing modified/untracked files from before this checkpoint still need owner decision before commit cleanup.
- Frontend build and lint passed.
- Backend compile/test checks are pending because Python is not currently available to this shell.

### Verification

- Passed: `npm.cmd run build`
- Passed: `npm.cmd run lint`
- Blocked: `python -m compileall backend` because `python` was not recognized
- Blocked: Python launcher fallback because it reported no installed Python

## 2026-07-09 13:52:03 +05:00

### What Changed

- Made the admin records page wider and more compact.
- Put Photo Limit Requests and Software Feedback into side-by-side panels on large screens.
- Added internal scroll limits for long request/feedback lists.
- Added a compact School Records header and made the schools table scroll inside a fixed-height panel with a sticky table header.
- Reduced table padding and summary card sizing so more records fit on screen.

### Files Changed

- `frontend/src/components/AdminRecords.jsx`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- The admin panel became too long when many schools/errors/records existed, making it slow to inspect and manage.
- The new layout keeps all data available while preventing the full browser page from becoming endlessly tall.

### Risks Or Pending Work

- Backend data and CSV export behavior were not changed.
- Needs a quick visual check in the browser with real admin data after deployment or local run.
- Backend compile/test is still pending because Python is unavailable in this shell.

### Verification

- Passed: `npm.cmd run lint`
- Passed: `npm.cmd run build`
