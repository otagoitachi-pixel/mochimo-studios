import { icon } from '../lib/icons.js';
import { escapeHTML, initials } from '../lib/utils.js';

// Fixed quick-connect socials (profile.socials keys) — always the same five platforms.
const SOCIAL_META = {
  instagram: { icon: 'instagram', label: 'Instagram', sub: 'Follow along', badge: 'pv-badge-instagram' },
  youtube:   { icon: 'youtube',   label: 'YouTube',   sub: 'Watch my videos', badge: 'pv-badge-youtube' },
  tiktok:    { icon: 'tiktok',    label: 'TikTok',    sub: 'Shorts & more', badge: 'pv-badge-tiktok' },
  x:         { icon: 'x',        label: 'X',          sub: 'Thoughts & updates', badge: 'pv-badge-x' },
  linkedin:  { icon: 'linkedin', label: 'LinkedIn',   sub: "Let's connect", badge: 'pv-badge-linkedin' },
};

// Custom links (account.links) — generic categories chosen by the user.
const LINK_TYPE_META = {
  social:   { icon: 'link',     badge: 'pv-badge-neutral' },
  website:  { icon: 'globe',    badge: 'pv-badge-lavender' },
  whatsapp: { icon: 'whatsapp', badge: 'pv-badge-whatsapp' },
  email:    { icon: 'mail',     badge: 'pv-badge-blush' },
  phone:    { icon: 'phone',    badge: 'pv-badge-blush' },
  custom:   { icon: 'link',     badge: 'pv-badge-neutral' },
  product:  { icon: 'store',    badge: 'pv-badge-rose' },
  music:    { icon: 'music',    badge: 'pv-badge-rose' },
  video:    { icon: 'video',    badge: 'pv-badge-rose' },
  booking:  { icon: 'calendar', badge: 'pv-badge-lavender' },
};

const THEME_BG = {
  mochimo: '#FBF6EF', minimal: '#FFFFFF', soft: '#FEFBF8', lavender: '#EAE3F8',
  blush: '#F6E1E6', dark: '#221F35',
};
const THEME_TEXT = { dark: '#FBF6EF' };
const THEME_TEXT_MUTED = { dark: 'rgba(251,246,239,0.7)' };

// Renders the phone-mockup preview into `container` from plain data.
// This exact function backs the dashboard preview AND is the same
// logic the public profile page (/u/:username) uses to render —
// there is only one rendering path, so what you see is what visitors see.
function renderProfilePreview(container, { profile, links, appearance }) {
  if (!container) return;
  const bg = appearance.background === 'custom' && appearance.customBg ? appearance.customBg : (THEME_BG[appearance.theme] || THEME_BG.mochimo);
  const textColor = THEME_TEXT[appearance.theme] || '#221F35';
  const textMuted = THEME_TEXT_MUTED[appearance.theme] || '#3A3654';

  const screen = container.querySelector('.phone-screen') || container;
  screen.style.setProperty('--profile-bg', bg);
  screen.style.setProperty('--profile-text', textColor);
  screen.style.setProperty('--profile-text-muted', textMuted);
  screen.className = `phone-screen pv-btn-${appearance.buttonStyle} pv-layout-${appearance.layout}`;

  const activeSocials = Object.entries(profile.socials || {})
    .filter(([k, v]) => v && v.trim() && (!profile.socialsVisible || profile.socialsVisible[k] !== false));
  const activeLinks = (links || []).filter(l => l.enabled);

  const avatarInner = profile.avatarUrl
    ? `style="background-image:url('${escapeHTML(profile.avatarUrl)}')"`
    : '';

  const chevron = `<span class="pv-link-chevron" aria-hidden="true">${icon('chevronDown', { size: 14 })}</span>`;

  const socialRows = activeSocials.map(([key]) => {
    const meta = SOCIAL_META[key] || { icon: 'link', label: key, sub: '', badge: 'pv-badge-neutral' };
    return `
      <div class="pv-link pv-link-social" data-social-key="${escapeHTML(key)}">
        <span class="pv-link-icon ${meta.badge}">${icon(meta.icon, { size: 16 })}</span>
        <span class="pv-link-text">
          <span class="pv-link-title">${escapeHTML(meta.label)}</span>
          ${meta.sub ? `<span class="pv-link-desc">${escapeHTML(meta.sub)}</span>` : ''}
        </span>
        ${chevron}
      </div>
    `;
  }).join('');

  const customRows = activeLinks.map(l => {
    const meta = LINK_TYPE_META[l.type] || LINK_TYPE_META.custom;
    return `
      <div class="pv-link pv-link-custom">
        <span class="pv-link-icon ${meta.badge}">${icon(meta.icon, { size: 16 })}</span>
        <span class="pv-link-text">
          <span class="pv-link-title">${escapeHTML(l.title || 'Untitled link')}</span>
          ${l.description ? `<span class="pv-link-desc">${escapeHTML(l.description)}</span>` : ''}
        </span>
        ${chevron}
      </div>
    `;
  }).join('');

  const hasRows = activeSocials.length || activeLinks.length;

  screen.innerHTML = `
    <div class="pv-avatar" ${avatarInner}>${profile.avatarUrl ? '' : escapeHTML(initials(profile.name))}</div>
    <p class="pv-name">${escapeHTML(profile.name || 'Your Name')}</p>
    <p class="pv-handle">@${escapeHTML(profile.username || 'username')}</p>
    ${profile.bio ? `<p class="pv-bio">${escapeHTML(profile.bio)}</p>` : ''}

    <div class="pv-links">
      ${hasRows ? socialRows + customRows : '<p class="pv-empty-links">Your links will appear here.</p>'}
    </div>

    <p class="pv-footer">Powered by Mochimo<span class="pv-footer-sub">One tap. More possibilities.</span></p>
  `;
}

export { renderProfilePreview };
