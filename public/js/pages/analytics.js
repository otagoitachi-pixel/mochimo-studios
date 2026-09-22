import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, formatPercent } from '../lib/utils.js';

function lineChart(series, metrics, colors) {
  if (!series.length) return '';
  const w = 640, h = 220, pad = 28;
  const maxVal = Math.max(1, ...series.flatMap(d => metrics.map(m => d[m] || 0)));
  const stepX = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const lines = metrics.map(metric => {
    const points = series.map((d, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((d[metric] || 0) / maxVal) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${colors[metric]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:220px;" preserveAspectRatio="none" role="img" aria-label="Chart">${lines}</svg>`;
}

function barRow(label, value, max) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return `
    <div style="margin-bottom:0.75rem;">
      <div class="flex items-center justify-between" style="font-size:0.82rem;margin-bottom:0.3rem;">
        <span style="color:var(--text-secondary);">${label}</span>
        <span style="font-weight:600;">${formatNumber(value)}</span>
      </div>
      <div style="height:8px;border-radius:999px;background:var(--border-subtle);overflow:hidden;">
        <div style="height:100%;border-radius:999px;background:var(--rose);width:${pct}%;"></div>
      </div>
    </div>
  `;
}

async function renderAnalyticsPage(root, { links }) {
  let range = '7d';

  root.innerHTML = `
    <div class="page-header">
      <div><h1 class="font-display">Analytics</h1><p>Real performance for your Mochimo profile — no estimates.</p></div>
      <div class="segmented" id="analyticsRange">
        <button type="button" data-r="7d" class="active">7D</button>
        <button type="button" data-r="30d">30D</button>
        <button type="button" data-r="90d">90D</button>
        <button type="button" data-r="all">All time</button>
      </div>
    </div>

    <div id="analyticsStats" class="stat-grid"></div>

    <div class="card card-pad section-block">
      <p class="section-label">Profile views &amp; clicks</p>
      <div id="viewsClicksChart"></div>
    </div>

    <div class="card card-pad section-block">
      <p class="section-label">NFC vs QR</p>
      <div id="nfcQrChart"></div>
    </div>

    <div class="section-block" style="display:grid;grid-template-columns:minmax(0,1fr);gap:1.5rem;">
      <div class="card card-pad">
        <p class="section-label">Top links</p>
        <div id="topLinksTable"></div>
      </div>
      <div class="card card-pad">
        <p class="section-label">Traffic sources</p>
        <div id="sourcesHolder"></div>
      </div>
      <div class="card card-pad">
        <p class="section-label">Device</p>
        <div id="devicesHolder"></div>
      </div>
    </div>
  `;

  async function load(r) {
    range = r;
    root.querySelectorAll('#analyticsRange button').forEach(b => b.classList.toggle('active', b.dataset.r === r));
    const data = await api.getAnalytics(r);

    root.querySelector('#analyticsStats').innerHTML = [
      ['Profile Views', formatNumber(data.views)],
      ['Unique Visitors', formatNumber(data.uniqueVisitors)],
      ['Link Clicks', formatNumber(data.clicks)],
      ['CTR', formatPercent(data.ctr)],
      ['NFC Taps', formatNumber(data.nfcTaps)],
    ].map(([label, value]) => `
      <div class="card stat-card"><p class="stat-label">${label}</p><p class="stat-value">${value}</p></div>
    `).join('');

    const viewsChart = root.querySelector('#viewsClicksChart');
    viewsChart.innerHTML = data.series.length
      ? lineChart(data.series, ['views', 'clicks'], { views: '#C1728A', clicks: '#3A3654' }) +
        legendHTML([['Views', '#C1728A'], ['Clicks', '#3A3654']])
      : emptyChartHTML('No views or clicks recorded in this period yet.');

    const nfcQrChart = root.querySelector('#nfcQrChart');
    nfcQrChart.innerHTML = data.series.some(d => d.nfc_tap || d.qr_scan)
      ? lineChart(data.series, ['nfc_tap', 'qr_scan'], { nfc_tap: '#A4586F', qr_scan: '#DCD0F5' }) +
        legendHTML([['NFC taps', '#A4586F'], ['QR scans', '#DCD0F5']])
      : emptyChartHTML('No NFC taps or QR scans recorded in this period yet.');

    const topLinksTable = root.querySelector('#topLinksTable');
    topLinksTable.innerHTML = data.topLinks.length
      ? `
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead><tr style="text-align:left;color:var(--text-muted);font-size:0.75rem;">
            <th style="padding-bottom:0.5rem;">Link</th><th>Clicks</th><th>CTR</th>
          </tr></thead>
          <tbody>
            ${data.topLinks.map(l => `
              <tr style="border-top:1px solid var(--border-subtle);">
                <td style="padding:0.55rem 0;">${l.title}</td>
                <td>${formatNumber(l.periodClicks)}</td>
                <td>${data.views > 0 ? formatPercent((l.periodClicks / data.views) * 100) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      : `<p class="text-muted" style="font-size:0.85rem;">No link clicks recorded in this period yet.</p>`;

    const sourceEntries = Object.entries(data.sources);
    const sourcesHolder = root.querySelector('#sourcesHolder');
    sourcesHolder.innerHTML = sourceEntries.length
      ? sourceEntries.sort((a, b) => b[1] - a[1]).map(([k, v]) => barRow(k, v, Math.max(...sourceEntries.map(e => e[1])))).join('')
      : `<p class="text-muted" style="font-size:0.85rem;">Traffic source data isn't available yet.</p>`;

    const deviceEntries = Object.entries(data.devices);
    const devicesHolder = root.querySelector('#devicesHolder');
    devicesHolder.innerHTML = deviceEntries.length
      ? deviceEntries.sort((a, b) => b[1] - a[1]).map(([k, v]) => barRow(k, v, Math.max(...deviceEntries.map(e => e[1])))).join('')
      : `<p class="text-muted" style="font-size:0.85rem;">Device data isn't available yet.</p>`;
  }

  root.querySelectorAll('#analyticsRange button').forEach(btn => btn.addEventListener('click', () => load(btn.dataset.r)));
  await load('7d');
}

function legendHTML(entries) {
  return `<div style="display:flex;gap:1rem;margin-top:0.6rem;font-size:0.78rem;color:var(--text-muted);">
    ${entries.map(([label, color]) => `<span style="display:inline-flex;align-items:center;gap:0.3rem;"><span style="width:9px;height:9px;border-radius:50%;background:${color};display:inline-block;"></span>${label}</span>`).join('')}
  </div>`;
}
function emptyChartHTML(message) {
  return `<div class="empty-state" style="padding:1.5rem 1rem;"><span class="empty-icon">${icon('chart', { size: 20 })}</span><p style="margin:0;">${message}</p></div>`;
}

export { renderAnalyticsPage };
