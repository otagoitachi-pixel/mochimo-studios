// Mochimo production API client — Cloudflare Worker + D1.
// All persistent data lives on the server. No localStorage database.

class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function request(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong.', res.status);
  return data;
}

const mapAppearance = (a) => a ? ({
  theme: a.theme, buttonStyle: a.button_style, layout: a.layout, font: a.font,
  background: a.background, customBg: a.custom_bg, accentColor: a.accent_color,
  effects: { shadows: !!a.fx_shadows, borders: !!a.fx_borders, bgShapes: !!a.fx_bg_shapes, animations: !!a.fx_animations }
}) : null;

const mapSettings = (s) => s ? ({
  notifications: { email: !!s.notif_email, product: !!s.notif_product },
  language: s.language, searchVisible: !!s.search_visible
}) : null;

const mapProfile = (u) => u ? ({
  avatarUrl: u.avatar_url ?? u.avatarUrl ?? '', name: u.name || '', username: u.username || '',
  bio: u.bio || '', location: u.location || '', website: u.website || '', email: u.email || '', phone: u.phone || '',
  socials: {
    instagram: u.social_instagram ?? u.socials?.instagram ?? '',
    youtube: u.social_youtube ?? u.socials?.youtube ?? '',
    tiktok: u.social_tiktok ?? u.socials?.tiktok ?? '',
    x: u.social_x ?? u.socials?.x ?? '',
    linkedin: u.social_linkedin ?? u.socials?.linkedin ?? ''
  }
}) : null;

const mapLink = (l) => l ? ({
  id: l.id, type: l.type, title: l.title, url: l.url, description: l.description || '',
  thumbnail: l.thumbnail || '', enabled: !!l.enabled, clicks: Number(l.clicks || 0),
  createdAt: l.created_at ?? l.createdAt
}) : l;

const mapEvent = (e) => ({
  type: e.type, ts: e.created_at ?? e.ts,
  meta: { visitorId: e.visitor_id || '', source: e.source || '', device: e.device || '', linkId: e.link_id || '' }
});

class MochimoAPI {
  async signup(data) { return request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }); }
  async login(data) { return request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }); }
  async logout() { return request('/api/auth/logout', { method: 'POST' }); }
  async me() { return request('/api/me'); }

  async getProfile() { return mapProfile(await request('/api/profile')); }
  async updateProfile(patch) {
    const body = { ...patch, avatar_url: patch.avatarUrl, socials: patch.socials };
    delete body.avatarUrl;
    return mapProfile(await request('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }));
  }

  async listLinks() { return (await request('/api/links')).map(mapLink); }
  async createLink(data) { return mapLink(await request('/api/links', { method: 'POST', body: JSON.stringify(data) })); }
  async updateLink(id, patch) { return mapLink(await request(`/api/links/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })); }
  async deleteLink(id) { return request(`/api/links/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  async reorderLinks(ids) { return (await request('/api/links/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) })).map(mapLink); }

  async getAppearance() { return mapAppearance(await request('/api/appearance')); }
  async updateAppearance(patch) { return mapAppearance(await request('/api/appearance', { method: 'PATCH', body: JSON.stringify(patch) })); }

  async getSettings() { return mapSettings(await request('/api/settings')); }
  async updateSettings(patch) { return mapSettings(await request('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) })); }
  async deleteAccount() { return request('/api/account', { method: 'DELETE' }); }

  async getPublicAccount(username) {
    try {
      const data = await request(`/api/public/${encodeURIComponent(username)}`);
      return { profile: mapProfile(data.profile), links: (data.links || []).map(mapLink), appearance: mapAppearance(data.appearance) };
    } catch (e) { if (e.status === 404) return null; throw e; }
  }

  async recordEvent(username, type, meta = {}) {
    return request('/api/events', { method: 'POST', body: JSON.stringify({ username, type, ...meta }) });
  }
  async getRecentEvents(limit = 8) { return (await request(`/api/events/recent?limit=${Math.max(1, Math.min(50, limit))}`)).map(mapEvent); }
  async getDashboard() { return request('/api/dashboard'); }
  async getAnalytics(range = '7d') { return request(`/api/analytics?range=${encodeURIComponent(range)}`); }
}

export const api = new MochimoAPI();
export { ApiError };
