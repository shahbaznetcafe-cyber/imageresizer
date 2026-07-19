# Latest Checkpoint: Photo Limit Request Control

## Current Goal

Prevent duplicate unpaid photo-limit requests per machine and give the admin a fast way to delete pending requests.

## Completed Subtasks

- Added a transaction-safe same-machine pending-request guard for PostgreSQL and SQLite.
- Added an admin-only endpoint to delete a pending request.
- Added `Delete request` to the Photo Limit Requests cards without changing the existing approval (`Set`) flow.
- Passed frontend lint, frontend automated tests, frontend production build, and backend compilation.

## Remaining Subtasks

- Let Render deploy the backend, then verify duplicate, delete, and approval flows with a real school machine.

## Important Files Involved

- `backend/database.py`
- `backend/main.py`
- `frontend/src/components/AdminRecords.jsx`

## Recovery Instructions For Next Codex Session

1. Read the checkpoint files and run `git status --short --branch`.
2. Confirm the deployed backend includes this checkpoint before testing the admin Delete request button.
3. Test one duplicate request from the same machine, then test deletion and approval independently.

# Current Task

## Current Goal

Run the app reliably on Render Free while retaining Supabase PostgreSQL, without server-side AI image processing.

## Completed Subtasks

- Inspected the root project structure.
- Read available project and stack files: `README.md`, `requirements.txt`, `backend/requirements.txt`, `frontend/package.json`, `frontend/vite.config.js`, `render.yaml`, `vercel.json`, `.env.example`, `start-personal-unlimited.bat`, and `PERSONAL-UNLIMITED-README.txt`.
- Checked git status before changes.
- Confirmed checkpoint files were missing and created this recovery baseline.
- Ran frontend checks successfully: `npm.cmd run build` and `npm.cmd run lint`.
- Compact admin records layout added for long tables/lists.
- Re-ran frontend checks successfully after the admin panel change.
- Confirmed the Vercel account was paused after Fluid Active CPU exceeded its allowance; the image-processing API should not run on Vercel.
- Prepared a Render Blueprint for both the image-processing backend and static frontend.
- Corrected the Render static-site publish setting after the Blueprint dashboard reported a validation issue.
- Diagnosed the first Render build failure: `rembg>=2.0.76` requires Python 3.11+, while the Blueprint selected Python 3.10.12.
- Confirmed the Blueprint now requests Python 3.11.11, but the existing Render service has a dashboard-saved `PYTHON_VERSION=3.10.12` that overrides it.
- Confirmed the second Render backend startup failure is an invalid Supabase `DATABASE_URL`: a percent sign in the database password was not URL-encoded.
- Confirmed the corrected Supabase URL gets through database initialization; the backend then failed only while loading the `u2net` model.
- Diagnosed the current Render failure as a 512 MB free-instance out-of-memory restart caused by preloading the 176 MB `u2net` model before Uvicorn could bind its port.
- Updated the Render Blueprint to defer model loading and use rembg's lightweight `u2netp` model for the free instance.
- Moved browser-triggered model warm-up to app launch and made backend model creation single-flight, so login and processing cannot load duplicate rembg sessions concurrently.
- Confirmed Render Free also runs out of memory while startup-preloading the compact-model profile; restored on-demand loading so the backend can start.

## Remaining Subtasks

- Run backend checks once Python is available on PATH or `.venv` is restored.
- Review the existing modified `backend/database.py` carefully before changing it.
- Decide whether the untracked Personal Unlimited export should be committed, ignored, or archived outside source control.
- Verify backend import/compile or tests still pass.
- Visually check the live admin panel after deploy/local run with real admin records.
- Add `pectaa.shahbaznetcafe.com` to the Render frontend service and update its DNS record after the frontend is live.
- Redeploy the backend with on-demand model loading and confirm `/api/health` responds without an out-of-memory restart.
- Process one representative school photo. If it still runs out of memory, do not keep retrying on the free plan; move the backend to a larger-memory service.
- For an always-on backend after launch, change only the Render backend to a paid instance; Free services spin down after 15 minutes of no traffic.

## Important Files Involved

- `AGENTS.md`
- `PROJECT.md`
- `CURRENT_TASK.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`
- `README.md`
- `backend/main.py`
- `backend/database.py`
- `backend/image_processor.py`
- `frontend/src/App.jsx`
- `frontend/src/components/AdminRecords.jsx`
- `render.yaml`
- `.env.example`
- `start-personal-unlimited.bat`

## Recovery Instructions For Next Codex Session

1. Read `AGENTS.md`, `PROJECT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `NEXT_STEPS.md`.
2. Run `git status --short --branch`.
3. Render must receive a Supabase Session pooler URL through `DATABASE_URL`, not a SQLite filename. The corrected URL already passed database initialization. Keep `ADMIN_KEY` as a Render secret.
4. The Blueprint deploys the frontend with its Render backend URL. Add the custom domain and update DNS after both services are live.
5. Frontend checks passed in this checkpoint. Backend Python checks are still pending because `python` was not found and the Python launcher reported no installed Python.
6. When Python is available, run:
   - `python -m compileall backend`
7. Open the admin panel and verify the compact scroll sections with real production-like data.
8. The next recovery step is to verify the restored on-demand model deploy, then process one real image while watching the logs for memory errors.

## Latest Checkpoint: Browser Processing

- Browser-side MODNet background removal, 600x800 JPEG generation, and ZIP downloads are implemented.
- The FastAPI backend records completed-image counts through `/api/record-processed-images`; the live frontend no longer asks Render to run AI inference.
- `render.yaml` and `backend/requirements.txt` no longer request rembg/ONNX dependencies, preventing the Render Free 512 MB model crash.
- Frontend lint and production build passed. Local Python checks remain blocked because Python is not installed in this workspace.

Next recovery action: push this checkpoint, let Render rebuild both services, then process one normal JPG in Chrome/Edge and confirm the admin count increases.

## Latest Checkpoint: Android WASM Fallback

- Fixed browsers that expose `navigator.gpu` but cannot return a WebGPU adapter.
- Background removal now probes `requestAdapter()` before selecting WebGPU and explicitly falls back to the WASM backend with `fp32`.
- Production WASM paths use the ONNX Runtime version bundled with Transformers.js, and rejected initialization promises are cleared for retry.
- Added six automated fallback tests. `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` passed.

## Latest Checkpoint: 15-Image Batch Limit

- Raised the browser upload and backend recording batch limit from 10 to 15 images.
- The 15-image limit is intentionally below 20 to keep browser memory, previews, and ZIP creation dependable on Android devices.

## Latest Checkpoint: Upload Note Cleanup

- Removed the technical English browser/Render memory line from the upload note, leaving the operator-facing Urdu guidance.

## Latest Checkpoint: Guidance First

- Moved the Urdu upload guidance card above the drag-and-drop upload box so operators read it before selecting photos.
