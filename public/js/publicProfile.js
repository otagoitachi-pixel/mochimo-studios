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

  const isPhotographer = account.appearance?.theme === 'photographer';

  const showSaveContact = account.settings?.saveContactEnabled !== false;
  const saveContactButton = showSaveContact ? `<button type="button" class="btn btn-primary btn-sm" id="saveContactBtn">${icon('user', { size: 14 })} Save Contact</button>` : '';

  root.innerHTML = isPhotographer ? `
    <div class="mo-photo-page">
      <div id="publicPreview"></div>
      <div class="mo-photo-fixed-actions">
        ${saveContactButton}
        <button type="button" class="btn btn-secondary btn-sm" id="shareProfileBtn">${icon('share', { size: 14 })} Share Profile</button>
      </div>
    </div>
  ` : `
    <div class="public-wrap">
      <div class="public-header">
        <div class="ph-logo"><img src="img/logo.webp" alt="Mochimo Studios"></div>
        <div class="ph-tagline">Connect<br>Share<br>Grow</div>
      </div>
      <div class="phone-frame public-frame"><div class="phone-screen" id="publicPreview"></div></div>
      <div class="public-actions">
        ${saveContactButton}
        <button type="button" class="btn btn-secondary btn-sm" id="shareProfileBtn">${icon('share', { size: 14 })} Share Profile</button>
      </div>
    </div>
  `;

  const frame = isPhotographer
    ? root.querySelector('#publicPreview')
    : root.querySelector('#publicPreview').closest('.phone-frame');
  renderProfilePreview(frame, account);

  // Wire real link clicks: validate scheme, log a click event, then navigate.
  const wireRow = (el, url, linkId) => {
    if (!isSafeUrl(url)) return; // don't wire unsafe schemes at all
    el.style.cursor = 'pointer';
    el.setAttribute('role', 'link');
    el.setAttribute('tabindex', '0');
    const go = async () => {
      await api.recordEvent(username, 'click', { visitorId, linkId, device });
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  };

  // Quick-connect social rows (profile.socials — instagram/youtube/tiktok/x/linkedin).
  frame.querySelectorAll('.pv-link-social').forEach((el) => {
    const key = el.getAttribute('data-social-key');
    const url = account.profile.socials && account.profile.socials[key];
    if (!url) return;
    wireRow(el, url, `social:${key}`);
  });

  // Custom links (account.links, in the same enabled order they were rendered).
  frame.querySelectorAll('.pv-link-custom').forEach((el, i) => {
    const link = account.links.filter(l => l.enabled)[i];
    if (!link) return;
    wireRow(el, link.url, link.id);
  });

  // Photographer theme only: "View All" jumps to the same URL as whichever
  // enabled link the user has that looks like their portfolio link.
  const viewAllEl = frame.querySelector('[data-view-all-link]');
  if (viewAllEl) {
    const link = account.links.find(l => l.id === viewAllEl.dataset.viewAllLink);
    if (link && isSafeUrl(link.url)) {
      viewAllEl.style.cursor = 'pointer';
      viewAllEl.addEventListener('click', async () => {
        await api.recordEvent(username, 'click', { visitorId, linkId: link.id, device });
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });
    }
  }

  const saveContactBtn = root.querySelector('#saveContactBtn');
  if (saveContactBtn) saveContactBtn.addEventListener('click', () => downloadVCard(account.profile));
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

function getOrCreateVisitorId() {
  let id = localStorage.getItem('mochimo_visitor_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
    localStorage.setItem('mochimo_visitor_id', id);
  }
  return id;
}

function escapeVCard(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function downloadVCard(profile) {
  // Build a useful vCard instead of a minimal file that only contains a name.
  // Android/iOS contact apps can import this as a normal contact.
  const name = escapeVCard(profile.name || profile.username || 'Mochimo Contact');
  const username = escapeVCard(profile.username || '');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `N:${name};;;;`,
    profile.email ? `EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}` : '',
    profile.phone ? `TEL;TYPE=CELL:${escapeVCard(profile.phone)}` : '',
    profile.website ? `URL:${escapeVCard(profile.website)}` : '',
    profile.location ? `ADR;TYPE=WORK:;;${escapeVCard(profile.location)};;;;` : '',
    profile.bio ? `NOTE:${escapeVCard(profile.bio)}` : '',
    `X-MOCHIMO-USERNAME:${username}`,
    profile.socials?.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${escapeVCard(profile.socials.instagram)}` : '',
    profile.socials?.facebook ? `X-SOCIALPROFILE;TYPE=facebook:${escapeVCard(profile.socials.facebook)}` : '',
    profile.socials?.youtube ? `X-SOCIALPROFILE;TYPE=youtube:${escapeVCard(profile.socials.youtube)}` : '',
    profile.socials?.tiktok ? `X-SOCIALPROFILE;TYPE=tiktok:${escapeVCard(profile.socials.tiktok)}` : '',
    profile.socials?.x ? `X-SOCIALPROFILE;TYPE=x:${escapeVCard(profile.socials.x)}` : '',
    profile.socials?.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${escapeVCard(profile.socials.linkedin)}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\r\n') + '\r\n';

  const blob = new Blob([lines], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(profile.username || profile.name || 'contact').replace(/[^a-z0-9_-]/gi, '_')}.vcf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
