# Current Task

## Current Goal

Move the complete app from paused Vercel hosting to Render while retaining the Supabase PostgreSQL database.

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

## Remaining Subtasks

- Run backend checks once Python is available on PATH or `.venv` is restored.
- Review the existing modified `backend/database.py` carefully before changing it.
- Decide whether the untracked Personal Unlimited export should be committed, ignored, or archived outside source control.
- Verify backend import/compile or tests still pass.
- Visually check the live admin panel after deploy/local run with real admin records.
- Add `pectaa.shahbaznetcafe.com` to the Render frontend service and update its DNS record after the frontend is live.
- Redeploy the backend from this lightweight-model checkpoint and confirm `/api/health` responds without an out-of-memory restart.
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
8. The next recovery step is to verify the startup warm-up deploy, then process one real image while watching the logs for memory errors.
