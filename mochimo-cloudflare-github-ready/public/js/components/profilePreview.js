import { icon } from '../lib/icons.js';
import { escapeHTML, initials } from '../lib/utils.js';

const SOCIAL_ICON = { instagram: 'instagram', youtube: 'youtube', tiktok: 'tiktok', x: 'x', linkedin: 'linkedin' };
const LINK_TYPE_ICON = {
  social: 'link', website: 'globe', whatsapp: 'whatsapp', email: 'mail', phone: 'phone',
  custom: 'link', product: 'store', music: 'music', video: 'video', booking: 'calendar',
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

  const activeSocials = Object.entries(profile.socials || {}).filter(([, v]) => v && v.trim());
  const activeLinks = (links || []).filter(l => l.enabled);

  const avatarInner = profile.avatarUrl
    ? `style="background-image:url('${escapeHTML(profile.avatarUrl)}')"`
    : '';

  screen.innerHTML = `
    <div class="pv-avatar" ${avatarInner}>${profile.avatarUrl ? '' : escapeHTML(initials(profile.name))}</div>
    <p class="pv-name">${escapeHTML(profile.name || 'Your Name')}</p>
    <p class="pv-handle">@${escapeHTML(profile.username || 'username')}</p>
    ${profile.bio ? `<p class="pv-bio">${escapeHTML(profile.bio)}</p>` : ''}

    ${activeSocials.length ? `
      <div class="pv-socials">
        ${activeSocials.map(([key]) => `
          <span class="pv-social-icon" aria-label="${escapeHTML(key)}">${icon(SOCIAL_ICON[key] || 'link', { size: 14 })}</span>
        `).join('')}
      </div>
    ` : ''}

    <div class="pv-links">
      ${activeLinks.length
        ? activeLinks.map(l => `
          <div class="pv-link">
            <span aria-hidden="true">${icon(LINK_TYPE_ICON[l.type] || 'link', { size: 15 })}</span>
            <span class="pv-link-label">${escapeHTML(l.title || 'Untitled link')}</span>
          </div>
        `).join('')
        : '<p class="pv-empty-links">Your links will appear here.</p>'}
    </div>

    <p class="pv-footer">Powered by Mochimo</p>
  `;
}

export { renderProfilePreview };
