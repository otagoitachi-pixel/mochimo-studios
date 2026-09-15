const ALLOWED_SCHEMES = ['https:', 'http:', 'mailto:', 'tel:'];

function isValidUsername(v) { return /^[a-z0-9_]{3,20}$/i.test(v || ''); }
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''); }
function isSafeUrl(v) {
  if (!v) return false;
  try {
    const url = new URL(v);
    return ALLOWED_SCHEMES.includes(url.protocol);
  } catch { return false; }
}
function clampStr(v, max) { return String(v ?? '').slice(0, max); }

const LINK_TYPES = ['social', 'website', 'whatsapp', 'email', 'phone', 'custom', 'product', 'music', 'video', 'booking'];
const EVENT_TYPES = ['view', 'click', 'nfc_tap', 'qr_scan'];
const THEMES = ['mochimo', 'minimal', 'soft', 'lavender', 'blush', 'dark', 'custom'];
const BUTTON_STYLES = ['soft', 'rounded', 'pill', 'outline', 'minimal'];
const LAYOUTS = ['classic', 'compact', 'spacious', 'cards', 'list'];

export { isValidUsername, isValidEmail, isSafeUrl, clampStr, LINK_TYPES, EVENT_TYPES, THEMES, BUTTON_STYLES, LAYOUTS };
