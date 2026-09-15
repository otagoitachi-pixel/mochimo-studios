import { api } from './lib/api.js';
import { renderProfilePreview } from './components/profilePreview.js';
import { icon } from './lib/icons.js';
import { isSafeUrl } from './lib/utils.js';

// entryType: 'view' | 'qr_scan' | 'nfc_tap' — the event logged on load.
// A qr/nfc visit also logs a plain profile view, mirroring a real visit.
async function boot(entryType) {
  const params = new URLSearchParams(location.search);
  const username = (params.get('u') || '').trim().toLowerCase();
  const root = document.getElementById('publicRoot');

  if (!username) {
    root.innerHTML = notFoundHTML('No profile specified.');
    return;
  }

  const account = await api.getPublicAccount(username);
  if (!account) {
    root.innerHTML = notFoundHTML(`We couldn't find a Mochimo profile for "${username}".`);
    return;
  }

  document.title = `${account.profile.name} (@${account.profile.username}) — Mochimo`;

  // Real event logging — never fabricated, only what actually happened.
  const visitorId = getOrCreateVisitorId();
  const device = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  if (entryType !== 'view') await api.recordEvent(username, entryType, { visitorId, device });
  await api.recordEvent(username, 'view', { visitorId, device, source: entryType === 'qr_scan' ? 'QR' : entryType === 'nfc_tap' ? 'NFC' : 'Direct' });

  // Public profile presentation is intentionally separate from the dashboard
  // preview so the dashboard UI remains unchanged.
  root.innerHTML = `
    <main class="mp-public-page">
      <header class="mp-brandbar" aria-label="Mochimo">
        <a class="mp-brand" href="/" aria-label="Mochimo home">
          <span class="mp-brand-cat">${icon('cat', { size: 42 })}</span>
          <span>Mochimo</span>
        </a>
        <div class="mp-brand-tagline" aria-hidden="true">
          <span>CONNECT</span>
          <span>SHARE</span>
          <span>GROW</span>
          <i></i>
        </div>
      </header>

      <section class="mp-profile-shell" aria-label="${escapeHTML(account.profile.name || 'Mochimo profile')}">
        <div class="mp-profile-art">
          <div class="mp-art-copy">
            <span>CREATOR</span>
            <span>ACTOR</span>
            <span>STORYTELLER</span>
            <i></i>
          </div>
          <div class="mp-script">Good<br>People<br>Better<br>Stories</div>
          <div class="mp-wave mp-wave-one"></div>
          <div class="mp-wave mp-wave-two"></div>
        </div>

        <div class="mp-profile-content">
          <div class="mp-avatar-wrap">
            <div class="mp-avatar" id="publicAvatar"></div>
            ${account.profile.verified ? `<span class="mp-verified" aria-label="Verified">${icon('check', { size: 18 })}</span>` : ''}
          </div>

          <h1 class="mp-name">${escapeHTML(account.profile.name || 'Your Name')}</h1>
          <p class="mp-handle">@${escapeHTML(account.profile.username || 'username')}</p>

          ${account.profile.bio ? `<p class="mp-bio">${escapeHTML(account.profile.bio)}</p>` : `<p class="mp-bio mp-bio-default">People. Stories. A Better Tomorrow.</p>`}

          <div class="mp-links" id="publicLinks">
            ${renderPublicLinks(account.links, account.profile.socials)}
          </div>

          <div class="mp-card-actions">
            <button type="button" class="mp-action mp-action-primary" id="saveContactBtn">
              ${icon('user', { size: 23 })}<span>Save Contact</span>
            </button>
            <button type="button" class="mp-action mp-action-secondary" id="shareProfileBtn">
              ${icon('share', { size: 23 })}<span>Share Profile</span>
            </button>
          </div>

          <div class="mp-powered">Powered by <strong>Mochimo</strong></div>
          <div class="mp-motto">ONE TAP. MORE POSSIBILITIES.</div>
        </div>
      </section>
    </main>
  `;

  const avatar = root.querySelector('#publicAvatar');
  if (account.profile.avatarUrl) {
    avatar.style.backgroundImage = `url('${escapeHTML(account.profile.avatarUrl)}')`;
    avatar.classList.add('has-image');
  } else {
    avatar.textContent = initials(account.profile.name);
  }

  const frame = root.querySelector('.mp-profile-shell');

  // Wire real link clicks: validate scheme, log a click event, then navigate.
  frame.querySelectorAll('.pv-link').forEach((el, i) => {
    const link = account.links.filter(l => l.enabled)[i];
    if (!link) return;
    el.style.cursor = 'pointer';
    el.setAttribute('role', 'link');
    el.setAttribute('tabindex', '0');
    const go = async () => {
      if (!isSafeUrl(link.url)) return; // silently refuse unsafe schemes
      await api.recordEvent(username, 'click', { visitorId, linkId: link.id, device });
      window.open(link.url, '_blank', 'noopener,noreferrer');
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  root.querySelector('#saveContactBtn').addEventListener('click', () => downloadVCard(account.profile));
  root.querySelector('#shareProfileBtn').addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: account.profile.name, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); flashShared(); } catch {}
  });

  function flashShared() {
    const btn = root.querySelector('#shareProfileBtn');
    const original = btn.innerHTML;
    btn.innerHTML = `${icon('check', { size: 14 })} Copied`;
    setTimeout(() => { btn.innerHTML = original; }, 1600);
  }
}


function renderPublicLinks(links, socials) {
  const activeLinks = (links || []).filter(l => l.enabled);
  if (!activeLinks.length) {
    return '<p class="mp-empty">Your links will appear here.</p>';
  }

  const socialMeta = {
    instagram: { label: 'Instagram', sub: 'Follow my journey', icon: 'instagram' },
    whatsapp: { label: 'WhatsApp', sub: 'Let’s connect', icon: 'whatsapp' },
    tiktok: { label: 'TikTok', sub: 'Shorts & more', icon: 'tiktok' },
    youtube: { label: 'YouTube', sub: 'Videos & behind the scenes', icon: 'youtube' },
    x: { label: 'X (Twitter)', sub: 'Thoughts & updates', icon: 'x' },
    linkedin: { label: 'LinkedIn', sub: 'Let’s connect', icon: 'link' },
  };

  const socialKeys = new Set(Object.entries(socials || {}).filter(([, v]) => v && v.trim()).map(([k]) => k));

  return activeLinks.map(l => {
    const meta = socialMeta[l.type] || null;
    const title = meta?.label || l.title || 'More Links';
    const sub = meta?.sub || (l.type === 'website' ? 'Visit my website' : 'Tap to connect');
    const iconName = meta?.icon || ({
      website: 'globe', whatsapp: 'whatsapp', email: 'mail', phone: 'phone',
      product: 'store', music: 'music', video: 'video', booking: 'calendar'
    }[l.type] || 'link');
    const iconClass = `mp-icon-${l.type || 'custom'}`;

    return `
      <div class="mp-link-row pv-link" data-public-link-id="${escapeHTML(String(l.id ?? ''))}">
        <span class="mp-link-icon ${iconClass}" aria-hidden="true">${icon(iconName, { size: 30 })}</span>
        <span class="mp-link-copy">
          <strong>${escapeHTML(title)}</strong>
          <small>${escapeHTML(sub)}</small>
        </span>
        <span class="mp-link-arrow" aria-hidden="true">${icon('chevronDown', { size: 21 })}</span>
      </div>
    `;
  }).join('');
}

function getOrCreateVisitorId() {
  let id = localStorage.getItem('mochimo_visitor_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
    localStorage.setItem('mochimo_visitor_id', id);
  }
  return id;
}

function downloadVCard(profile) {
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${profile.name}`,
    profile.email ? `EMAIL:${profile.email}` : '',
    profile.phone ? `TEL:${profile.phone}` : '',
    profile.website ? `URL:${profile.website}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n');
  const blob = new Blob([lines], { type: 'text/vcard' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${profile.username}.vcf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function notFoundHTML(message) {
  return `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:1.5rem;text-align:center;">
      <div>
        <div style="margin-bottom:0.75rem;">${icon('cat', { size: 32 })}</div>
        <p style="font-family:'Fraunces',serif;font-style:italic;font-size:1.3rem;margin:0 0 0.5rem;">Profile not found</p>
        <p style="color:var(--text-muted);font-size:0.9rem;margin:0;">${message}</p>
      </div>
    </div>
  `;
}

export { boot };
