# Mochimo Studios — Cloudflare GitHub Deploy

This version is prepared for deployment from **GitHub → Cloudflare Workers**. You do not need to run Wrangler in Termux.

## Site structure

- `public/index.html` — marketing landing page (site root, `/`). Every "Create Your Profile" / "Create Free Profile" button and the "Log in" link point to `app.html`.
- `public/app.html` — the Mochimo dashboard SPA. It checks `/api/me` on load: if the visitor isn't signed in it shows the login/signup screen; once authenticated it shows the dashboard. So clicking "Create Your Profile" on the landing page opens `app.html`, which shows sign up/login first, then the dashboard opens automatically after auth succeeds — no separate login page file needed.

## What is included

- Mochimo dashboard frontend in `public/`
- Cloudflare Worker API in `src/worker.js`
- D1 database schema/migrations in `migrations/` (applied in order — check
  this folder for the current list, not just `0001_initial.sql`)
- Supabase Storage-backed direct image upload (avatar, Photographer theme gallery) — see
  "Image uploads (Supabase)" below
- Cookie-based authentication
- Dynamic public profiles: `/u/:username`
- NFC tracking/redirect: `/n/:username`
- QR tracking/redirect: `/q/:username`
- Link click analytics
- Profile, links, appearance, settings and analytics APIs
- No demo account and no localStorage database

## Recommended deployment

1. Upload this repository to GitHub.
2. In Cloudflare Dashboard open **Workers & Pages → Create application → Import a repository**.
3. Select this GitHub repository.
4. Keep the project root at the repository root.
5. Deploy.
6. Cloudflare provisions the `mochimo-db` D1 resource from `wrangler.toml` and updates the database ID in the deployed configuration.
7. The deployment script applies the D1 migration and then deploys the Worker.
8. Open the provided `workers.dev` URL.

Cloudflare's Git integration can automatically build and deploy future pushes to the connected repository.

## If Cloudflare asks for database setup manually

Create a D1 database named:

`mochimo-db`

Then add a D1 binding to the Worker with variable name:

`DB`

After the binding exists, deploy again. Migrations are applied from the
`migrations/` folder, in order — there is more than one file as of this
version.

## Image uploads (Supabase)

Avatar and Photographer-theme gallery photos are uploaded directly from the
browser (not pasted as URLs). The Worker forwards the file to Supabase Storage.

1. Create a Supabase project.
2. In Supabase → Storage, create a bucket named `mochimo-images`.
3. Make that bucket **public** so the generated image URLs can be displayed on
   public Mochimo profiles.
4. In the Cloudflare Worker, add these environment variables/secrets:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service-role key (keep this secret)
   - `SUPABASE_BUCKET` — optional; defaults to `mochimo-images`
5. Deploy the Worker.

Uploads go through `POST /api/upload`, with a 5MB limit for JPG/PNG/WEBP/GIF.
The service-role key is used only by the Worker and is never sent to the
browser. The gallery continues to store only the resulting public URL in
`photographer_gallery_json`.

**Important:** do not put `SUPABASE_SERVICE_ROLE_KEY` in frontend JavaScript,
HTML, GitHub, or `wrangler.toml`.


## Important

The `database_id` in `wrangler.toml` is intentionally a placeholder UUID for Cloudflare resource provisioning. Do not replace it with a random ID manually. If Cloudflare asks you to select/create the D1 database in the deployment UI, choose/create `mochimo-db` and keep the binding name `DB`.

## After deployment

1. Open the Worker URL.
2. Create a real Mochimo account.
3. Choose a username such as `panorama`.
4. Add links/profile information.
5. Test the public page:

`https://YOUR-WORKER.workers.dev/u/panorama`

6. NFC URL:

`https://YOUR-WORKER.workers.dev/n/panorama`

7. QR URL:

`https://YOUR-WORKER.workers.dev/q/panorama`

The profile data is stored in Cloudflare D1, so changes made in the dashboard are reflected on the public profile without creating a separate HTML file for each user.

## Photographer theme

The Photographer Featured Work editor supports direct Photo and Reel uploads to the configured Supabase Storage bucket. Photos are limited to 5 MB; MP4/WebM reels are limited to 30 MB. The public profile renders them in an auto-advancing slider.
