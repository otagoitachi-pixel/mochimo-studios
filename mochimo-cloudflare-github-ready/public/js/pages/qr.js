import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, copyToClipboard, timeAgo } from '../lib/utils.js';
import { toast } from '../lib/toast.js';

function qrUrl(username) { return `${location.origin}/q/${username}`; }

async function renderQrPage(root, { profile }) {
  const url = qrUrl(profile.username);
  const settings = { fg: '#221F35', bg: '#FBF6EF', size: 240, logo: true };

  root.innerHTML = `
    <div class="page-header">
      <div><h1 class="font-display">QR Code</h1><p>A quick scan opens your Mochimo profile.</p></div>
    </div>

    <div class="editor-grid">
      <div style="display:flex;flex-direction:column;gap:1.5rem;min-width:0;">
        <div class="card card-pad">
          <p class="section-label">Customize</p>
          <div class="field-row cols-2">
            <div class="field">
              <label for="qrFg">Foreground</label>
              <input type="color" id="qrFg" value="${settings.fg}" style="height:40px;width:100%;border-radius:var(--r-md);border:1px solid var(--border-strong);cursor:pointer;">
            </div>
            <div class="field">
              <label for="qrBg">Background</label>
              <input type="color" id="qrBg" value="${settings.bg}" style="height:40px;width:100%;border-radius:var(--r-md);border:1px solid var(--border-strong);cursor:pointer;">
            </div>
          </div>
          <div class="field" style="margin-top:1rem;">
            <label for="qrSize">Size <span id="qrSizeLabel" class="text-muted" style="font-weight:400;">${settings.size}px</span></label>
            <input type="range" id="qrSize" min="160" max="400" step="20" value="${settings.size}">
          </div>
          <label class="checkbox-row" style="margin-top:1rem;">
            <input type="checkbox" id="qrLogo" checked> Show Mochimo mark in center
          </label>
        </div>

        <div class="card card-pad">
          <p class="section-label">QR performance</p>
          <div id="qrStatsHolder" class="stat-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));"></div>
        </div>
      </div>

      <div class="preview-rail">
        <div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;gap:1rem;">
          <div id="qrCanvasHolder" style="display:flex;align-items:center;justify-content:center;min-height:160px;"></div>
          <p style="margin:0;font-weight:600;">@${profile.username}</p>
          <div class="flex gap-2" style="flex-wrap:wrap;justify-content:center;">
            <button type="button" class="btn btn-secondary btn-sm" id="dlPngBtn">${icon('download', { size: 14 })} PNG</button>
            <button type="button" class="btn btn-secondary btn-sm" id="dlSvgBtn">${icon('download', { size: 14 })} SVG</button>
            <button type="button" class="btn btn-secondary btn-sm" id="copyQrLinkBtn">${icon('copy', { size: 14 })} Copy link</button>
            <button type="button" class="btn btn-secondary btn-sm" id="shareQrBtn">${icon('share', { size: 14 })} Share</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasHolder = root.querySelector('#qrCanvasHolder');

  async function paintQr() {
    canvasHolder.innerHTML = '';
    if (typeof window.QRCode === 'undefined') {
      canvasHolder.innerHTML = `<p class="text-muted" style="font-size:0.8rem;text-align:center;">QR library failed to load — check your internet connection.</p>`;
      return;
    }
    const canvas = document.createElement('canvas');
    canvasHolder.appendChild(canvas);
    await window.QRCode.toCanvas(canvas, url, {
      width: settings.size,
      margin: 2,
      color: { dark: settings.fg, light: settings.bg },
    });
    canvas.style.borderRadius = '1rem';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';

    if (settings.logo) {
      const ctx = canvas.getContext('2d');
      const logoSize = canvas.width * 0.22;
      const cx = (canvas.width - logoSize) / 2;
      const cy = (canvas.height - logoSize) / 2;
      ctx.fillStyle = settings.bg;
      ctx.beginPath();
      ctx.roundRect(cx - 6, cy - 6, logoSize + 12, logoSize + 12, 12);
      ctx.fill();
      ctx.font = `${Math.floor(logoSize * 0.7)}px serif`;
      ctx.fillStyle = settings.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐾', canvas.width / 2, canvas.height / 2);
    }
  }

  root.querySelector('#qrFg').addEventListener('input', (e) => { settings.fg = e.target.value; paintQr(); });
  root.querySelector('#qrBg').addEventListener('input', (e) => { settings.bg = e.target.value; paintQr(); });
  root.querySelector('#qrSize').addEventListener('input', (e) => {
    settings.size = Number(e.target.value);
    root.querySelector('#qrSizeLabel').textContent = `${settings.size}px`;
    paintQr();
  });
  root.querySelector('#qrLogo').addEventListener('change', (e) => { settings.logo = e.target.checked; paintQr(); });

  root.querySelector('#dlPngBtn').addEventListener('click', () => {
    const canvas = canvasHolder.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `mochimo-${profile.username}-qr.png`;
    a.click();
  });

  root.querySelector('#dlSvgBtn').addEventListener('click', async () => {
    if (typeof window.QRCode === 'undefined') return;
    const svgString = await window.QRCode.toString(url, { type: 'svg', margin: 2, color: { dark: settings.fg, light: settings.bg } });
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mochimo-${profile.username}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  async function copyLink() {
    const ok = await copyToClipboard(url);
    toast(ok ? 'QR link copied.' : 'Could not copy — copy it manually.', { type: ok ? 'success' : 'error' });
  }
  root.querySelector('#copyQrLinkBtn').addEventListener('click', copyLink);
  root.querySelector('#shareQrBtn').addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: `${profile.name} on Mochimo`, url }); } catch {} }
    else copyLink();
  });

  const data = await api.getAnalytics('30d');
  const statsHolder = root.querySelector('#qrStatsHolder');
  if (data.qrScans === 0) {
    statsHolder.innerHTML = `
      <div class="card empty-state" style="grid-column:1/-1;padding:1.5rem 1rem;">
        <span class="empty-icon">${icon('qrcode', { size: 20 })}</span>
        <h3>No scans yet</h3>
        <p>Print or share your QR — scans will appear here in real time.</p>
      </div>`;
  } else {
    const lastScan = (await api.getRecentEvents(50)).find(e => e.type === 'qr_scan');
    statsHolder.innerHTML = `
      <div class="card stat-card"><p class="stat-label">QR Scans</p><p class="stat-value">${formatNumber(data.qrScans)}</p></div>
      <div class="card stat-card"><p class="stat-label">Unique Scans</p><p class="stat-value">${formatNumber(data.uniqueVisitors)}</p></div>
      <div class="card stat-card"><p class="stat-label">Last Scan</p><p class="stat-value" style="font-size:1.1rem;">${lastScan ? timeAgo(lastScan.ts) : '—'}</p></div>
    `;
  }

  paintQr();
}

export { renderQrPage };
