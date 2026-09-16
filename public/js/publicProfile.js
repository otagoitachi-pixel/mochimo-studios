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

  root.innerHTML = `
    <div class="public-wrap">
      <div class="public-header">
        <div class="ph-logo"><img src="img/logo.webp" alt="Mochimo Studios"></div>
        <div class="ph-tagline">Connect<br>Share<br>Grow</div>
      </div>
      <div class="phone-frame public-frame"><div class="phone-screen" id="publicPreview"></div></div>
      <div class="public-actions">
        <button type="button" class="btn btn-primary btn-sm" id="saveContactBtn">${icon('user', { size: 14 })} Save Contact</button>
        <button type="button" class="btn btn-secondary btn-sm" id="shareProfileBtn">${icon('share', { size: 14 })} Share Profile</button>
      </div>
    </div>
  `;

  const frame = root.querySelector('#publicPreview').closest('.phone-frame');
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
