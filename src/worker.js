import { hashPassword, verifyPassword, newToken, sessionCookie, clearSessionCookie, getCookie, SESSION_TTL_MS } from './auth.js';
import { isValidUsername, isValidEmail, isSafeUrl, clampStr, LINK_TYPES, EVENT_TYPES, THEMES, BUTTON_STYLES, LAYOUTS } from './validate.js';

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
function errorJson(message, status = 400) { return json({ error: message }, { status }); }

async function getSessionUser(request, env) {
  const token = getCookie(request, 'mochimo_session');
  if (!token) return null;
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(token).first();
  if (!session || session.expires_at < Date.now()) return null;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first();
  return user || null;
}

function publicUser(u) {
  const { password_hash, password_salt, ...rest } = u;
  return rest;
}

function isSecureRequest(request) {
  return new URL(request.url).protocol === 'https:';
}

async function ensureDefaultRows(env, userId) {
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO appearance (user_id) VALUES (?)').bind(userId),
    env.DB.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').bind(userId),
  ]);
}

// ---------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------

async function handleSignup(request, env) {
  const body = await request.json().catch(() => ({}));
  const name = clampStr(body.name, 60).trim();
  const email = clampStr(body.email, 100).trim().toLowerCase();
  const username = clampStr(body.username, 20).trim().toLowerCase();
  const password = String(body.password || '');

  if (name.length < 2) return errorJson('Please enter your name.');
  if (!isValidEmail(email)) return errorJson('Please enter a valid email.');
  if (!isValidUsername(username)) return errorJson('Username must be 3–20 letters, numbers or underscores.');
  if (password.length < 8) return errorJson('Password must be at least 8 characters.');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?').bind(email, username).first();
  if (existing) return errorJson('An account with that email or username already exists.', 409);

  const id = crypto.randomUUID();
  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, email, username, hash, salt, Date.now()).run();
  await ensureDefaultRows(env, id);

  const token = newToken();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, id, Date.now(), Date.now() + SESSION_TTL_MS).run();

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return json(publicUser(user), { headers: { 'Set-Cookie': sessionCookie(token, { secure: isSecureRequest(request) }) } });
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const key = clampStr(body.emailOrUsername, 100).trim().toLowerCase();
  const password = String(body.password || '');

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? OR username = ?').bind(key, key).first();
  if (!user) return errorJson('No account found with that email or username.', 404);

  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) return errorJson('Incorrect password.', 401);

  const token = newToken();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, user.id, Date.now(), Date.now() + SESSION_TTL_MS).run();

  return json(publicUser(user), { headers: { 'Set-Cookie': sessionCookie(token, { secure: isSecureRequest(request) }) } });
}

async function handleLogout(request, env) {
  const token = getCookie(request, 'mochimo_session');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie({ secure: isSecureRequest(request) }) } });
}

async function handleMe(request, env) {
  const user = await getSessionUser(request, env);
  return json(user ? publicUser(user) : null);
}

async function handleGetProfile(request, env, user) {
  return json(user);
}

async function handleGetAppearance(request, env, user) {
  await ensureDefaultRows(env, user.id);
  const row = await env.DB.prepare('SELECT * FROM appearance WHERE user_id = ?').bind(user.id).first();
  return json(row);
}

async function handleGetSettings(request, env, user) {
  await ensureDefaultRows(env, user.id);
  const row = await env.DB.prepare('SELECT * FROM settings WHERE user_id = ?').bind(user.id).first();
  return json(row);
}

async function handleGetRecentEvents(request, env, user) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 8)));
  const { results } = await env.DB.prepare(
    'SELECT type, link_id, visitor_id, source, device, created_at FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(user.id, limit).all();
  return json(results);
}

async function handleUpdateProfile(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const fields = {
    name: clampStr(body.name ?? user.name, 60),
    bio: clampStr(body.bio ?? user.bio, 160),
    location: clampStr(body.location ?? user.location, 80),
    website: clampStr(body.website ?? user.website, 200),
    phone: clampStr(body.phone ?? user.phone, 40),
    avatar_url: clampStr(body.avatar_url ?? body.avatarUrl ?? user.avatar_url, 500),
    email: user.email,
  };
  if (body.email && isValidEmail(body.email)) fields.email = clampStr(body.email, 100).trim().toLowerCase();

  let username = user.username;
  if (body.username && body.username.toLowerCase() !== user.username) {
    const newUsername = clampStr(body.username, 20).trim().toLowerCase();
    if (!isValidUsername(newUsername)) return errorJson('Invalid username.');
    const taken = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(newUsername, user.id).first();
    if (taken) return errorJson('That username is already taken.', 409);
    username = newUsername;
  }

  const socials = body.socials || {};
  await env.DB.prepare(`
    UPDATE users SET name=?, email=?, username=?, bio=?, location=?, website=?, phone=?, avatar_url=?,
      social_instagram=?, social_youtube=?, social_tiktok=?, social_x=?, social_linkedin=?, social_facebook=?
    WHERE id=?
  `).bind(
    fields.name, fields.email, username, fields.bio, fields.location, fields.website, fields.phone, fields.avatar_url,
    clampStr(socials.instagram ?? user.social_instagram, 200),
    clampStr(socials.youtube ?? user.social_youtube, 200),
    clampStr(socials.tiktok ?? user.social_tiktok, 200),
    clampStr(socials.x ?? user.social_x, 200),
    clampStr(socials.linkedin ?? user.social_linkedin, 200),
    clampStr(socials.facebook ?? user.social_facebook, 200),
    user.id
  ).run();

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  return json(publicUser(updated));
}

async function handleListLinks(request, env, user) {
  const { results } = await env.DB.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY sort_order ASC').bind(user.id).all();
  return json(results);
}

async function handleCreateLink(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const type = LINK_TYPES.includes(body.type) ? body.type : 'custom';
  const title = clampStr(body.title, 60).trim();
  const url = clampStr(body.url, 500).trim();
  if (!title) return errorJson('A link needs a title.');
  if (!isSafeUrl(url)) return errorJson('Please provide a valid https://, http://, mailto: or tel: link.');

  const { count } = await env.DB.prepare('SELECT COUNT(*) as count FROM links WHERE user_id = ?').bind(user.id).first();
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO links (id, user_id, type, title, url, description, thumbnail, enabled, clicks, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `).bind(id, user.id, type, title, url, clampStr(body.description, 80), clampStr(body.thumbnail, 500), count, Date.now()).run();

  const created = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first();
  return json(created, { status: 201 });
}

async function handleUpdateLink(request, env, user, linkId) {
  const existing = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?').bind(linkId, user.id).first();
  if (!existing) return errorJson('Link not found.', 404); // ownership check

  const body = await request.json().catch(() => ({}));
  const url = body.url !== undefined ? clampStr(body.url, 500).trim() : existing.url;
  if (body.url !== undefined && !isSafeUrl(url)) return errorJson('Please provide a valid https://, http://, mailto: or tel: link.');

  await env.DB.prepare(`
    UPDATE links SET type=?, title=?, url=?, description=?, thumbnail=?, enabled=? WHERE id=? AND user_id=?
  `).bind(
    LINK_TYPES.includes(body.type) ? body.type : existing.type,
    body.title !== undefined ? clampStr(body.title, 60) : existing.title,
    url,
    body.description !== undefined ? clampStr(body.description, 80) : existing.description,
    body.thumbnail !== undefined ? clampStr(body.thumbnail, 500) : existing.thumbnail,
    body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled,
    linkId, user.id
  ).run();

  const updated = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(linkId).first();
  return json(updated);
}

async function handleDeleteLink(request, env, user, linkId) {
  const existing = await env.DB.prepare('SELECT id FROM links WHERE id = ? AND user_id = ?').bind(linkId, user.id).first();
  if (!existing) return errorJson('Link not found.', 404);
  await env.DB.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').bind(linkId, user.id).run();
  return json({ ok: true });
}

async function handleReorderLinks(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : [];
  // Ownership: only reorder links that actually belong to this user.
  const owned = await env.DB.prepare('SELECT id FROM links WHERE user_id = ?').bind(user.id).all();
  const ownedIds = new Set(owned.results.map(r => r.id));
  const statements = ids
    .filter(id => ownedIds.has(id))
    .map((id, index) => env.DB.prepare('UPDATE links SET sort_order = ? WHERE id = ? AND user_id = ?').bind(index, id, user.id));
  if (statements.length) await env.DB.batch(statements);
  const { results } = await env.DB.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY sort_order ASC').bind(user.id).all();
  return json(results);
}

// ---------------------------------------------------------------
// Direct media upload — Supabase Storage-backed.
// The browser sends the file to this Worker; the Worker uploads it to
// Supabase Storage using server-side secrets. The secret key never reaches
// the browser.
// Required Worker secrets/vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_BUCKET (optional; defaults to "mochimo-images")
// ---------------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED_MEDIA_TYPES = {
  'image/jpeg': { ext: 'jpg', type: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/png': { ext: 'png', type: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/webp': { ext: 'webp', type: 'image', maxBytes: MAX_IMAGE_BYTES },
  'image/gif': { ext: 'gif', type: 'image', maxBytes: MAX_IMAGE_BYTES },
  'video/mp4': { ext: 'mp4', type: 'video', maxBytes: MAX_VIDEO_BYTES },
  'video/webm': { ext: 'webm', type: 'video', maxBytes: MAX_VIDEO_BYTES },
};

function getSupabaseConfig(env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  const bucket = String(env.SUPABASE_BUCKET || 'mochimo-images');
  if (!url || !key) return null;
  return { url, key, bucket };
}

async function handleUploadMedia(request, env, user) {
  const cfg = getSupabaseConfig(env);
  if (!cfg) return errorJson('Supabase media storage is not configured.', 500);

  let form;
  try { form = await request.formData(); } catch { return errorJson('Expected a file upload.'); }

  const file = form.get('file');
  if (!(file instanceof File)) return errorJson('No file was uploaded.');
  if (file.size === 0) return errorJson('That file is empty.');
  const media = ALLOWED_MEDIA_TYPES[file.type];
  if (!media) return errorJson('Please upload a JPG, PNG, WEBP, GIF, MP4 or WebM file.');
  if (file.size > media.maxBytes) {
    return errorJson(media.type === 'video' ? 'Reels must be 30MB or smaller.' : 'Images must be 5MB or smaller.');
  }

  const key = `u/${user.id}/${crypto.randomUUID()}.${media.ext}`;
  const uploadUrl = `${cfg.url}/storage/v1/object/${cfg.bucket}/${key}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.key}`,
      'apikey': cfg.key,
      'Content-Type': file.type,
      'Cache-Control': '31536000',
      'x-upsert': 'false',
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Supabase upload failed:', response.status, detail);
    return errorJson('Media upload failed. Check your Supabase Storage bucket configuration.', 502);
  }

  const publicUrl = `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${key}`;
  return json({ url: publicUrl, key, type: media.type, contentType: file.type, size: file.size });
}

const GALLERY_CATEGORIES = ['Weddings', 'Portraits', 'Events', 'Lifestyle', ''];

function sanitizeGallery(input, fallbackJson) {
  if (!Array.isArray(input)) return fallbackJson;
  const cleaned = input
    .filter(item => item && isSafeUrl(item.url))
    .slice(0, 24)
    .map(item => ({
      url: clampStr(item.url, 500),
      caption: clampStr(item.caption, 80),
      type: item.type === 'video' ? 'video' : 'image',
      category: GALLERY_CATEGORIES.includes(item.category) ? item.category : '',
    }));
  return JSON.stringify(cleaned);
}

async function handleUpdateAppearance(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const current = await env.DB.prepare('SELECT * FROM appearance WHERE user_id = ?').bind(user.id).first();
  const effects = body.effects || {};
  const galleryJson = body.photographerGallery !== undefined
    ? sanitizeGallery(body.photographerGallery, current.photographer_gallery_json)
    : current.photographer_gallery_json;

  // Hero banner media is independent from the Featured Work gallery (see
  // migration 0004) so it never doubles up inside the reels/photos slider.
  const heroMedia = body.heroMedia;
  const heroMediaUrl = heroMedia !== undefined
    ? (heroMedia && isSafeUrl(heroMedia.url) ? clampStr(heroMedia.url, 500) : '')
    : current.hero_media_url;
  const heroMediaType = heroMedia !== undefined
    ? (heroMedia?.type === 'video' ? 'video' : 'image')
    : current.hero_media_type;

  await env.DB.prepare(`
    UPDATE appearance SET theme=?, button_style=?, layout=?, font=?, background=?, custom_bg=?, accent_color=?,
      fx_shadows=?, fx_borders=?, fx_bg_shapes=?, fx_animations=?, photographer_gallery_json=?,
      hero_media_url=?, hero_media_type=? WHERE user_id=?
  `).bind(
    THEMES.includes(body.theme) ? body.theme : current.theme,
    BUTTON_STYLES.includes(body.buttonStyle) ? body.buttonStyle : current.button_style,
    LAYOUTS.includes(body.layout) ? body.layout : current.layout,
    clampStr(body.font ?? current.font, 30),
    clampStr(body.background ?? current.background, 20),
    clampStr(body.customBg ?? current.custom_bg, 20),
    clampStr(body.accentColor ?? current.accent_color, 20),
    effects.shadows !== undefined ? (effects.shadows ? 1 : 0) : current.fx_shadows,
    effects.borders !== undefined ? (effects.borders ? 1 : 0) : current.fx_borders,
    effects.bgShapes !== undefined ? (effects.bgShapes ? 1 : 0) : current.fx_bg_shapes,
    effects.animations !== undefined ? (effects.animations ? 1 : 0) : current.fx_animations,
    galleryJson,
    heroMediaUrl,
    heroMediaType,
    user.id
  ).run();
  const updated = await env.DB.prepare('SELECT * FROM appearance WHERE user_id = ?').bind(user.id).first();
  return json(updated);
}

async function handleUpdateSettings(request, env, user) {
  await ensureDefaultRows(env, user.id);
  const body = await request.json().catch(() => ({}));
  const current = await env.DB.prepare('SELECT * FROM settings WHERE user_id = ?').bind(user.id).first();
  const notif = body.notifications || {};
  await env.DB.prepare(`
    UPDATE settings SET notif_email=?, notif_product=?, language=?, search_visible=?, save_contact_enabled=? WHERE user_id=?
  `).bind(
    notif.email !== undefined ? (notif.email ? 1 : 0) : current.notif_email,
    notif.product !== undefined ? (notif.product ? 1 : 0) : current.notif_product,
    clampStr(body.language ?? current.language, 10),
    body.searchVisible !== undefined ? (body.searchVisible ? 1 : 0) : current.search_visible,
    body.saveContactEnabled !== undefined ? (body.saveContactEnabled ? 1 : 0) : (current.save_contact_enabled ?? 1),
    user.id
  ).run();
  const updated = await env.DB.prepare('SELECT * FROM settings WHERE user_id = ?').bind(user.id).first();
  return json(updated);
}

async function handleDeleteAccount(request, env, user) {
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run(); // cascades via FK
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie({ secure: isSecureRequest(request) }) } });
}

// Public: record a real event against a username. No auth — visitors aren't
// logged in — but strictly typed and rate-limit-worthy (see README).
async function handleRecordEvent(request, env) {
  const body = await request.json().catch(() => ({}));
  const username = clampStr(body.username, 20).trim().toLowerCase();
  const type = body.type;
  if (!EVENT_TYPES.includes(type)) return errorJson('Invalid event type.');
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (!user) return errorJson('Profile not found.', 404);

  let linkId = null;
  if (type === 'click' && body.linkId) {
    const link = await env.DB.prepare('SELECT id FROM links WHERE id = ? AND user_id = ?').bind(body.linkId, user.id).first();
    if (link) {
      linkId = link.id;
      await env.DB.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?').bind(linkId).run();
    }
  }

  await env.DB.prepare(`
    INSERT INTO events (id, user_id, type, link_id, visitor_id, source, device, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), user.id, type, linkId, clampStr(body.visitorId, 100), clampStr(body.source, 30), clampStr(body.device, 20), Date.now()).run();

  return json({ ok: true });
}

async function handleGetAnalytics(request, env, user) {
  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '7d';
  const days = { '7d': 7, '30d': 30, '90d': 90, all: 36500 }[range] ?? 7;
  const since = Date.now() - days * 86400000;
  const prevSince = since - days * 86400000;

  const countType = async (type, fromTs, toTs) => {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM events WHERE user_id = ? AND type = ? AND created_at >= ? AND created_at < ?'
    ).bind(user.id, type, fromTs, toTs).first();
    return row.c;
  };

  const now = Date.now() + 1;
  const [views, clicks, nfcTaps, qrScans, prevViews, prevClicks] = await Promise.all([
    countType('view', since, now), countType('click', since, now),
    countType('nfc_tap', since, now), countType('qr_scan', since, now),
    countType('view', prevSince, since), countType('click', prevSince, since),
  ]);
  const ctr = views > 0 ? (clicks / views) * 100 : 0;
  const delta = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

  const uniqueRow = await env.DB.prepare(
    'SELECT COUNT(DISTINCT visitor_id) as c FROM events WHERE user_id = ? AND type = "view" AND created_at >= ?'
  ).bind(user.id, since).first();

  const { results: series } = await env.DB.prepare(`
    SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') as day,
      SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) as clicks,
      SUM(CASE WHEN type='nfc_tap' THEN 1 ELSE 0 END) as nfc_tap,
      SUM(CASE WHEN type='qr_scan' THEN 1 ELSE 0 END) as qr_scan
    FROM events WHERE user_id = ? AND created_at >= ?
    GROUP BY day ORDER BY day ASC
  `).bind(user.id, since).all();

  const { results: topLinks } = await env.DB.prepare(`
    SELECT l.id, l.title, COUNT(e.id) as periodClicks
    FROM links l JOIN events e ON e.link_id = l.id AND e.created_at >= ?
    WHERE l.user_id = ? GROUP BY l.id ORDER BY periodClicks DESC LIMIT 5
  `).bind(since, user.id).all();

  const { results: sourcesRows } = await env.DB.prepare(
    `SELECT source, COUNT(*) as c FROM events WHERE user_id=? AND created_at >= ? AND source IS NOT NULL AND source != '' GROUP BY source`
  ).bind(user.id, since).all();
  const { results: deviceRows } = await env.DB.prepare(
    `SELECT device, COUNT(*) as c FROM events WHERE user_id=? AND created_at >= ? AND device IS NOT NULL AND device != '' GROUP BY device`
  ).bind(user.id, since).all();

  const totalEventsRow = await env.DB.prepare('SELECT COUNT(*) as c FROM events WHERE user_id = ?').bind(user.id).first();

  return json({
    range, views, clicks, ctr, nfcTaps, qrScans,
    uniqueVisitors: uniqueRow.c,
    deltas: { views: delta(views, prevViews), clicks: delta(clicks, prevClicks) },
    series, topLinks,
    sources: Object.fromEntries(sourcesRows.map(r => [r.source, r.c])),
    devices: Object.fromEntries(deviceRows.map(r => [r.device, r.c])),
    hasAnyData: totalEventsRow.c > 0,
  });
}

async function handlePublicProfile(request, env, username) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username.toLowerCase()).first();
  if (!user) return errorJson('Profile not found.', 404);
  const [{ results: links }, appearance, settings] = await Promise.all([
    env.DB.prepare('SELECT * FROM links WHERE user_id = ? AND enabled = 1 ORDER BY sort_order ASC').bind(user.id).all(),
    env.DB.prepare('SELECT * FROM appearance WHERE user_id = ?').bind(user.id).first(),
    env.DB.prepare('SELECT * FROM settings WHERE user_id = ?').bind(user.id).first(),
  ]);
  return json({
    profile: {
      name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatar_url,
      website: user.website, email: user.email, phone: user.phone, location: user.location,
      socials: {
        instagram: user.social_instagram, youtube: user.social_youtube, tiktok: user.social_tiktok,
        x: user.social_x, linkedin: user.social_linkedin, facebook: user.social_facebook,
      },
    },
    links,
    appearance,
    settings: { save_contact_enabled: settings?.save_contact_enabled ?? 1 },
  });
}

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ---- public, unauthenticated routes ----
      if (method === 'POST' && path === '/api/auth/signup') return await handleSignup(request, env);
      if (method === 'POST' && path === '/api/auth/login') return await handleLogin(request, env);
      if (method === 'POST' && path === '/api/auth/logout') return await handleLogout(request, env);
      if (method === 'GET' && path === '/api/me') return await handleMe(request, env);
      if (method === 'POST' && path === '/api/events') return await handleRecordEvent(request, env);

      const publicMatch = path.match(/^\/api\/public\/([a-z0-9_]{3,20})$/i);
      if (method === 'GET' && publicMatch) return await handlePublicProfile(request, env, publicMatch[1]);

      // Friendly redirects for the human-facing routes -> static pages that
      // call /api/public/:username. (Static assets served via Cloudflare
      // Pages or Workers Assets — see README for hosting topology.)
      const uMatch = path.match(/^\/u\/([a-z0-9_]{3,20})$/i);
      if (method === 'GET' && uMatch) return Response.redirect(`${url.origin}/u.html?u=${uMatch[1]}`, 302);
      const nMatch = path.match(/^\/n\/([a-z0-9_]{3,20})$/i);
      if (method === 'GET' && nMatch) return Response.redirect(`${url.origin}/n.html?u=${nMatch[1]}`, 302);
      const qMatch = path.match(/^\/q\/([a-z0-9_]{3,20})$/i);
      if (method === 'GET' && qMatch) return Response.redirect(`${url.origin}/q.html?u=${qMatch[1]}`, 302);

      // Uploaded images are public once uploaded (they're embedded in public
      // profiles), so this is served without auth — same as static assets.
      const imgMatch = path.match(/^\/img\/(u\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp|gif))$/);
      if (method === 'GET' && imgMatch) return await handleServeImage(request, env, imgMatch[1]);

      // ---- everything below requires a valid session ----
      const user = await getSessionUser(request, env);
      if (!user) return errorJson('Not authenticated.', 401);

      if (method === 'GET' && path === '/api/profile') return await handleGetProfile(request, env, user);
      if (method === 'PATCH' && path === '/api/profile') return await handleUpdateProfile(request, env, user);
      if (method === 'GET' && path === '/api/appearance') return await handleGetAppearance(request, env, user);
      if (method === 'GET' && path === '/api/settings') return await handleGetSettings(request, env, user);
      if (method === 'GET' && path === '/api/events/recent') return await handleGetRecentEvents(request, env, user);
      if (method === 'GET' && path === '/api/links') return await handleListLinks(request, env, user);
      if (method === 'POST' && path === '/api/links') return await handleCreateLink(request, env, user);
      if (method === 'PATCH' && path === '/api/links/reorder') return await handleReorderLinks(request, env, user);
      const linkMatch = path.match(/^\/api\/links\/([a-zA-Z0-9_-]+)$/);
      if (linkMatch && method === 'PATCH') return await handleUpdateLink(request, env, user, linkMatch[1]);
      if (linkMatch && method === 'DELETE') return await handleDeleteLink(request, env, user, linkMatch[1]);
      if (method === 'PATCH' && path === '/api/appearance') return await handleUpdateAppearance(request, env, user);
      if (method === 'POST' && path === '/api/upload') return await handleUploadMedia(request, env, user);
      if (method === 'PATCH' && path === '/api/settings') return await handleUpdateSettings(request, env, user);
      if (method === 'DELETE' && path === '/api/account') return await handleDeleteAccount(request, env, user);
      if (method === 'GET' && path === '/api/analytics') return await handleGetAnalytics(request, env, user);
      if (method === 'GET' && path === '/api/dashboard') return await handleGetAnalytics(request, env, user);

      // Same-origin static frontend: dashboard and public profile pages.
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return errorJson('Not found.', 404);
    } catch (err) {
      console.error(err);
      return errorJson('Something went wrong.', 500);
    }
  },
};
