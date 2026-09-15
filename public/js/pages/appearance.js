import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { renderProfilePreview } from '../components/profilePreview.js';

const THEMES = [
  { id: 'mochimo', label: 'Mochimo', swatch: '#FBF6EF' },
  { id: 'minimal', label: 'Minimal', swatch: '#FFFFFF' },
  { id: 'soft', label: 'Soft', swatch: '#FEFBF8' },
  { id: 'lavender', label: 'Lavender', swatch: '#EAE3F8' },
  { id: 'blush', label: 'Blush', swatch: '#F6E1E6' },
  { id: 'dark', label: 'Dark', swatch: '#221F35' },
];
const BUTTON_STYLES = ['soft', 'rounded', 'pill', 'outline', 'minimal'];
const LAYOUTS = ['classic', 'compact', 'spacious'];
const FONTS = [
  { id: 'fraunces', label: 'Fraunces (default)' },
  { id: 'jakarta', label: 'Plus Jakarta Sans' },
];
const BACKGROUNDS = ['cream', 'blush', 'lavender', 'dark', 'custom'];

function renderAppearancePage(root, { profile, links, appearance, onAppearanceChanged }) {
  const draft = structuredClone(appearance);

  function paint() {
    root.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="font-display">Appearance</h1>
          <p>Design a profile that feels unmistakably like you.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-accent" id="saveAppearanceBtn">Save changes</button>
        </div>
      </div>

      <div class="editor-grid">
        <div style="display:flex;flex-direction:column;gap:1.5rem;min-width:0;">

          <div class="card card-pad">
            <p class="section-label">Theme</p>
            <div class="swatch-grid">
              ${THEMES.map(t => `
                <button type="button" class="swatch-btn ${draft.theme === t.id ? 'active' : ''}" data-theme="${t.id}" style="background:${t.swatch};" aria-pressed="${draft.theme === t.id}">
                  ${draft.theme === t.id ? '<span class="swatch-check">✓</span>' : ''}
                </button>
                <span class="swatch-label">${t.label}</span>
              `).join('')}
            </div>
          </div>

          <div class="card card-pad">
            <p class="section-label">Button style</p>
            <div class="chip-row">
              ${BUTTON_STYLES.map(b => `<button type="button" class="chip ${draft.buttonStyle === b ? 'active' : ''}" data-button="${b}">${cap(b)}</button>`).join('')}
            </div>
          </div>

          <div class="card card-pad">
            <p class="section-label">Layout</p>
            <div class="chip-row">
              ${LAYOUTS.map(l => `<button type="button" class="chip ${draft.layout === l ? 'active' : ''}" data-layout="${l}">${cap(l)}</button>`).join('')}
            </div>
          </div>

          <div class="card card-pad">
            <p class="section-label">Font</p>
            <select class="select" id="fontSelect">
              ${FONTS.map(f => `<option value="${f.id}" ${draft.font === f.id ? 'selected' : ''}>${f.label}</option>`).join('')}
            </select>
          </div>

          <div class="card card-pad">
            <p class="section-label">Background</p>
            <div class="chip-row">
              ${BACKGROUNDS.map(b => `<button type="button" class="chip ${draft.background === b ? 'active' : ''}" data-bg="${b}">${cap(b)}</button>`).join('')}
            </div>
            ${draft.background === 'custom' ? `
              <div class="field" style="margin-top:0.75rem;max-width:12rem;">
                <label for="customBgInput">Custom color</label>
                <input type="color" id="customBgInput" value="${draft.customBg || '#FBF6EF'}" style="height:40px;width:100%;border-radius:var(--r-md);border:1px solid var(--border-strong);cursor:pointer;">
              </div>
            ` : ''}
          </div>

          <div class="card card-pad">
            <p class="section-label">Accent color</p>
            <input type="color" id="accentInput" value="${draft.accentColor}" style="height:40px;width:100%;max-width:12rem;border-radius:var(--r-md);border:1px solid var(--border-strong);cursor:pointer;">
          </div>

          <div class="card card-pad">
            <p class="section-label">Profile effects</p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
              ${effectRow('shadows', 'Shadows', draft.effects.shadows)}
              ${effectRow('borders', 'Borders', draft.effects.borders)}
              ${effectRow('bgShapes', 'Background shapes', draft.effects.bgShapes)}
              ${effectRow('animations', 'Animations', draft.effects.animations)}
            </div>
          </div>
        </div>

        <div class="preview-rail">
          <div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;">
            <p style="font-weight:600;font-size:0.85rem;align-self:flex-start;margin:0 0 0.85rem;">Live preview</p>
            <div class="phone-frame"><div class="phone-screen" id="appearancePreview"></div></div>
          </div>
        </div>
      </div>
    `;

    const previewFrame = root.querySelector('#appearancePreview').closest('.phone-frame');
    const paintPreview = () => renderProfilePreview(previewFrame, { profile, links, appearance: draft });
    paintPreview();

    root.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => { draft.theme = btn.dataset.theme; paint(); }));
    root.querySelectorAll('[data-button]').forEach(btn => btn.addEventListener('click', () => { draft.buttonStyle = btn.dataset.button; paint(); }));
    root.querySelectorAll('[data-layout]').forEach(btn => btn.addEventListener('click', () => { draft.layout = btn.dataset.layout; paint(); }));
    root.querySelectorAll('[data-bg]').forEach(btn => btn.addEventListener('click', () => { draft.background = btn.dataset.bg; paint(); }));
    root.querySelector('#fontSelect').addEventListener('change', (e) => { draft.font = e.target.value; paintPreview(); });
    root.querySelector('#accentInput').addEventListener('input', (e) => { draft.accentColor = e.target.value; paintPreview(); });
    root.querySelector('#customBgInput')?.addEventListener('input', (e) => { draft.customBg = e.target.value; paintPreview(); });

    root.querySelectorAll('[data-effect]').forEach(input => {
      input.addEventListener('change', (e) => { draft.effects[e.target.dataset.effect] = e.target.checked; paintPreview(); });
    });

    root.querySelector('#saveAppearanceBtn').addEventListener('click', async () => {
      const btn = root.querySelector('#saveAppearanceBtn');
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        const saved = await api.updateAppearance(draft);
        toast('Appearance saved.', { type: 'success' });
        onAppearanceChanged(saved);
      } catch (err) {
        toast(err.message || 'Could not save appearance.', { type: 'error' });
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save changes';
      }
    });
  }

  paint();
}

function effectRow(key, label, checked) {
  return `
    <label class="flex items-center justify-between" style="cursor:pointer;">
      <span style="font-size:0.875rem;color:var(--text-secondary);">${label}</span>
      <span class="toggle">
        <input type="checkbox" data-effect="${key}" ${checked ? 'checked' : ''}>
        <span class="track"></span><span class="thumb"></span>
      </span>
    </label>
  `;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export { renderAppearancePage };
