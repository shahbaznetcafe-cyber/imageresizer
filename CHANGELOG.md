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

## 2026-07-14 +05:00

### What Changed

- Prepared a full Render Blueprint so both the CPU-intensive image processor and paused frontend can move off Vercel.
- Changed the Blueprint to request the Supabase PostgreSQL URL, admin key, and browser-origin list as Render secrets instead of forcing a local SQLite database.
- Added a Render health check and documented the exact Supabase Session pooler, Render, and Vercel handover steps.
- Made API CORS origins configurable through `CORS_ORIGINS`; requests do not use browser credentials.
- Corrected the Render static-site publish field to `staticPublishPath` after the Blueprint dashboard reported a validation issue.
- Changed the Render Python runtime from 3.10.12 to 3.11.11 because the required `rembg>=2.0.76` package no longer supports Python 3.10.

### Files Changed

- `backend/main.py`
- `render.yaml`
- `.env.example`
- `README.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- Vercel paused the account after the image-processing API exceeded the Fluid Active CPU allowance.
- The application already supports Supabase PostgreSQL, but the Render Blueprint incorrectly forced SQLite. Vercel is paused, so the frontend must move to Render too.

### Risks Or Pending Work

- A Render account/dashboard action is still required to create the service and enter secrets; no database credentials were added to the repository.
- Render free instances can sleep and may be too small for sustained `rembg` image-processing traffic.
- The custom domain must be switched to the Render static frontend service after deploy; this still requires a DNS dashboard change.
- The existing user modification in `backend/database.py` remains untouched.

### Verification

- Pending: Render Blueprint validation, because Render CLI/MCP access is not available in this workspace.
- Pending: backend compile/test, because no usable local Python installation is available.
- Fixed: the first Render backend build could not install `rembg` under Python 3.10.12; the next deploy uses Python 3.11.11.
- Pending dashboard action: the existing Render backend service still has `PYTHON_VERSION=3.10.12` saved in its Environment settings, which takes precedence over the Blueprint value and must be changed to `3.11.11`.
- Passed: Render built and installed all dependencies, including `rembg` and `onnxruntime`, with Python 3.11.
- Pending dashboard action: Render backend startup rejected `DATABASE_URL` because its password contains an unencoded percent sign. Replace it with the exact Supabase Session pooler URL, encoding `%` as `%25` if needed.
- Passed: `npm.cmd run lint`.
- Blocked: `npm.cmd run build` because Windows denied Vite access to the generated `frontend/dist/assets` directory. This is an existing output-folder lock, not a source compilation error.
- Passed: a clean Vite production build using a temporary output directory.
