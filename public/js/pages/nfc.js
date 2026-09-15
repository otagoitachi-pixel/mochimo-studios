import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, copyToClipboard, timeAgo } from '../lib/utils.js';
import { toast } from '../lib/toast.js';

function nfcProfileUrl(username) { return `${location.origin}/n/${username}`; }

async function renderNfcPage(root, { profile }) {
  const url = nfcProfileUrl(profile.username);
  const nfcSupported = 'NDEFReader' in window;

  root.innerHTML = `
    <div class="page-header">
      <div><h1 class="font-display">Mochimo NFC</h1><p>Turn every tap into your digital identity.</p></div>
    </div>

    <div class="card card-pad" style="margin-bottom:1.5rem;">
      <p class="section-label" style="margin-bottom:0.4rem;">NFC profile URL</p>
      <div class="flex items-center gap-2">
        <input class="input" type="text" readonly value="${url}">
        <button type="button" class="btn-icon" id="copyNfcUrlBtn" aria-label="Copy NFC link">${icon('copy', { size: 15 })}</button>
      </div>
    </div>

    <div class="editor-grid" style="grid-template-columns:minmax(0,1fr);">
      <div class="card card-pad" style="display:flex;flex-direction:column;gap:1.25rem;align-items:flex-start;">
        <div class="flex items-center gap-3">
          <div style="height:64px;width:92px;border-radius:1rem;background:linear-gradient(135deg, var(--ink), var(--ink-2));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.2rem;color:var(--cream);flex-shrink:0;">
            ${icon('nfc', { size: 22 })}
            <span style="font-size:0.55rem;letter-spacing:0.1em;opacity:0.7;">MOCHIMO</span>
          </div>
          <div>
            <p style="margin:0;font-weight:700;font-size:1.05rem;">NFC Tap Profile</p>
            <span class="badge badge-active" style="margin-top:0.3rem;"><span class="badge-dot"></span>Ready to share</span>
          </div>
        </div>

        <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;line-height:1.5;max-width:38rem;">
          Anyone with an NFC-enabled phone can tap your card and open your Mochimo profile instantly — no app required.
        </p>

        <div class="flex gap-3" style="flex-wrap:wrap;">
          <button type="button" class="btn btn-accent" id="writeNfcBtn">${icon('nfc', { size: 15 })} Write NFC</button>
          <button type="button" class="btn btn-secondary" id="copyNfcBtn2">${icon('copy', { size: 15 })} Copy NFC link</button>
          <button type="button" class="btn btn-secondary" id="shareNfcBtn">${icon('share', { size: 15 })} Share NFC link</button>
        </div>

        <div id="nfcStatusArea" style="width:100%;"></div>
      </div>
    </div>

    <div class="card card-pad section-block">
      <p class="section-label">NFC performance</p>
      <div id="nfcStatsHolder" class="stat-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));"></div>
    </div>
  `;

  async function copyUrl() {
    const ok = await copyToClipboard(url);
    toast(ok ? 'NFC link copied.' : 'Could not copy — copy it manually.', { type: ok ? 'success' : 'error' });
  }
  root.querySelector('#copyNfcUrlBtn').addEventListener('click', copyUrl);
  root.querySelector('#copyNfcBtn2').addEventListener('click', copyUrl);
  root.querySelector('#shareNfcBtn').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${profile.name} on Mochimo`, url }); }
      catch { /* user cancelled share sheet — not an error */ }
    } else {
      copyUrl();
    }
  });

  const statusArea = root.querySelector('#nfcStatusArea');

  if (!nfcSupported) {
    statusArea.innerHTML = `
      <div class="card" style="background:var(--bg-surface-muted);padding:1rem 1.15rem;display:flex;gap:0.75rem;align-items:flex-start;">
        ${icon('alertCircle', { size: 18, class: 'text-muted' })}
        <p style="margin:0;font-size:0.83rem;color:var(--text-secondary);line-height:1.5;">
          Your current browser doesn't support writing to NFC tags directly (Web NFC currently only works in Chrome on Android, over HTTPS).
          You can still write your Mochimo NFC card manually using any NFC-writer app — just write this URL to the tag:
          <strong style="display:block;margin-top:0.4rem;word-break:break-all;">${url}</strong>
        </p>
      </div>
    `;
  } else {
    statusArea.innerHTML = `<p class="text-muted" style="font-size:0.8rem;">Your browser supports Web NFC. Tap "Write NFC" and hold a blank NFC tag to your device.</p>`;
  }

  root.querySelector('#writeNfcBtn').addEventListener('click', async () => {
    if (!nfcSupported) {
      toast('Web NFC isn\u2019t supported in this browser — use the manual URL above with an NFC-writer app.', { type: 'error', duration: 4500 });
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      await ndef.write({ records: [{ recordType: 'url', data: url }] });
      toast('NFC tag written successfully.', { type: 'success' });
    } catch (err) {
      // Genuinely surface what happened — never claim success on failure.
      toast(`Couldn't write to NFC tag: ${err.message || 'permission denied or no tag detected'}.`, { type: 'error', duration: 4500 });
    }
  });

  const data = await api.getAnalytics('30d');
  const statsHolder = root.querySelector('#nfcStatsHolder');
  if (data.nfcTaps === 0) {
    statsHolder.innerHTML = `
      <div class="card empty-state" style="grid-column:1/-1;padding:1.75rem 1rem;">
        <span class="empty-icon">${icon('nfc', { size: 22 })}</span>
        <h3>Make your next introduction one tap.</h3>
        <p>Once your Mochimo NFC card is tapped, taps and conversion will show up here.</p>
      </div>`;
  } else {
    const lastTap = (await api.getRecentEvents(50)).find(e => e.type === 'nfc_tap');
    statsHolder.innerHTML = `
      <div class="card stat-card"><p class="stat-label">NFC Taps</p><p class="stat-value">${formatNumber(data.nfcTaps)}</p></div>
      <div class="card stat-card"><p class="stat-label">Unique Taps</p><p class="stat-value">${formatNumber(data.uniqueVisitors)}</p></div>
      <div class="card stat-card"><p class="stat-label">Last Tap</p><p class="stat-value" style="font-size:1.1rem;">${lastTap ? timeAgo(lastTap.ts) : '—'}</p></div>
      <div class="card stat-card"><p class="stat-label">Tap Conversion</p><p class="stat-value">${data.clicks > 0 && data.nfcTaps > 0 ? Math.round((data.clicks / data.nfcTaps) * 100) + '%' : '—'}</p></div>
    `;
  }
}

export { renderNfcPage };
