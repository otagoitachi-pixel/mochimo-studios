# Supabase Storage setup for Mochimo

1. Create/open your Supabase project.
2. Go to **Storage → New bucket**.
3. Name the bucket exactly `mochimo-images`.
4. Turn on **Public bucket**.
5. Go to **Project Settings → API** and copy:
   - Project URL
   - `service_role` key
6. In Cloudflare Worker settings, add:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (Secret)
   - `SUPABASE_BUCKET` = `mochimo-images`
7. Redeploy.

## Security

Never put the service-role key in `public/`, frontend JavaScript, HTML,
GitHub source, or `wrangler.toml`. Only the Worker should use it.

## Upload flow

Chrome file picker → Mochimo `/api/upload` → Supabase Storage → public image URL
→ D1 `photographer_gallery_json`.
