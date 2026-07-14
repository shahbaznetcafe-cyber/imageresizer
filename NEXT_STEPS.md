# Next Steps

## Completed

- Initial project inspection completed.
- Missing checkpoint files created.
- Current uncommitted state documented.
- Frontend production build passed.
- Frontend lint passed.
- Admin records page compacted with scrollable long sections.
- Frontend lint/build passed after admin UI changes.
- Identified Vercel Fluid Active CPU overuse as the production outage cause.
- Prepared a full Render Blueprint that uses Supabase PostgreSQL through an environment secret and replaces the paused Vercel frontend.
- Corrected the static frontend Blueprint field required by Render validation.
- Corrected the Render Python runtime to 3.11.11 so the required `rembg` package can install.
- Identified a dashboard-saved `PYTHON_VERSION=3.10.12` override that must be changed manually on the existing Render backend service.
- Confirmed dependencies install successfully with Python 3.11.
- Confirmed the corrected Supabase `DATABASE_URL` passes database initialization.
- Identified the remaining backend crash as a 512 MB memory limit: startup preloaded the 176 MB `u2net` model before the web server bound its port.
- Updated the Blueprint for a Render Free memory profile with the lightweight `u2netp` model.
- Added an app-launch warm-up request and a backend model-load lock to reduce the first-image delay and prevent duplicate concurrent model loads.
- Confirmed startup preloading exhausts the 512 MB Render Free memory limit and restored on-demand `u2netp` loading so the backend can boot.

## Do Next

1. Let Render deploy the latest pushed commit, or use **Manual Deploy** → **Deploy latest commit** for the backend.
2. Confirm the backend starts and `https://sed-punjab-resizer-backend.onrender.com/api/health` returns `database_backend: "supabase_postgres"` without an out-of-memory log line.
3. Process one representative school photo after the backend is live. It may load the compact model once; if this is not fast enough for production, move only the backend to a larger-memory paid Render instance.
4. If that request still causes an out-of-memory restart, stop testing the free service and move only the backend to a larger-memory Render instance. Do not change Supabase.
5. Add `pectaa.shahbaznetcafe.com` to the Render frontend Custom Domains screen and apply the DNS record it gives you after the image test passes.
6. Open the admin panel and visually confirm long school records, feedback, and limit request sections are easier to use.
7. Install/restore Python or activate a usable project virtual environment.
8. Run the safest backend check:
   - `python -m compileall backend`
9. Inspect any check failures and fix only issues related to the current work.
10. Review the existing `backend/database.py` modification and decide whether it should be kept as user work, committed, or adjusted.
11. Decide what to do with the untracked Personal Unlimited package/export files.

## Known Bugs / Risks

- Git reports a permission warning for `C:\Users\shahbaz/.config/git/ignore`.
- `backend/database.py` is marked modified, but this checkpoint did not change it.
- `personal_school_sessions.db` is untracked; database files are usually not committed unless intentionally required.
- The exported `PECTAA-Personal-Unlimited-NoLogin-20260703-150515/` folder duplicates much of the project and may not belong in source control.
- Render free services can sleep; the first request after inactivity may be slow. Supabase direct database URLs may fail from Render if the Supabase project has no IPv4 add-on, so use the Supabase Session pooler URL.
- `u2netp` is a lower-memory model and may produce less precise background edges than `u2net`. No rembg model can safely preload within this service's 512 MB limit.
- Render Free cannot remain always on: it spins down after 15 minutes without inbound traffic. Use a paid backend service for an always-live production app.
- The custom domain will remain unavailable until its DNS record is changed from Vercel to the Render static frontend service.

## Commands To Run Next

```bash
python -m compileall backend
```

Already passed in this checkpoint:

```bash
cd frontend
npm.cmd run build
npm.cmd run lint
```

Latest additional verification:

```bash
cd frontend
npm.cmd exec vite -- build --outDir .render-verify-warmup
```

## Suggested Commit Message

```bash
git add backend/image_processor.py frontend/src/App.jsx README.md CURRENT_TASK.md CHANGELOG.md NEXT_STEPS.md
git commit -m "checkpoint: warm Render image processor early"
```
