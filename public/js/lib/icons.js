// Minimal Lucide-style icon set as inline SVG strings.
// No external icon library dependency — kept lightweight and consistent.
// Usage: icon('home', { size: 18, class: 'my-class' })

const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4.2 4.8-6 8-6s6.5 1.8 8 6"/>',
  link: '<path d="M9 15 15 9"/><path d="M13.5 6.5 15 5a3.54 3.54 0 1 1 5 5l-1.5 1.5"/><path d="M10.5 17.5 9 19a3.54 3.54 0 1 1-5-5l1.5-1.5"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><path d="M12 21a2 2 0 0 1-1-3.7 2 2 0 0 0 1-3.8"/>',
  nfc: '<path d="M6 9a6 6 0 0 1 8.5 0"/><path d="M4 6.3a9.5 9.5 0 0 1 13.5 0"/><circle cx="8.3" cy="13" r="1.4" fill="currentColor" stroke="none"/>',
  qrcode: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3"/>',
  chart: '<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1.5 1-1.5 2"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  drag: '<circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  arrowLeft: '<path d="M19 12H5M11 5l-7 7 7 7"/>',
  arrowRight: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  externalLink: '<path d="M14 5h5v5"/><path d="M19 5 10 14"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.7 7.4-4.2M8.3 13.3l7.4 4.2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  play: '<path d="m9 6 9 6-9 6V6z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/>',
  logout: '<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  phone: '<path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 9 9 0 0 0 2.8.45 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 1 9 9 0 0 0 .45 2.8 1 1 0 0 1-.25 1Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M13 3v10.5a3 3 0 1 1-2-2.8"/><path d="M13 3a5 5 0 0 0 5 5"/>',
  whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 12 20a8 8 0 0 1-4-1.1L4 20z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><path d="M8 11v6M12 17v-3.5a1.5 1.5 0 0 1 3 0V17M12 11v.5"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z"/><path d="M9 9v2a3 3 0 0 0 6 0V9"/>',
  music: '<circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M9.5 18V6l10-2v12"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H7a2 2 0 0 1 0-4h12"/><circle cx="16.5" cy="14.5" r="1"/>',
  cat: '<circle cx="12" cy="13" r="7"/><path d="M6.5 8 4 3l4 2.5M17.5 8 20 3l-4 2.5"/><circle cx="9.5" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="0.8" fill="currentColor" stroke="none"/><path d="M10.5 16c.7.7 2.3.7 3 0"/>',
  upload: '<path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  download: '<path d="M12 4v12"/><path d="m8 12 4 4 4-4"/><path d="M4 20h16"/>',
  facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.2c0-1 .3-1.7 1.8-1.7H18V2.3A24 24 0 0 0 15.4 2C12.9 2 11 3.5 11 6.3v3.2H8V13h3v8h3Z" fill="currentColor" stroke="none"/>',
  camera: '<path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.4l1-1.8A1.5 1.5 0 0 1 9.2 4.4h5.6a1.5 1.5 0 0 1 1.3.8l1 1.8h1.4A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.5"/>',
  mapPin: '<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="10" r="2.4"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/>',
};

function icon(name, opts = {}) {
  const size = opts.size || 18;
  const cls = opts.class ? ` class="${opts.class}"` : '';
  const strokeWidth = opts.strokeWidth || 1.8;
  const paths = ICON_PATHS[name] || ICON_PATHS.alertCircle;
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

// Standalone verified/"bluetick" badge — a rosette made of three overlapping
// rounded squares (12-point flower) with a white check, plus a soft gloss
// highlight. Self-colored (not currentColor) so it reads the same on any
// background/theme.
function verifiedBadge(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verified">
    <g>
      <rect x="5" y="5" width="30" height="30" rx="7" fill="#1877F2" transform="rotate(0 20 20)"/>
      <rect x="5" y="5" width="30" height="30" rx="7" fill="#1D9BF0" transform="rotate(30 20 20)"/>
      <rect x="5" y="5" width="30" height="30" rx="7" fill="#0E6FE0" transform="rotate(60 20 20)"/>
    </g>
    <ellipse cx="15.5" cy="12.5" rx="9" ry="5.5" fill="#ffffff" opacity="0.16" transform="rotate(-25 15.5 12.5)"/>
    <path d="M13.6 20.6l4.2 4.2 8.6-9.6" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export { icon, verifiedBadge };
