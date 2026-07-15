# Changelog

## 2026-07-15 +05:00

### What Changed

- Made browser image processing safe for Android browsers that advertise WebGPU but cannot provide a usable adapter.
- Added explicit `device: "wasm"` fallback, version-compatible ONNX Runtime WASM paths, clean failure messaging, and retry-safe initialization.
- Added automated tests for usable WebGPU, missing adapter, adapter error, WebGPU initialization error, WASM error, and retry after failure.

### Files Changed

- `frontend/src/utils/clientImageProcessor.js`
- `frontend/src/utils/clientImageProcessor.test.js`
- `frontend/package.json`
- `frontend/package-lock.json`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- Some Android browsers expose `navigator.gpu` but fail `requestAdapter()`, which previously prevented the implicit runtime fallback from selecting WASM.

### Risks Or Pending Work

- The fallback is unit-tested with an Android-equivalent missing-adapter simulation. A physical Android Chrome image-processing check is still required after Render deploy.
- Existing user work in `backend/database.py` and the Personal Unlimited export remains untouched.

### Verification

- Passed: `npm.cmd install`
- Passed: `npm.cmd test` (6 tests)
- Passed: `npm.cmd run lint`
- Passed: `npm.cmd run build`

## 2026-07-15 +05:00

### What Changed

- Moved background removal, white-background 600x800 composition, JPEG size fitting, and ZIP creation from the Render backend into the operator's browser.
- Added a quota-protected backend endpoint that records browser-completed images in Supabase/admin records without receiving image files.
- Removed rembg/ONNX deployment dependencies and model environment variables from the Render Free configuration.

### Files Changed

- `frontend/src/App.jsx`, `frontend/src/utils/clientImageProcessor.js`, and frontend processing UI components
- `frontend/package.json`, `frontend/package-lock.json`
- `backend/main.py`, `backend/requirements.txt`, `render.yaml`
- `README.md`, `PROJECT.md`, `CURRENT_TASK.md`, `NEXT_STEPS.md`, `CHANGELOG.md`

### Why It Changed

- Render Free terminated the service when rembg/ONNX exceeded its 512 MB memory limit. Browser processing removes that workload while retaining Supabase sessions, quotas, and admin records.

### Risks Or Pending Work

- The first use on each browser downloads the MODNet model and needs a modern Chrome or Edge browser; later runs use the browser cache.
- Render Free may still sleep after inactivity, so session/quota requests can wake slowly, but image processing itself no longer waits for or loads a Render model.
- The existing user modification in `backend/database.py` and Personal Unlimited export files remain untouched.

### Verification

- Passed: `npm.cmd run lint`
- Passed: `npm.cmd run build`
- Passed: `git diff --check`
- Blocked: backend Python compile/test because Python is not installed in this workspace.

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

## 2026-07-14 +05:00

### What Changed

- Updated the Render Free backend profile to defer rembg model loading until the first image request.
- Switched the Render-only rembg model from full `u2net` to lightweight `u2netp`.
- Recorded the verified Render failure sequence: Python dependencies installed, Supabase initialization passed, then the 176 MB model preload exceeded Render Free's 512 MB memory limit.

### Files Changed

- `render.yaml`
- `README.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- Render killed the backend for exceeding 512 MB while loading `u2net` during startup, so Uvicorn never bound the health-check port.
- The official rembg project identifies `u2netp` as a lightweight U2Net model. Deferring its load allows the backend health check to complete and reduces the free-instance memory requirement.

### Risks Or Pending Work

- The first image after a restart is slower because the model downloads/loads on demand.
- `u2netp` can have less accurate background edges than full `u2net`.
- A real image must still be tested. If it exhausts 512 MB, the free backend is not viable for this image-processing workload and needs more memory.
- Existing user changes in `backend/database.py` and Personal Unlimited files remain untouched.

### Verification

- Confirmed from Render logs: Python 3.11 dependencies installed successfully.
- Confirmed from Render logs: database initialization completed before model preload began.
- Confirmed from Render logs: the process was terminated for using more than 512 MB while loading `u2net`.
- Pending: Render deployment and one real image test with the lightweight profile.

## 2026-07-15 +05:00

### What Changed

- Started the browser warm-up request as soon as the frontend opens instead of waiting until after operator login.
- Replaced the rembg session cache with a lock-protected shared session, preventing a warm-up request and the first image request from loading separate model copies at the same time.
- Documented that Render Free cannot remain always on; it sleeps after inactivity and needs a paid backend instance for continuous availability.

### Files Changed

- `backend/image_processor.py`
- `frontend/src/App.jsx`
- `README.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- The original warm-up ran only after login, so an operator could reach image processing before the background model load had completed.
- A single-flight model loader avoids duplicate memory usage while the backend is waking and makes the first processing request wait for the existing warm-up instead of starting another one.

### Risks Or Pending Work

- The initial request after a Render Free sleep can still take about a minute because the instance must start.
- A paid Render backend is required for an always-live service.
- Existing user changes in `backend/database.py` and Personal Unlimited files remain untouched.

### Verification

- Passed: `npm.cmd run lint`.
- Passed: clean Vite production build using `.render-verify-warmup` as a temporary output directory.
- Blocked: local backend syntax check because this machine still has no usable Python runtime or project virtual environment.
- Pending: one live Render image-processing test after deployment.

## 2026-07-15 +05:00

### What Changed

- Set the Render Free profile to preload the compact `u2netp` model during backend startup.
- Kept the full `u2net` model disabled because its 176 MB preload previously exceeded Render Free's 512 MB memory limit.

### Files Changed

- `render.yaml`
- `README.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- Lazy loading made the first image request wait for model initialization even after the backend health check was already live.
- `u2netp` is the selected compact model, so moving its initialization to startup removes that extra first-image delay while retaining the memory-constrained profile.

### Risks Or Pending Work

- The next backend deployment must prove that `u2netp` preloads within the 512 MB limit. If it does not, revert `PRELOAD_REMBG_MODEL` to `0` and use a paid backend for fast always-on processing.
- Render Free still spins down after 15 idle minutes; this change only removes model-load time after startup, not the platform cold-start delay.

### Verification

- Passed: public `/api/health` returned `status: healthy` and `database_backend: supabase_postgres` before this configuration change.
- Pending: Render deploy log and one production image test with compact-model startup preload.

## 2026-07-15 +05:00

### What Changed

- Reverted Render Free rembg startup preloading after the deployed instance failed with an out-of-memory error over 512 MB.
- Kept the lightweight `u2netp` model and on-demand warm-up path so the FastAPI backend can become healthy before image inference uses memory.

### Files Changed

- `render.yaml`
- `README.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`

### Why It Changed

- Render reported an instance failure caused by exceeding the 512 MB free-memory limit during startup preloading.
- Restoring on-demand model loading returns the backend to a bootable state; the model-load delay cannot be removed reliably on this instance size.

### Risks Or Pending Work

- The first image after an idle restart remains slower on Render Free.
- The production solution for fast first-image processing and an always-on backend is a higher-memory paid service; Supabase does not need to change.

### Verification

- Confirmed from Render: instance `94v47` failed for exceeding 512 MB during startup preload.
- Pending: Render deploy and health check after the rollback.
