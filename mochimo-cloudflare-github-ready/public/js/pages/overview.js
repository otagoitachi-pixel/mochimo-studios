import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, formatPercent, timeAgo, copyToClipboard } from '../lib/utils.js';
import { toast } from '../lib/toast.js';
import { renderProfilePreview } from '../components/profilePreview.js';

function deltaHTML(value) {
  if (value === 0) return `<span class="stat-delta flat">${icon('arrowRight', { size: 11 })} No change</span>`;
  const up = value > 0;
  return `<span class="stat-delta ${up ? 'up' : 'down'}">${icon(up ? 'arrowUp' : 'arrowDown', { size: 11 })} ${Math.abs(value).toFixed(1)}% vs previous period</span>`;
}

function drawChart(container, series, metrics) {
  if (!series.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem;">
        <span class="empty-icon">${icon('chart', { size: 24 })}</span>
        <h3>No activity yet</h3>
        <p>Once people start viewing and tapping your profile, your performance will show up here.</p>
      </div>`;
    return;
  }
  const w = 600, h = 200, pad = 24;
  const maxVal = Math.max(1, ...series.flatMap(d => metrics.map(m => d[m] || 0)));
  const stepX = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const colors = { views: '#C1728A', clicks: '#3A3654', nfc_tap: '#A4586F', qr_scan: '#DCD0F5' };

  const lines = metrics.map(metric => {
    const points = series.map((d, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((d[metric] || 0) / maxVal) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${colors[metric]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="chart-svg" style="width:100%;height:220px;" preserveAspectRatio="none" role="img" aria-label="Profile performance chart">
      ${lines}
    </svg>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.75rem;font-size:0.78rem;color:var(--text-muted);">
      ${metrics.map(m => `<span style="display:inline-flex;align-items:center;gap:0.35rem;"><span style="width:9px;height:9px;border-radius:50%;background:${colors[m]};display:inline-block;"></span>${labelFor(m)}</span>`).join('')}
    </div>
  `;
}

function labelFor(metric) {
  return { views: 'Views', clicks: 'Clicks', nfc_tap: 'NFC taps', qr_scan: 'QR scans' }[metric] || metric;
}

async function renderOverview(root, { user, profile, links, appearance, onNavigate }) {
  let range = '7d';

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="font-display">Good ${greeting()}, ${firstName(user.name)}</h1>
        <p>Here's what's happening with your Mochimo.</p>
      </div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-secondary" id="shareBtn">${icon('share', { size: 15 })} Share</button>
        <button type="button" class="btn btn-primary" id="viewProfileBtn">${icon('eye', { size: 15 })} View Profile</button>
      </div>
    </div>

    <div id="statsGrid" class="stat-grid"></div>

    <div class="section-block card card-pad">
      <div class="flex items-center justify-between" style="flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;">
        <h2 class="font-display" style="font-size:1.15rem;margin:0;">Profile performance</h2>
        <div class="segmented" id="rangeSwitch">
          <button type="button" data-range="7d" class="active">7 days</button>
          <button type="button" data-range="30d">30 days</button>
          <button type="button" data-range="90d">90 days</button>
        </div>
      </div>
      <div id="chartHolder"></div>
    </div>

    <div class="section-block" style="display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem;">
      <div class="card card-pad">
        <h2 class="font-display" style="font-size:1.15rem;margin:0 0 1rem;">Top links</h2>
        <div id="topLinksHolder"></div>
      </div>
    </div>

    <div class="section-block" style="display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem;">
      <div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;">
        <h2 class="font-display" style="font-size:1.15rem;margin:0 0 1rem;align-self:flex-start;">Live profile preview</h2>
        <div class="phone-frame"><div class="phone-screen" id="ovPreview"></div></div>
        <button type="button" class="btn btn-secondary btn-sm" id="ovOpenProfile" style="margin-top:1rem;">${icon('externalLink', { size: 14 })} Open profile</button>
      </div>

      <div class="card card-pad">
        <h2 class="font-display" style="font-size:1.15rem;margin:0 0 1rem;">Recent activity</h2>
        <div id="activityHolder"></div>
      </div>
    </div>
  `;

  renderProfilePreview(root.querySelector('#ovPreview').closest('.phone-frame'), { profile, links, appearance });

  root.querySelector('#viewProfileBtn').addEventListener('click', () => openPublicProfile(profile.username));
  root.querySelector('#ovOpenProfile').addEventListener('click', () => openPublicProfile(profile.username));
  root.querySelector('#shareBtn').addEventListener('click', async () => {
    const url = publicProfileUrl(profile.username);
    const ok = await copyToClipboard(url);
    toast(ok ? 'Profile link copied to clipboard.' : 'Could not copy automatically — copy it manually.', { type: ok ? 'success' : 'error' });
  });

  async function loadRange(r) {
    range = r;
    root.querySelectorAll('#rangeSwitch button').forEach(b => b.classList.toggle('active', b.dataset.range === r));
    const data = await api.getAnalytics(r);
    paintStats(data);
    drawChart(root.querySelector('#chartHolder'), data.series, ['views', 'clicks', 'nfc_tap', 'qr_scan']);
    paintTopLinks(data.topLinks);
  }

  root.querySelectorAll('#rangeSwitch button').forEach(btn => {
    btn.addEventListener('click', () => loadRange(btn.dataset.range));
  });

  function paintStats(data) {
    const stats = [
      { label: 'Profile Views', value: data.views, delta: data.deltas.views },
      { label: 'Link Clicks', value: data.clicks, delta: data.deltas.clicks },
      { label: 'CTR', value: null, display: formatPercent(data.ctr), delta: null },
      { label: 'NFC Taps', value: data.nfcTaps, delta: null },
      { label: 'QR Scans', value: data.qrScans, delta: null },
    ];
    root.querySelector('#statsGrid').innerHTML = stats.map(s => `
      <div class="card stat-card">
        <p class="stat-label">${s.label}</p>
        <p class="stat-value">${s.display ?? formatNumber(s.value)}</p>
        ${s.delta !== null ? deltaHTML(s.delta) : ''}
      </div>
    `).join('');
  }

  function paintTopLinks(topLinks) {
    const holder = root.querySelector('#topLinksHolder');
    if (!topLinks.length) {
      holder.innerHTML = `
        <div class="empty-state" style="padding:1.5rem 1rem;">
          <span class="empty-icon">${icon('link', { size: 22 })}</span>
          <h3>No link activity yet</h3>
          <p>Once your links start getting clicks, the top performers will show up here.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="goLinksBtn">Manage links</button>
        </div>`;
      holder.querySelector('#goLinksBtn').addEventListener('click', () => onNavigate('links'));
      return;
    }
    holder.innerHTML = topLinks.map(l => `
      <div class="flex items-center justify-between" style="padding:0.65rem 0;border-bottom:1px solid var(--border-subtle);">
        <span class="min-w-0 truncate" style="font-weight:600;font-size:0.88rem;">${l.title}</span>
        <span style="font-size:0.82rem;color:var(--text-muted);flex-shrink:0;">${formatNumber(l.periodClicks)} clicks</span>
      </div>
    `).join('');
  }

  async function paintActivity() {
    const holder = root.querySelector('#activityHolder');
    const data = await api.getAnalytics('30d');
    if (!data.hasAnyData) {
      holder.innerHTML = `
        <div class="empty-state" style="padding:1.5rem 1rem;">
          <span class="empty-icon">${icon('cat', { size: 22 })}</span>
          <h3>All quiet for now</h3>
          <p>Your first visitor is just one share away.</p>
          <button type="button" class="btn btn-accent btn-sm" id="goShareBtn">Share profile</button>
        </div>`;
      holder.querySelector('#goShareBtn').addEventListener('click', () => root.querySelector('#shareBtn').click());
      return;
    }
    // Build a small readable feed from real recorded events only.
    const recent = await api.getRecentEvents(8);
    if (!recent.length) {
      holder.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">No recent activity in this window.</p>`;
      return;
    }
    const linkTitle = (id) => links.find(l => l.id === id)?.title || 'a link';
    const describe = (e) => {
      if (e.type === 'view') return 'Someone viewed your profile';
      if (e.type === 'click') return `${linkTitle(e.meta?.linkId)} link was clicked`;
      if (e.type === 'nfc_tap') return 'Your NFC profile was tapped';
      if (e.type === 'qr_scan') return 'Your QR code was scanned';
      return 'Activity recorded';
    };
    holder.innerHTML = recent.map(e => `
      <div class="flex items-center gap-3" style="padding:0.55rem 0;border-bottom:1px solid var(--border-subtle);">
        <span class="icon-circle" style="height:32px;width:32px;">${icon(e.type === 'click' ? 'link' : e.type === 'nfc_tap' ? 'nfc' : e.type === 'qr_scan' ? 'qrcode' : 'eye', { size: 14 })}</span>
        <span class="min-w-0 truncate" style="font-size:0.85rem;flex:1;">${describe(e)}</span>
        <span style="font-size:0.75rem;color:var(--text-faint);flex-shrink:0;">${timeAgo(e.ts)}</span>
      </div>
    `).join('');
  }

  await loadRange('7d');
  await paintActivity();
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
function firstName(name) { return (name || '').split(' ')[0] || 'there'; }
function publicProfileUrl(username) { return `${location.origin}${location.pathname.replace(/dashboard.*$/, '')}u/${username}`; }
function openPublicProfile(username) { window.open(`u.html?u=${encodeURIComponent(username)}`, '_blank'); }

export { renderOverview };
