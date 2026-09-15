import { icon } from './icons.js';

let activeOverlay = null;
let lastFocused = null;

function closeModal() {
  if (!activeOverlay) return;
  activeOverlay.remove();
  activeOverlay = null;
  document.removeEventListener('keydown', onKeydown);
  if (lastFocused) lastFocused.focus();
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab' && activeOverlay) {
    const focusable = activeOverlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// opts: { title, bodyHTML, footerHTML, onMount(panelEl), panelClass }
function openModal({ title, bodyHTML, footerHTML = '', onMount, panelClass = '' }) {
  closeModal();
  lastFocused = document.activeElement;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `
    <div class="modal-panel ${panelClass}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal-header">
        <h2 class="font-display">${title}</h2>
        <button type="button" class="btn-icon" data-close-modal aria-label="Close dialog">${icon('x', { size: 16 })}</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  document.body.appendChild(overlay);
  activeOverlay = overlay;
  document.addEventListener('keydown', onKeydown);

  if (onMount) onMount(overlay.querySelector('.modal-panel'));

  const firstInput = overlay.querySelector('input, textarea, select, button');
  if (firstInput) firstInput.focus();

  return overlay;
}

function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
  const footerHTML = `
    <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
    <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmActionBtn">${confirmLabel}</button>
  `;
  const overlay = openModal({
    title,
    bodyHTML: `<p style="margin:0;color:var(--text-secondary);font-size:0.9rem;line-height:1.5;">${message}</p>`,
    footerHTML,
    panelClass: 'confirm-panel',
  });
  overlay.querySelector('#confirmActionBtn').addEventListener('click', async () => {
    await onConfirm();
    closeModal();
  });
}

export { openModal, closeModal, confirmDialog };
