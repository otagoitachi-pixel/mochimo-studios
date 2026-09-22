import { api } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { debounce, copyToClipboard, isValidUsername } from '../lib/utils.js';
import { toast } from '../lib/toast.js';
import { renderProfilePreview } from '../components/profilePreview.js';

function renderProfilePage(root, { profile, links, appearance, onProfileChanged }) {
  const draft = structuredClone(profile);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="font-display">My Profile</h1>
        <p>This is your digital identity — edit it, and watch it update live.</p>
      </div>
    </div>

    <div class="editor-grid">
      <div class="card card-pad" style="display:flex;flex-direction:column;gap:1.25rem;">

        <div class="field">
          <label>Avatar</label>
          <div class="flex items-center gap-3">
            <div id="avatarPreviewWrap" style="width:64px;height:64px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg-surface-muted);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong);">
              ${draft.avatarUrl ? `<img id="avatarPreviewImg" src="${draft.avatarUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">` : icon('user', { size: 22 })}
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-secondary btn-sm" id="avatarUploadBtn">${icon('upload', { size: 14 })} ${draft.avatarUrl ? 'Change photo' : 'Upload photo'}</button>
              ${draft.avatarUrl ? `<button type="button" class="btn-icon" id="avatarRemoveBtn" aria-label="Remove avatar" style="color:var(--danger-deep);">${icon('trash', { size: 14 })}</button>` : ''}
            </div>
            <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">
          </div>
          <span class="hint">JPG, PNG, WEBP or GIF, up to 5MB.</span>
        </div>

        <div class="field-row cols-2">
          <div class="field">
            <label for="pName">Name</label>
            <input class="input" id="pName" type="text" value="${draft.name || ''}" maxlength="60">
          </div>
          <div class="field">
            <label for="pUsername">Username</label>
            <input class="input" id="pUsername" type="text" value="${draft.username || ''}" maxlength="20">
            <span class="field-error" id="usernameError" style="display:none;"></span>
          </div>
        </div>

        <div class="field">
          <label for="pBio">Bio</label>
          <textarea class="textarea" id="pBio" maxlength="160">${draft.bio || ''}</textarea>
          <span class="hint" id="bioCount">${(draft.bio || '').length}/160</span>
        </div>

        <div class="field-row cols-2">
          <div class="field">
            <label for="pLocation">Location</label>
            <input class="input" id="pLocation" type="text" value="${draft.location || ''}">
          </div>
          <div class="field">
            <label for="pWebsite">Website</label>
            <input class="input" id="pWebsite" type="text" placeholder="yoursite.com" value="${draft.website || ''}">
          </div>
        </div>

        <div class="field-row cols-2">
          <div class="field">
            <label for="pEmail">Email</label>
            <input class="input" id="pEmail" type="email" value="${draft.email || ''}">
          </div>
          <div class="field">
            <label for="pPhone">Phone</label>
            <input class="input" id="pPhone" type="tel" value="${draft.phone || ''}">
          </div>
        </div>

        <div>
          <p style="font-weight:600;font-size:0.9rem;margin:0 0 0.75rem;">Social accounts</p>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            ${socialRow('instagram', 'Instagram', draft.socials.instagram)}
            ${socialRow('youtube', 'YouTube', draft.socials.youtube)}
            ${socialRow('tiktok', 'TikTok', draft.socials.tiktok)}
            ${socialRow('x', 'X', draft.socials.x)}
            ${socialRow('linkedin', 'LinkedIn', draft.socials.linkedin)}
            ${socialRow('facebook', 'Facebook', draft.socials.facebook)}
          </div>
        </div>

        <div class="field">
          <label>Profile URL</label>
          <div class="flex items-center gap-2">
            <input class="input" id="pUrlDisplay" type="text" readonly value="mochimo.studio/u/${draft.username}">
            <button type="button" class="btn-icon" id="copyUrlBtn" aria-label="Copy profile link">${icon('copy', { size: 15 })}</button>
          </div>
        </div>

        <div class="flex gap-3" style="flex-wrap:wrap;">
          <button type="button" class="btn btn-accent" id="saveProfileBtn">Save changes</button>
          <button type="button" class="btn btn-secondary" id="viewProfileBtn2">${icon('externalLink', { size: 15 })} View profile</button>
        </div>
      </div>

      <div class="preview-rail">
        <div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;">
          <p style="font-weight:600;font-size:0.85rem;align-self:flex-start;margin:0 0 0.85rem;">Live preview</p>
          <div class="phone-frame"><div class="phone-screen" id="profilePreviewScreen"></div></div>
          <div class="flex gap-2" style="margin-top:1rem;width:100%;">
            <button type="button" class="btn btn-secondary btn-sm btn-block" id="copyUrlBtn2">${icon('copy', { size: 14 })} Copy link</button>
            <button type="button" class="btn btn-secondary btn-sm btn-block" id="shareBtn2">${icon('share', { size: 14 })} Share</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const previewFrame = root.querySelector('#profilePreviewScreen').closest('.phone-frame');
  const paintPreview = () => renderProfilePreview(previewFrame, { profile: draft, links, appearance });
  paintPreview();

  function bindField(id, key, transform = v => v) {
    root.querySelector(id).addEventListener('input', (e) => {
      draft[key] = transform(e.target.value);
      paintPreview();
    });
  }
  bindField('#pName', 'name');
  bindField('#pLocation', 'location');
  bindField('#pWebsite', 'website');
  bindField('#pEmail', 'email');
  bindField('#pPhone', 'phone');

  root.querySelector('#pBio').addEventListener('input', (e) => {
    draft.bio = e.target.value;
    root.querySelector('#bioCount').textContent = `${e.target.value.length}/160`;
    paintPreview();
  });

  const usernameInput = root.querySelector('#pUsername');
  const usernameError = root.querySelector('#usernameError');
  usernameInput.addEventListener('input', debounce((e) => {
    const val = e.target.value.trim();
    if (!isValidUsername(val)) {
      usernameError.textContent = 'Usernames are 3–20 letters, numbers or underscores.';
      usernameError.style.display = 'block';
      usernameInput.classList.add('has-error');
      return;
    }
    usernameError.style.display = 'none';
    usernameInput.classList.remove('has-error');
    draft.username = val;
    root.querySelector('#pUrlDisplay').value = `mochimo.studio/u/${val}`;
    paintPreview();
  }, 300));

  // Avatar upload: file picker → /api/upload → Supabase Storage.
  const avatarFileInput = root.querySelector('#avatarFileInput');
  const avatarUploadBtn = root.querySelector('#avatarUploadBtn');
  const avatarPreviewWrap = root.querySelector('#avatarPreviewWrap');
  let avatarRemoveBtn = root.querySelector('#avatarRemoveBtn');

  function setAvatarPreview(url) {
    avatarPreviewWrap.innerHTML = url
      ? `<img id="avatarPreviewImg" src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;">`
      : icon('user', { size: 22 });
    avatarUploadBtn.innerHTML = `${icon('upload', { size: 14 })} ${url ? 'Change photo' : 'Upload photo'}`;
    if (url && !avatarRemoveBtn) {
      avatarRemoveBtn = document.createElement('button');
      avatarRemoveBtn.type = 'button';
      avatarRemoveBtn.className = 'btn-icon';
      avatarRemoveBtn.id = 'avatarRemoveBtn';
      avatarRemoveBtn.setAttribute('aria-label', 'Remove avatar');
      avatarRemoveBtn.style.color = 'var(--danger-deep)';
      avatarRemoveBtn.innerHTML = icon('trash', { size: 14 });
      avatarRemoveBtn.addEventListener('click', () => { draft.avatarUrl = ''; setAvatarPreview(''); paintPreview(); });
      avatarUploadBtn.insertAdjacentElement('afterend', avatarRemoveBtn);
    } else if (!url && avatarRemoveBtn) {
      avatarRemoveBtn.remove();
      avatarRemoveBtn = null;
    }
  }
  avatarRemoveBtn?.addEventListener('click', () => { draft.avatarUrl = ''; setAvatarPreview(''); paintPreview(); });
  avatarUploadBtn.addEventListener('click', () => avatarFileInput.click());
  avatarFileInput.addEventListener('change', async () => {
    const file = avatarFileInput.files?.[0];
    avatarFileInput.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Images must be 5MB or smaller.', { type: 'error' }); return; }
    avatarUploadBtn.disabled = true;
    avatarUploadBtn.textContent = 'Uploading…';
    try {
      const url = await api.uploadImage(file);
      draft.avatarUrl = url;
      setAvatarPreview(url);
      paintPreview();
    } catch (err) {
      toast(err.message || 'Could not upload image.', { type: 'error' });
    } finally {
      avatarUploadBtn.disabled = false;
      setAvatarPreview(draft.avatarUrl);
    }
  });

  ['instagram', 'youtube', 'tiktok', 'x', 'linkedin', 'facebook'].forEach(key => {
    root.querySelector(`#social-${key}`).addEventListener('input', (e) => {
      draft.socials[key] = e.target.value;
      paintPreview();
    });
  });

  async function copyLink() {
    const ok = await copyToClipboard(`${location.origin}/u/${draft.username}`);
    toast(ok ? 'Profile link copied.' : 'Could not copy — try manually.', { type: ok ? 'success' : 'error' });
  }
  root.querySelector('#copyUrlBtn').addEventListener('click', copyLink);
  root.querySelector('#copyUrlBtn2').addEventListener('click', copyLink);
  root.querySelector('#shareBtn2').addEventListener('click', copyLink);
  root.querySelector('#viewProfileBtn2').addEventListener('click', () => window.open(`u.html?u=${encodeURIComponent(draft.username)}`, '_blank'));

  root.querySelector('#saveProfileBtn').addEventListener('click', async () => {
    if (usernameInput.classList.contains('has-error')) {
      toast('Please fix the username before saving.', { type: 'error' });
      return;
    }
    const btn = root.querySelector('#saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const saved = await api.updateProfile(draft);
      toast('Profile saved.', { type: 'success' });
      onProfileChanged(saved);
    } catch (err) {
      toast(err.message || 'Could not save profile.', { type: 'error' });
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  });
}

function socialRow(key, label, value) {
  return `
    <div class="flex items-center gap-2">
      <span class="icon-circle" style="height:36px;width:36px;flex-shrink:0;">${icon(key, { size: 15 })}</span>
      <input class="input" id="social-${key}" type="text" placeholder="${label} username or URL" value="${value || ''}">
    </div>
  `;
}

export { renderProfilePage };
