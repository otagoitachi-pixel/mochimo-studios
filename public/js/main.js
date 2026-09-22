import { api } from './lib/api.js';
import { store } from './lib/store.js';
import { toast } from './lib/toast.js';
import { renderShell, bindSidebarNav } from './components/shell.js';
import { renderAuth } from './pages/auth.js';
import { renderOverview } from './pages/overview.js';
import { renderProfilePage } from './pages/profile.js';
import { renderLinksPage } from './pages/links.js';
import { renderAppearancePage } from './pages/appearance.js';
import { renderNfcPage } from './pages/nfc.js';
import { renderQrPage } from './pages/qr.js';
import { renderAnalyticsPage } from './pages/analytics.js';
import { renderSettingsPage } from './pages/settings.js';

const appRoot = document.getElementById('app');

const VALID_ROUTES = ['overview', 'profile', 'links', 'appearance', 'nfc', 'qr', 'analytics', 'settings', 'help'];

async function boot() {
  const user = await api.me();
  if (!user) {
    renderAuth(appRoot, { onAuthed: () => boot() });
    return;
  }

  const [profile, links, appearance, settings] = await Promise.all([
    api.getProfile(), api.listLinks(), api.getAppearance(), api.getSettings(),
  ]);
  store.set({ user, profile, links, appearance, settings });

  buildShell();
  const initialRoute = (location.hash || '#overview').replace('#', '');
  navigate(VALID_ROUTES.includes(initialRoute) ? initialRoute : 'overview');
}

function buildShell() {
  appRoot.innerHTML = `
    <div id="shellRoot"></div>
    <main class="app-shell">
      <div class="app-content" id="pageRoot"></div>
    </main>
    <div id="toastLayer"></div>
  `;
  paintShell();
}

function paintShell() {
  const { user } = store.get();
  const currentRoute = normalizedRouteForNav(store.get().route);
  const shellRoot = document.getElementById('shellRoot');
  renderShell(shellRoot, {
    user, currentRoute,
    onNavigate: navigate,
    onLogout: async () => { await api.logout(); location.hash = ''; boot(); },
  });
  bindSidebarNav(shellRoot, navigate);
}

function normalizedRouteForNav(route) {
  return route;
}

async function navigate(route) {
  if (!VALID_ROUTES.includes(route)) route = 'overview';
  store.set({ route });
  location.hash = route;
  paintShell();

  const pageRoot = document.getElementById('pageRoot');
  pageRoot.innerHTML = renderSkeleton();

  const { user, profile, links, appearance, settings } = store.get();

  try {
    if (route === 'overview') {
      await renderOverview(pageRoot, { user, profile, links, appearance, onNavigate: navigate });
    } else if (route === 'profile') {
      renderProfilePage(pageRoot, {
        profile, links, appearance,
        onProfileChanged: (updated) => store.set({ profile: updated }),
      });
    } else if (route === 'links') {
      await renderLinksPage(pageRoot, {
        links,
        onLinksChanged: (updated) => store.set({ links: updated }),
      });
    } else if (route === 'appearance') {
      renderAppearancePage(pageRoot, {
        profile, links, appearance,
        onAppearanceChanged: (updated) => store.set({ appearance: updated }),
      });
    } else if (route === 'nfc') {
      await renderNfcPage(pageRoot, { profile });
    } else if (route === 'qr') {
      await renderQrPage(pageRoot, { profile });
    } else if (route === 'analytics') {
      await renderAnalyticsPage(pageRoot, { links });
    } else if (route === 'settings') {
      renderSettingsPage(pageRoot, {
        user, profile, settings,
        onProfileChanged: (updated) => { store.set({ profile: updated, user: { ...user, name: updated.name, email: updated.email } }); paintShell(); },
        onSettingsChanged: (updated) => store.set({ settings: updated }),
        onLogout: async () => { location.hash = ''; boot(); },
      });
    } else if (route === 'help') {
      renderHelpPage(pageRoot);
    }
  } catch (err) {
    if (err?.status === 401) { boot(); return; }
    pageRoot.innerHTML = `<div class="card card-pad"><p style="color:var(--danger-deep);margin:0;">Something went wrong loading this page. Please refresh.</p></div>`;
    console.error(err);
  }
}

function renderSkeleton() {
  return `
    <div class="skeleton" style="height:2rem;width:14rem;margin-bottom:0.75rem;"></div>
    <div class="skeleton" style="height:1rem;width:20rem;margin-bottom:2rem;"></div>
    <div class="stat-grid">
      ${Array.from({ length: 5 }).map(() => '<div class="skeleton" style="height:88px;"></div>').join('')}
    </div>
  `;
}

function renderHelpPage(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="font-display">Help</h1><p>Everything you need to know about your Mochimo.</p></div></div>
    <div class="card card-pad" style="display:flex;flex-direction:column;gap:1rem;">
      <div><p style="font-weight:600;margin:0 0 0.25rem;">How do I share my profile?</p><p style="margin:0;color:var(--text-secondary);font-size:0.88rem;">Use the Share button on Overview, or copy your link from My Profile.</p></div>
      <div><p style="font-weight:600;margin:0 0 0.25rem;">How does NFC work?</p><p style="margin:0;color:var(--text-secondary);font-size:0.88rem;">Your Mochimo NFC card points to your profile URL. Visit the NFC page to write or copy that link.</p></div>
      <div><p style="font-weight:600;margin:0 0 0.25rem;">Can I reorder my links?</p><p style="margin:0;color:var(--text-secondary);font-size:0.88rem;">Yes — drag a link card on the Links page, or use the up/down arrows.</p></div>
    </div>
  `;
}

window.addEventListener('hashchange', () => {
  const route = location.hash.replace('#', '');
  if (VALID_ROUTES.includes(route) && route !== store.get().route) navigate(route);
});

boot();
