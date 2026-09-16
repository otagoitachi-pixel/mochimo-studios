import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, normalizeUrl, escapeHTML } from '../lib/utils.js';
import { toast } from '../lib/toast.js';
import { openModal, closeModal, confirmDialog } from '../lib/modal.js';

const LINK_TYPES = [
  { id: 'social', label: 'Social', icon: 'link' },
  { id: 'website', label: 'Website', icon: 'globe' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'phone', label: 'Phone', icon: 'phone' },
  { id: 'product', label: 'Product', icon: 'store' },
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'booking', label: 'Booking', icon: 'calendar' },
  { id: 'custom', label: 'Custom', icon: 'link' },
];
const iconFor = (type) => LINK_TYPES.find(t => t.id === type)?.icon || 'link';

// Fixed quick-connect socials — always the same five platforms, sourced from
// the profile (My Profile page owns the actual values). This page only
// controls whether each one shows on the public profile.
const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'youtube', label: 'YouTube', icon: 'youtube' },
  { key: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { key: 'x', label: 'X (Twitter)', icon: 'x' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
];

function formatSocialDisplay(value) {
  return value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

function ensureStyles() {
  if (document.getElementById('ml-links-styles')) return;
  const style = document.createElement('style');
  style.id = 'ml-links-styles';
  style.textContent = `
    .ml-tabs { display: inline-flex; gap: 0.35rem; background: var(--blush); padding: 0.3rem; border-radius: var(--r-full); margin: 0 0 1.25rem; max-width: 100%; }
    .ml-tab { display: inline-flex; align-items: center; gap: 0.45rem; border: none; background: transparent; padding: 0.6rem 1.1rem; border-radius: var(--r-full); font-family: var(--font-body); font-weight: 700; font-size: 0.85rem; color: var(--ink-2); cursor: pointer; transition: background .15s ease, color .15s ease; white-space: nowrap; }
    .ml-tab:hover:not(.active) { background: rgba(255,255,255,0.55); }
    .ml-tab.active { background: var(--rose); color: #fff; box-shadow: var(--shadow-sm); }
    .ml-social-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.1rem; }
    .ml-social-title { margin: 0; font-weight: 700; font-size: 1.02rem; }
    .ml-social-subtitle { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--text-muted); max-width: 40ch; }
    .ml-social-list { display: flex; flex-direction: column; }
    .ml-social-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 0; border-bottom: 1px solid var(--border-subtle); }
    .ml-social-row:last-child { border-bottom: none; }
    .ml-social-meta { flex: 1; min-width: 0; }
    .ml-social-name { margin: 0; font-weight: 700; font-size: 0.92rem; }
    .ml-social-handle { margin: 0.1rem 0 0; font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ml-social-handle.ml-social-empty { font-style: italic; color: var(--text-faint); }
    .ml-social-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
    .ml-social-showlabel { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); min-width: 2.8ch; text-align: right; }
    .ml-social-banner { display: flex; align-items: center; gap: 0.6rem; background: var(--blush); color: var(--rose-deep); font-size: 0.8rem; font-weight: 600; padding: 0.85rem 1rem; border-radius: var(--r-md); margin-top: 1rem; }
    .ml-dashed-add { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.9rem; border-radius: var(--r-md); border: 1.5px dashed var(--rose-soft); background: transparent; color: var(--rose-deep); font-weight: 700; font-size: 0.88rem; cursor: pointer; margin-bottom: 1rem; }
    .ml-dashed-add:hover { background: var(--blush); }
    .ml-extra-empty { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; text-align: center; padding: 1.25rem 1rem; color: var(--text-muted); }
    .ml-extra-empty .empty-icon { color: var(--rose-deep); background: var(--blush); height: 52px; width: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.3rem; }
    .ml-extra-empty-title { margin: 0; font-weight: 700; color: var(--ink); font-family: var(--font-display); font-style: italic; font-size: 1.05rem; }
    .ml-extra-empty-sub { margin: 0; font-size: 0.82rem; }
    @media (max-width: 560px) {
      .ml-tabs { width: 100%; }
      .ml-tab { flex: 1; justify-content: center; }
      .ml-social-showlabel { display: none; }
    }
  `;
  document.head.appendChild(style);
}

async function renderLinksPage(root, { links, profile, onLinksChanged, onNavigate, onProfileChanged }) {
  ensureStyles();
  let localLinks = links;
  let currentProfile = profile || { socials: {}, socialsVisible: {} };
  let activeTab = 'social';

  function goToProfile() {
    if (typeof onNavigate === 'function') onNavigate('profile');
    else toast('Head to My Profile to edit your social accounts.');
  }

  function paint() {
    root.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="font-display">My Links</h1>
          <p>Control what appears on your link in bio page.</p>
        </div>
        <div class="page-header-actions">
          ${activeTab === 'extra'
            ? `<button type="button" class="btn btn-accent" id="addLinkBtn">${icon('plus', { size: 15 })} Add Link</button>`
            : `<button type="button" class="btn btn-accent" id="addSocialBtn">${icon('plus', { size: 15 })} Add Social</button>`}
        </div>
      </div>

      <div class="ml-tabs" role="tablist">
        <button type="button" class="ml-tab ${activeTab === 'social' ? 'active' : ''}" data-tab="social" role="tab" aria-selected="${activeTab === 'social'}">${icon('user', { size: 15 })} Social Accounts</button>
        <button type="button" class="ml-tab ${activeTab === 'extra' ? 'active' : ''}" data-tab="extra" role="tab" aria-selected="${activeTab === 'extra'}">${icon('link', { size: 15 })} Extra Links</button>
      </div>

      <div id="tabPanel"></div>
    `;

    root.querySelector('#addSocialBtn')?.addEventListener('click', goToProfile);
    root.querySelector('#addLinkBtn')?.addEventListener('click', () => openLinkModal());
    root.querySelectorAll('.ml-tab').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.tab === activeTab) return;
      activeTab = btn.dataset.tab;
      paint();
    }));

    const panel = root.querySelector('#tabPanel');
    if (activeTab === 'social') paintSocialPanel(panel);
    else paintExtraPanel(panel);
  }

  function paintSocialPanel(panel) {
    const visibility = currentProfile.socialsVisible || {};
    const profileSocials = currentProfile.socials || {};

    panel.innerHTML = `
      <div class="card card-pad">
        <div class="ml-social-head">
          <div>
            <p class="ml-social-title">Social Accounts</p>
            <p class="ml-social-subtitle">Manage your social links. Turn them on or off to show or hide on your profile.</p>
          </div>
          <button type="button" class="btn btn-accent btn-sm" id="addSocialBtn2">${icon('plus', { size: 14 })} Add Social</button>
        </div>
        <div class="ml-social-list">
          ${SOCIAL_PLATFORMS.map(p => socialRowHTML(p, profileSocials[p.key], visibility[p.key] !== false)).join('')}
        </div>
        <div class="ml-social-banner">${icon('eye', { size: 15 })} Only enabled social accounts will appear on your link in bio page.</div>
      </div>
    `;

    panel.querySelector('#addSocialBtn2')?.addEventListener('click', goToProfile);
    panel.querySelectorAll('[data-add-social]').forEach(btn => btn.addEventListener('click', goToProfile));
    panel.querySelectorAll('[data-social-menu]').forEach(btn => btn.addEventListener('click', goToProfile));
    panel.querySelectorAll('[data-vis-toggle]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const key = e.target.dataset.visToggle;
        const checked = e.target.checked;
        try {
          const updated = await api.updateProfile({ socialsVisible: { [key]: checked } });
          currentProfile = updated;
          if (typeof onProfileChanged === 'function') onProfileChanged(updated);
          toast(checked ? `${labelFor(key)} will show on your public profile.` : `${labelFor(key)} hidden from your public profile.`);
        } catch (err) {
          toast(err.message || 'Could not update visibility.', { type: 'error' });
        }
        paint();
      });
    });
  }

  function labelFor(key) {
    return SOCIAL_PLATFORMS.find(p => p.key === key)?.label || 'Account';
  }

  function socialRowHTML(platform, value, visible) {
    const hasValue = !!(value && value.trim());
    return `
      <div class="ml-social-row" data-social="${platform.key}">
        <span class="icon-circle">${icon(platform.icon, { size: 17 })}</span>
        <div class="ml-social-meta">
          <p class="ml-social-name">${platform.label}</p>
          <p class="ml-social-handle ${hasValue ? '' : 'ml-social-empty'}">${hasValue ? escapeHTML(formatSocialDisplay(value)) : 'Not added yet'}</p>
        </div>
        <div class="ml-social-right">
          ${hasValue ? `
            <span class="ml-social-showlabel">${visible ? 'Show' : 'Hide'}</span>
            <label class="toggle">
              <input type="checkbox" data-vis-toggle="${platform.key}" ${visible ? 'checked' : ''}>
              <span class="track"></span><span class="thumb"></span>
            </label>
            <button type="button" class="btn-icon" data-social-menu="${platform.key}" aria-label="Edit ${platform.label} in Profile">${icon('more', { size: 14 })}</button>
          ` : `
            <button type="button" class="btn btn-secondary btn-sm" data-add-social="${platform.key}">Add</button>
          `}
        </div>
      </div>
    `;
  }

  function paintExtraPanel(panel) {
    const activeCount = localLinks.filter(l => l.enabled).length;
    panel.innerHTML = `
      <div class="card card-pad">
        <div class="ml-social-head">
          <div>
            <p class="ml-social-title">Extra Links</p>
            <p class="ml-social-subtitle">Add custom links like websites, portfolios, or anything else you want to share.</p>
          </div>
          <button type="button" class="btn btn-accent btn-sm" id="addLinkBtn2">${icon('plus', { size: 14 })} Add Link</button>
        </div>
        ${localLinks.length ? `<p class="text-muted" style="font-size:0.8rem;margin:-0.6rem 0 1rem;">${activeCount} active link${activeCount === 1 ? '' : 's'} of ${localLinks.length} total</p>` : ''}
        <div id="linksList" style="display:flex;flex-direction:column;gap:0.75rem;"></div>
      </div>
    `;

    panel.querySelector('#addLinkBtn2').addEventListener('click', () => openLinkModal());

    const listEl = panel.querySelector('#linksList');
    if (!localLinks.length) {
      listEl.innerHTML = `
        <button type="button" class="ml-dashed-add" id="emptyAddLinkBtn">${icon('plus', { size: 14 })} Add Link</button>
        <div class="ml-extra-empty">
          <span class="empty-icon">${icon('cat', { size: 26 })}</span>
          <p class="ml-extra-empty-title">No extra links yet</p>
          <p class="ml-extra-empty-sub">Add your first link to get started!</p>
        </div>`;
      listEl.querySelector('#emptyAddLinkBtn').addEventListener('click', () => openLinkModal());
      return;
    }

    listEl.innerHTML = localLinks.map((l, i) => linkCardHTML(l, i, localLinks.length)).join('');
    bindCardEvents(listEl);
  }

  function bindCardEvents(listEl) {
    listEl.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openLinkModal(localLinks.find(l => l.id === btn.dataset.edit))));
    listEl.querySelectorAll('[data-duplicate]').forEach(btn => btn.addEventListener('click', () => duplicateLink(btn.dataset.duplicate)));
    listEl.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => toggleLink(btn.dataset.toggle)));
    listEl.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteLink(btn.dataset.delete)));
    listEl.querySelectorAll('[data-up]').forEach(btn => btn.addEventListener('click', () => move(btn.dataset.up, -1)));
    listEl.querySelectorAll('[data-down]').forEach(btn => btn.addEventListener('click', () => move(btn.dataset.down, 1)));

    // Native HTML5 drag & drop (desktop). Up/down buttons remain as the
    // accessible + touch-friendly way to reorder on every device.
    let dragId = null;
    listEl.querySelectorAll('.link-card').forEach(card => {
      card.addEventListener('dragstart', () => { dragId = card.dataset.id; card.style.opacity = '0.5'; });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
      card.addEventListener('dragover', (e) => e.preventDefault());
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragId || dragId === card.dataset.id) return;
        const fromIdx = localLinks.findIndex(l => l.id === dragId);
        const toIdx = localLinks.findIndex(l => l.id === card.dataset.id);
        const [moved] = localLinks.splice(fromIdx, 1);
        localLinks.splice(toIdx, 0, moved);
        persistOrder();
      });
    });
  }

  async function persistOrder() {
    paint();
    await api.reorderLinks(localLinks.map(l => l.id));
    onLinksChanged(localLinks);
  }

  async function move(id, dir) {
    const idx = localLinks.findIndex(l => l.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= localLinks.length) return;
    [localLinks[idx], localLinks[swapIdx]] = [localLinks[swapIdx], localLinks[idx]];
    await persistOrder();
  }

  async function toggleLink(id) {
    const link = localLinks.find(l => l.id === id);
    const updated = await api.updateLink(id, { enabled: !link.enabled });
    link.enabled = updated.enabled;
    paint();
    onLinksChanged(localLinks);
    toast(link.enabled ? 'Link enabled.' : 'Link disabled.');
  }

  async function duplicateLink(id) {
    const link = localLinks.find(l => l.id === id);
    const copy = await api.createLink({ ...link, title: `${link.title} (copy)` });
    localLinks.push(copy);
    paint();
    onLinksChanged(localLinks);
    toast('Link duplicated.');
  }

  function deleteLink(id) {
    const link = localLinks.find(l => l.id === id);
    confirmDialog({
      title: 'Delete link?',
      message: `“${escapeHTML(link.title)}” will be removed from your profile. This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await api.deleteLink(id);
        localLinks = localLinks.filter(l => l.id !== id);
        paint();
        onLinksChanged(localLinks);
        toast('Link deleted.');
      },
    });
  }

  function openLinkModal(existing = null) {
    const isEdit = !!existing;
    const draft = existing ? { ...existing } : { type: 'social', title: '', url: '', description: '' };

    const overlay = openModal({
      title: isEdit ? 'Edit link' : 'Add link',
      bodyHTML: `
        <div class="field">
          <label for="linkType">Link type</label>
          <select class="select" id="linkType">
            ${LINK_TYPES.map(t => `<option value="${t.id}" ${draft.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="linkTitle">Title</label>
          <input class="input" id="linkTitle" type="text" maxlength="60" value="${escapeHTML(draft.title)}" placeholder="e.g. Instagram">
        </div>
        <div class="field">
          <label for="linkUrl">URL</label>
          <input class="input" id="linkUrl" type="text" value="${escapeHTML(draft.url)}" placeholder="instagram.com/yourname">
          <span class="field-error" id="linkUrlError" style="display:none;"></span>
        </div>
        <div class="field">
          <label for="linkDesc">Description <span class="text-muted" style="font-weight:400;">(optional)</span></label>
          <input class="input" id="linkDesc" type="text" maxlength="80" value="${escapeHTML(draft.description || '')}">
        </div>
      `,
      footerHTML: `
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-accent" id="saveLinkBtn">${isEdit ? 'Save changes' : 'Add link'}</button>
      `,
    });

    overlay.querySelector('#saveLinkBtn').addEventListener('click', async () => {
      const title = overlay.querySelector('#linkTitle').value.trim();
      const rawUrl = overlay.querySelector('#linkUrl').value.trim();
      const type = overlay.querySelector('#linkType').value;
      const description = overlay.querySelector('#linkDesc').value.trim();
      const urlError = overlay.querySelector('#linkUrlError');

      if (!title) { toast('Please add a title.', { type: 'error' }); return; }
      const url = normalizeUrl(rawUrl, type);
      if (!url) { urlError.textContent = 'Please add a URL.'; urlError.style.display = 'block'; return; }
      urlError.style.display = 'none';

      const payload = { type, title, url, description };
      if (isEdit) {
        const updated = await api.updateLink(existing.id, payload);
        Object.assign(localLinks.find(l => l.id === existing.id), updated);
        toast('Link updated.', { type: 'success' });
      } else {
        const created = await api.createLink(payload);
        localLinks.push(created);
        toast('Link added.', { type: 'success' });
      }
      closeModal();
      paint();
      onLinksChanged(localLinks);
    });
  }

  paint();
}

function linkCardHTML(link, index, total) {
  return `
    <div class="card link-card" draggable="true" data-id="${link.id}" style="padding:0.9rem 1rem;display:flex;align-items:center;gap:0.85rem;">
      <span class="btn-icon link-card-drag" style="cursor:grab;border:none;" aria-hidden="true">${icon('drag', { size: 16 })}</span>
      <span class="icon-circle">${icon(iconFor(link.type), { size: 17 })}</span>
      <div class="min-w-0 link-card-content" style="flex:1;">
        <div class="flex items-center gap-2">
          <p class="truncate" style="margin:0;font-weight:700;font-size:0.92rem;">${escapeHTML(link.title)}</p>
          <span class="badge ${link.enabled ? 'badge-active' : 'badge-inactive'}"><span class="badge-dot"></span>${link.enabled ? 'Active' : 'Disabled'}</span>
        </div>
        <p class="truncate" style="margin:0.1rem 0 0;font-size:0.78rem;color:var(--text-muted);">${escapeHTML(link.url)}</p>
        <p style="margin:0.2rem 0 0;font-size:0.75rem;color:var(--text-faint);">${formatNumber(link.clicks)} clicks</p>
      </div>
      <div class="flex link-card-actions" style="gap:0.15rem;flex-shrink:0;">
        <button type="button" class="btn-icon" data-up="${link.id}" aria-label="Move up" ${index === 0 ? 'disabled' : ''}>${icon('arrowUp', { size: 14 })}</button>
        <button type="button" class="btn-icon" data-down="${link.id}" aria-label="Move down" ${index === total - 1 ? 'disabled' : ''}>${icon('arrowDown', { size: 14 })}</button>
        <button type="button" class="btn-icon" data-edit="${link.id}" aria-label="Edit link">${icon('edit', { size: 14 })}</button>
        <button type="button" class="btn-icon" data-duplicate="${link.id}" aria-label="Duplicate link">${icon('duplicate', { size: 14 })}</button>
        <button type="button" class="btn-icon" data-toggle="${link.id}" aria-label="${link.enabled ? 'Disable' : 'Enable'} link">${icon(link.enabled ? 'eye' : 'checkCircle', { size: 14 })}</button>
        <button type="button" class="btn-icon" data-delete="${link.id}" aria-label="Delete link" style="color:var(--danger-deep);">${icon('trash', { size: 14 })}</button>
      </div>
    </div>
  `;
}

export { renderLinksPage };
