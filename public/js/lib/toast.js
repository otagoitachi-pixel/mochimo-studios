import { icon } from './icons.js';

let layer = null;

function ensureLayer() {
  if (!layer) {
    layer = document.getElementById('toastLayer');
  }
  return layer;
}

function toast(message, { type = 'default', duration = 3200 } = {}) {
  const el = ensureLayer();
  if (!el) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  const iconName = type === 'error' ? 'alertCircle' : type === 'success' ? 'checkCircle' : 'check';
  node.innerHTML = `${icon(iconName, { size: 16 })}<span></span>`;
  node.querySelector('span').textContent = message;
  el.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .2s ease';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 200);
  }, duration);
}

export { toast };
