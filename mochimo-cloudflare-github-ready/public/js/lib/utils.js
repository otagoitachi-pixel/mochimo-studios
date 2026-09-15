// Shared utilities used across the dashboard.

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Only allow safe URL schemes — prevents javascript: and data: injection.
const ALLOWED_SCHEMES = ['https:', 'http:', 'mailto:', 'tel:'];
function isSafeUrl(value) {
  if (!value) return false;
  try {
    // Allow bare mailto:/tel: which URL() handles fine, and bare domains get https:// assumed by caller.
    const url = new URL(value);
    return ALLOWED_SCHEMES.includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeUrl(value, type) {
  const v = (value || '').trim();
  if (!v) return '';
  if (type === 'email') return v.startsWith('mailto:') ? v : `mailto:${v}`;
  if (type === 'phone') return v.startsWith('tel:') ? v : `tel:${v.replace(/[^\d+]/g, '')}`;
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v) || /^tel:/i.test(v)) return v;
  return `https://${v}`;
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,20}$/i.test(value || '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function formatNumber(n) {
  return new Intl.NumberFormat(undefined).format(n || 0);
}

function formatPercent(n, digits = 1) {
  return `${(n || 0).toFixed(digits)}%`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older/insecure contexts
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
}

export {
  escapeHTML, uid, isSafeUrl, normalizeUrl, isValidUsername, isValidEmail,
  formatNumber, formatPercent, timeAgo, copyToClipboard, debounce, initials,
};
