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

## Do Next

1. Commit and push the full Render deployment configuration.
2. In the Render backend service Environment screen, change `PYTHON_VERSION` to `3.11.11`, save, and deploy the latest commit.
3. Confirm the backend rebuild installs `rembg` successfully, then verify `https://<render-service>/api/health` returns `database_backend: "supabase_postgres"`.
4. Add `pectaa.shahbaznetcafe.com` to the Render frontend Custom Domains screen and apply the DNS record it gives you.
5. Open the admin panel and visually confirm long school records, feedback, and limit request sections are easier to use.
6. Install/restore Python or activate a usable project virtual environment.
7. Run the safest backend check:
   - `python -m compileall backend`
8. Inspect any check failures and fix only issues related to the current work.
9. Review the existing `backend/database.py` modification and decide whether it should be kept as user work, committed, or adjusted.
10. Decide what to do with the untracked Personal Unlimited package/export files.

## Known Bugs / Risks

- Git reports a permission warning for `C:\Users\shahbaz/.config/git/ignore`.
- `backend/database.py` is marked modified, but this checkpoint did not change it.
- `personal_school_sessions.db` is untracked; database files are usually not committed unless intentionally required.
- The exported `PECTAA-Personal-Unlimited-NoLogin-20260703-150515/` folder duplicates much of the project and may not belong in source control.
- Render free services can sleep; the first request after inactivity may be slow. Supabase direct database URLs may fail from Render if the Supabase project has no IPv4 add-on, so use the Supabase Session pooler URL.
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

## Suggested Commit Message

```bash
git add backend/main.py render.yaml .env.example README.md CURRENT_TASK.md CHANGELOG.md NEXT_STEPS.md
git commit -m "checkpoint: prepare Render backend deployment"
```
