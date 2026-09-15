import { icon } from '../lib/icons.js';
import { initials } from '../lib/utils.js';
import { openModal, closeModal } from '../lib/modal.js';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'profile', label: 'My Profile', icon: 'user' },
  { id: 'links', label: 'Links', icon: 'link' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'nfc', label: 'NFC', icon: 'nfc' },
  { id: 'qr', label: 'QR Code', icon: 'qrcode' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
];
const MORE_ITEMS = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'nfc', label: 'NFC', icon: 'nfc' },
  { id: 'qr', label: 'QR Code', icon: 'qrcode' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'help', label: 'Help', icon: 'help' },
];
const BOTTOM_ITEMS = [
  { id: 'overview', label: 'Home', icon: 'home' },
  { id: 'links', label: 'Links', icon: 'link' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'more', label: 'More', icon: 'more' },
];

function renderShell(root, { user, currentRoute, onNavigate, onLogout }) {
  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span aria-hidden="true">${icon('cat', { size: 24 })}</span>
        <span>Mochimo</span>
      </div>
      <nav class="sidebar-nav" aria-label="Dashboard sections">
        ${NAV_ITEMS.map(item => sidebarLinkHTML(item, currentRoute)).join('')}
        <div class="sidebar-divider"></div>
        ${sidebarLinkHTML({ id: 'settings', label: 'Settings', icon: 'settings' }, currentRoute)}
        ${sidebarLinkHTML({ id: 'help', label: 'Help', icon: 'help' }, currentRoute)}
      </nav>
      <button type="button" class="sidebar-user" id="sidebarUserBtn" style="cursor:pointer;">
        <span class="avatar">${initials(user?.name)}</span>
        <span class="meta">
          <span class="name">${user?.name || ''}</span>
          <span class="handle">@${user?.username || ''}</span>
        </span>
      </button>
    </aside>

    <header class="topbar">
      <div class="logo-mark">
        <span aria-hidden="true">${icon('cat', { size: 20 })}</span>
        <span>Mochimo</span>
      </div>
      <button type="button" class="topbar-avatar-btn" id="topbarAvatarBtn" aria-label="Account menu">${initials(user?.name)}</button>
    </header>

    <nav class="bottom-nav" aria-label="Primary">
      ${BOTTOM_ITEMS.map(item => `
        <button type="button" class="bottom-nav-btn ${currentRoute === item.id || (item.id === 'more' && ['appearance','nfc','qr','settings','help'].includes(currentRoute)) ? 'active' : ''}" data-nav="${item.id}">
          ${icon(item.icon, { size: 20 })}
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;

  root.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'more') {
        openMoreSheet(onNavigate);
      } else {
        onNavigate(btn.dataset.nav);
      }
    });
  });

  const userMenuHandler = () => openAccountMenu({ user, onNavigate, onLogout });
  root.querySelector('#sidebarUserBtn')?.addEventListener('click', userMenuHandler);
  root.querySelector('#topbarAvatarBtn')?.addEventListener('click', userMenuHandler);
}

function sidebarLinkHTML(item, currentRoute) {
  return `
    <button type="button" class="sidebar-link ${currentRoute === item.id ? 'active' : ''}" data-nav="${item.id}">
      ${icon(item.icon, { size: 18 })}
      <span>${item.label}</span>
    </button>
  `;
}

// Delegate sidebar nav clicks (separate from bottom-nav since markup differs)
function bindSidebarNav(root, onNavigate) {
  root.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.nav));
  });
}

function openMoreSheet(onNavigate) {
  openModal({
    title: 'More',
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:0.25rem;">
        ${MORE_ITEMS.map(item => `
          <button type="button" class="sidebar-link" data-more-nav="${item.id}" style="justify-content:flex-start;">
            ${icon(item.icon, { size: 18 })}<span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    `,
    onMount: (panel) => {
      panel.querySelectorAll('[data-more-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          closeModal();
          onNavigate(btn.dataset.moreNav);
        });
      });
    },
  });
}

function openAccountMenu({ user, onNavigate, onLogout }) {
  openModal({
    title: 'Account',
    bodyHTML: `
      <div style="display:flex;align-items:center;gap:0.75rem;padding-bottom:0.5rem;">
        <span class="icon-circle" style="background:linear-gradient(135deg,var(--rose-soft),var(--lavender-deep));color:var(--ink);font-weight:600;">${initials(user?.name)}</span>
        <div class="min-w-0">
          <p style="margin:0;font-weight:600;font-size:0.9rem;" class="truncate">${user?.name || ''}</p>
          <p style="margin:0;font-size:0.78rem;color:var(--text-muted);" class="truncate">${user?.email || ''}</p>
        </div>
      </div>
      <div class="sidebar-divider" style="margin:0.25rem 0;"></div>
      <button type="button" class="sidebar-link" data-account-nav="settings" style="justify-content:flex-start;">${icon('settings',{size:18})}<span>Settings</span></button>
      <button type="button" class="sidebar-link" data-account-nav="help" style="justify-content:flex-start;">${icon('help',{size:18})}<span>Help</span></button>
      <button type="button" class="sidebar-link" id="logoutBtn" style="justify-content:flex-start;color:var(--danger-deep);">${icon('logout',{size:18})}<span>Log out</span></button>
    `,
    onMount: (panel) => {
      panel.querySelectorAll('[data-account-nav]').forEach(btn => {
        btn.addEventListener('click', () => { closeModal(); onNavigate(btn.dataset.accountNav); });
      });
      panel.querySelector('#logoutBtn').addEventListener('click', () => { closeModal(); onLogout(); });
    },
  });
}

export { renderShell, bindSidebarNav };
