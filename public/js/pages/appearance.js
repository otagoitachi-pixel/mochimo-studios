import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { icon } from '../lib/icons.js';
import { renderProfilePreview } from '../components/profilePreview.js';

const THEMES = [
  { id: 'mochimo', label: 'Mochimo', swatch: '#FBF6EF' },
  { id: 'minimal', label: 'Minimal', swatch: '#FFFFFF' },
  { id: 'soft', label: 'Soft', swatch: '#FEFBF8' },
  { id: 'lavender', label: 'Lavender', swatch: '#EAE3F8' },
  { id: 'blush', label: 'Blush', swatch: '#F6E1E6' },
  { id: 'dark', label: 'Dark', swatch: '#221F35' },
  { id: 'photographer', label: 'Photographer', swatch: 'linear-gradient(135deg, #17140F, #CBA968)' },
];
const GALLERY_CATEGORIES = ['', 'Weddings', 'Portraits', 'Events', 'Lifestyle'];
const MEDIA_TYPES = { image: { label: 'Photo', accept: 'image/jpeg,image/png,image/webp,image/gif', maxBytes: 5 * 1024 * 1024 }, video: { label: 'Reel', accept: 'video/mp4,video/webm', maxBytes: 30 * 1024 * 1024 } };
const BUTTON_STYLES = ['soft', 'rounded', 'pill', 'outline', 'minimal'];
const LAYOUTS = ['classic', 'compact', 'spacious'];
const FONTS = [
  { id: 'fraunces', label: 'Fraunces (default)' },
  { id: 'jakarta', label: 'Plus Jakarta Sans' },
];
const BACKGROUNDS = ['cream', 'blush', 'lavender', 'dark', 'custom'];

function renderAppearancePage(root, { profile, links, appearance, onAppearanceChanged }) {
  const draft = structuredClone(appearance);
  draft.photographerGallery = draft.photographerGallery || [];
  draft.heroMedia = draft.heroMedia && typeof draft.heroMedia === 'object' ? draft.heroMedia : { type: 'image', url: '' };

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

          ${draft.theme === 'photographer' ? `
          <div class="card card-pad">
            <p class="section-label">Hero image</p>
            <p class="hint" style="margin:-0.5rem 0 0.9rem;">The large banner behind your profile photo. It's separate from Featured Work below, so it won't repeat there.</p>
            <div class="flex items-center gap-2" style="flex-wrap:wrap;">
              <div id="heroPreviewWrap" style="width:64px;height:64px;border-radius:var(--r-md);overflow:hidden;flex-shrink:0;background:var(--bg-surface-muted);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);">
                ${draft.heroMedia.url ? (draft.heroMedia.type === 'video'
                  ? `<video id="heroPreviewMedia" src="${draft.heroMedia.url}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>`
                  : `<img id="heroPreviewMedia" src="${draft.heroMedia.url}" alt="" style="width:100%;height:100%;object-fit:cover;">`) : icon('camera', { size: 22 })}
              </div>
              <select class="select" id="heroTypeSelect" style="width:auto;min-width:6.5rem;">
                <option value="image" ${draft.heroMedia.type !== 'video' ? 'selected' : ''}>Photo</option>
                <option value="video" ${draft.heroMedia.type === 'video' ? 'selected' : ''}>Video</option>
              </select>
              <button type="button" class="btn btn-secondary btn-sm" id="heroUploadBtn">${icon('upload', { size: 14 })} ${draft.heroMedia.url ? 'Replace' : 'Add Hero Image'}</button>
              ${draft.heroMedia.url ? `<button type="button" class="btn-icon" id="heroRemoveBtn" aria-label="Remove hero media" style="color:var(--danger-deep);">${icon('trash', { size: 14 })}</button>` : ''}
              <span class="hint" id="heroStatus" style="flex-basis:100%;"></span>
            </div>
            <input type="file" id="heroFileInput" accept="${MEDIA_TYPES[draft.heroMedia.type === 'video' ? 'video' : 'image'].accept}" style="display:none;">
          </div>

          <div class="card card-pad">
            <p class="section-label">Featured Work gallery</p>
            <p class="hint" style="margin:-0.5rem 0 0.9rem;">Add photos and reels below — they rotate automatically on the public profile, separate from your hero image above.</p>
            <div id="galleryList" style="display:flex;flex-direction:column;gap:0.75rem;"></div>
            <div class="flex items-center gap-2" style="margin-top:0.85rem;flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="addGalleryImageBtn">+ Add photo</button>
              <button type="button" class="btn btn-secondary btn-sm" id="addGalleryReelBtn">${icon('video', { size: 13 })} Add reel</button>
            </div>
          </div>
          ` : ''}

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

    if (draft.theme === 'photographer') {
      // --- Hero image (separate from the Featured Work gallery) ---
      const heroTypeSelect = root.querySelector('#heroTypeSelect');
      const heroUploadBtn = root.querySelector('#heroUploadBtn');
      const heroFileInput = root.querySelector('#heroFileInput');
      const heroStatus = root.querySelector('#heroStatus');

      heroTypeSelect.addEventListener('change', (e) => {
        const nextType = e.target.value === 'video' ? 'video' : 'image';
        draft.heroMedia.type = nextType;
        // Clear a previous URL when switching type so a photo is never
        // accidentally submitted as a video hero, or vice versa.
        draft.heroMedia.url = '';
        heroFileInput.accept = MEDIA_TYPES[nextType].accept;
        paint();
      });
      heroUploadBtn.addEventListener('click', () => heroFileInput.click());
      heroFileInput.addEventListener('change', async () => {
        const file = heroFileInput.files?.[0];
        heroFileInput.value = '';
        if (!file) return;
        const type = draft.heroMedia.type === 'video' ? 'video' : 'image';
        const config = MEDIA_TYPES[type];
        if (!config.accept.split(',').includes(file.type)) {
          toast(type === 'video' ? 'Please upload an MP4 or WebM video.' : 'Please upload a JPG, PNG, WEBP or GIF image.', { type: 'error' });
          return;
        }
        if (file.size > config.maxBytes) {
          toast(type === 'video' ? 'Hero video must be 30MB or smaller.' : 'Hero image must be 5MB or smaller.', { type: 'error' });
          return;
        }
        heroUploadBtn.disabled = true;
        heroStatus.textContent = 'Uploading…';
        try {
          const data = await api.uploadMedia(file);
          if (data.type !== type) throw new Error('Uploaded media type did not match the selected type.');
          draft.heroMedia.url = data.url;
          paint();
        } catch (err) {
          toast(err.message || `Could not upload hero ${type === 'video' ? 'video' : 'image'}.`, { type: 'error' });
          heroUploadBtn.disabled = false;
          heroStatus.textContent = '';
        }
      });
      root.querySelector('#heroRemoveBtn')?.addEventListener('click', () => {
        draft.heroMedia = { type: 'image', url: '' };
        paint();
      });

      const galleryList = root.querySelector('#galleryList');
      const paintGalleryRows = () => {
        galleryList.innerHTML = draft.photographerGallery.length ? draft.photographerGallery.map((g, i) => `
          <div class="card" style="padding:0.85rem;display:flex;flex-direction:column;gap:0.5rem;background:var(--bg-surface-muted);">
            <div class="flex items-center gap-2">
              <div style="width:44px;height:44px;border-radius:var(--r-md);overflow:hidden;flex-shrink:0;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);">
                ${g.url ? (g.type === 'video' ? `<video src="${g.url}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>` : `<img src="${g.url}" alt="" style="width:100%;height:100%;object-fit:cover;">`) : icon(g.type === 'video' ? 'video' : 'camera', { size: 16 })}
              </div>
              <select class="select" data-gallery-type="${i}" style="width:auto;min-width:6.5rem;">
                <option value="image" ${(g.type || 'image') === 'image' ? 'selected' : ''}>Photo</option>
                <option value="video" ${g.type === 'video' ? 'selected' : ''}>Reel</option>
              </select>
              <button type="button" class="btn btn-secondary btn-sm" data-gallery-upload="${i}" style="flex-shrink:0;">${icon('upload', { size: 13 })} ${g.url ? 'Replace' : 'Upload'}</button>
              <span class="hint" data-gallery-status="${i}" style="flex:1;min-width:0;"></span>
              <input type="file" accept="${MEDIA_TYPES[g.type === 'video' ? 'video' : 'image'].accept}" data-gallery-file="${i}" style="display:none;">
              <button type="button" class="btn-icon" data-gallery-remove="${i}" aria-label="Remove ${g.type === 'video' ? 'reel' : 'photo'}" style="color:var(--danger-deep);flex-shrink:0;">✕</button>
            </div>
            <div class="field-row cols-2">
              <input class="input" type="text" placeholder="Caption (optional)" value="${g.caption || ''}" data-gallery-caption="${i}" maxlength="80">
              <select class="select" data-gallery-category="${i}">
                ${GALLERY_CATEGORIES.map(c => `<option value="${c}" ${g.category === c ? 'selected' : ''}>${c || 'No category'}</option>`).join('')}
              </select>
            </div>
          </div>
        `).join('') : `<p class="hint" style="margin:0;">No featured work yet — add a photo or reel below.</p>`;

        galleryList.querySelectorAll('[data-gallery-upload]').forEach(btn => {
          btn.addEventListener('click', () => {
            galleryList.querySelector(`[data-gallery-file="${btn.dataset.galleryUpload}"]`).click();
          });
        });
        galleryList.querySelectorAll('[data-gallery-type]').forEach(select => {
          select.addEventListener('change', (e) => {
            const i = Number(e.target.dataset.galleryType);
            const nextType = e.target.value === 'video' ? 'video' : 'image';
            draft.photographerGallery[i].type = nextType;
            // Clear a previous URL when changing the media type so an old photo
            // is never accidentally submitted as a reel (or vice versa).
            if (draft.photographerGallery[i].url) draft.photographerGallery[i].url = '';
            paintGalleryRows();
            paintPreview();
          });
        });

        galleryList.querySelectorAll('[data-gallery-file]').forEach(input => {
          input.addEventListener('change', async () => {
            const i = Number(input.dataset.galleryFile);
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            const type = draft.photographerGallery[i]?.type === 'video' ? 'video' : 'image';
            const config = MEDIA_TYPES[type];
            if (!config.accept.split(',').includes(file.type)) {
              toast(type === 'video' ? 'Please upload an MP4 or WebM reel.' : 'Please upload a JPG, PNG, WEBP or GIF image.', { type: 'error' });
              return;
            }
            if (file.size > config.maxBytes) {
              toast(type === 'video' ? 'Reels must be 30MB or smaller.' : 'Images must be 5MB or smaller.', { type: 'error' });
              return;
            }
            const statusEl = galleryList.querySelector(`[data-gallery-status="${i}"]`);
            const btn = galleryList.querySelector(`[data-gallery-upload="${i}"]`);
            btn.disabled = true;
            statusEl.textContent = 'Uploading…';
            try {
              const data = await api.uploadMedia(file);
              if (data.type !== type) throw new Error('Uploaded media type did not match the selected type.');
              draft.photographerGallery[i].url = data.url;
              paintGalleryRows();
              paintPreview();
            } catch (err) {
              toast(err.message || `Could not upload ${type === 'video' ? 'reel' : 'image'}.`, { type: 'error' });
              btn.disabled = false;
              statusEl.textContent = '';
            }
          });
        });
        galleryList.querySelectorAll('[data-gallery-caption]').forEach(input => {
          input.addEventListener('input', (e) => { draft.photographerGallery[Number(e.target.dataset.galleryCaption)].caption = e.target.value; paintPreview(); });
        });
        galleryList.querySelectorAll('[data-gallery-category]').forEach(select => {
          select.addEventListener('change', (e) => { draft.photographerGallery[Number(e.target.dataset.galleryCategory)].category = e.target.value; paintPreview(); });
        });
        galleryList.querySelectorAll('[data-gallery-remove]').forEach(btn => {
          btn.addEventListener('click', () => { draft.photographerGallery.splice(Number(btn.dataset.galleryRemove), 1); paintGalleryRows(); paintPreview(); });
        });
      };
      paintGalleryRows();

      root.querySelector('#addGalleryImageBtn').addEventListener('click', () => {
        draft.photographerGallery.push({ type: 'image', url: '', caption: '', category: '' });
        paintGalleryRows();
      });
      root.querySelector('#addGalleryReelBtn').addEventListener('click', () => {
        draft.photographerGallery.push({ type: 'video', url: '', caption: '', category: '' });
        paintGalleryRows();
      });
    }

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
