import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { formatNumber, normalizeUrl, escapeHTML } from '../lib/utils.js';
import { toast } from '../lib/toast.js';
import { openModal, closeModal, confirmDialog } from '../lib/modal.js';

const LINK_TYPES = [
  { id: 'social', label: 'Social', icon: 'link' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
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

async function renderLinksPage(root, { links, onLinksChanged }) {
  let localLinks = links;

  function paint() {
    const activeCount = localLinks.filter(l => l.enabled).length;
    root.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="font-display">My Links</h1>
          <p>Build the perfect version of your profile.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-accent" id="addLinkBtn">${icon('plus', { size: 15 })} Add Link</button>
        </div>
      </div>

      <p class="text-muted" style="font-size:0.85rem;margin:-0.75rem 0 1.25rem;">${activeCount} active link${activeCount === 1 ? '' : 's'} of ${localLinks.length} total</p>

      <div id="linksList" style="display:flex;flex-direction:column;gap:0.75rem;"></div>
    `;

    root.querySelector('#addLinkBtn').addEventListener('click', () => openLinkModal());

    const listEl = root.querySelector('#linksList');
    if (!localLinks.length) {
      listEl.innerHTML = `
        <div class="card empty-state">
          <span class="empty-icon">${icon('link', { size: 24 })}</span>
          <h3>Your profile is waiting for its first link.</h3>
          <p>Add Instagram, your website, WhatsApp — whatever matters most.</p>
          <button type="button" class="btn btn-accent btn-sm" id="emptyAddLinkBtn">${icon('plus', { size: 14 })} Add your first link</button>
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
