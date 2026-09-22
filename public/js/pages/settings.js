import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { confirmDialog } from '../lib/modal.js';
import { isValidEmail } from '../lib/utils.js';

function renderSettingsPage(root, { user, profile, settings, onProfileChanged, onSettingsChanged, onLogout }) {
  root.innerHTML = `
    <div class="page-header">
      <div><h1 class="font-display">Settings</h1><p>Manage your account, security and preferences.</p></div>
    </div>

    <div style="display:flex;flex-direction:column;gap:1.5rem;max-width:36rem;">

      <div class="card card-pad">
        <p class="section-label">Account</p>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div class="field"><label for="stName">Name</label><input class="input" id="stName" value="${user.name}"></div>
          <div class="field"><label for="stEmail">Email</label><input class="input" id="stEmail" type="email" value="${user.email}"></div>
          <div class="field"><label>Username</label><input class="input" value="@${profile.username}" disabled><span class="hint">Change your username from the My Profile page.</span></div>
          <button type="button" class="btn btn-accent" id="saveAccountBtn" style="align-self:flex-start;">Save account</button>
        </div>
      </div>

      <div class="card card-pad">
        <p class="section-label">Security</p>
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div class="field"><label for="stNewPass">New password</label><input class="input" id="stNewPass" type="password" minlength="8" placeholder="At least 8 characters"></div>
          <button type="button" class="btn btn-secondary" id="savePassBtn" style="align-self:flex-start;">Update password</button>
          <div class="sidebar-divider" style="margin:0.25rem 0;"></div>
          <p style="margin:0;font-size:0.85rem;color:var(--text-muted);">Active sessions</p>
          <p style="margin:0;font-size:0.85rem;">This device — current session</p>
        </div>
      </div>

      <div class="card card-pad">
        <p class="section-label">Preferences</p>
        <div style="display:flex;flex-direction:column;gap:0.85rem;">
          <label class="flex items-center justify-between" style="cursor:pointer;">
            <span style="font-size:0.875rem;">Email notifications</span>
            <span class="toggle"><input type="checkbox" id="notifEmail" ${settings.notifications.email ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></span>
          </label>
          <label class="flex items-center justify-between" style="cursor:pointer;">
            <span style="font-size:0.875rem;">Product updates</span>
            <span class="toggle"><input type="checkbox" id="notifProduct" ${settings.notifications.product ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></span>
          </label>
          <label class="flex items-center justify-between" style="cursor:pointer;">
            <span style="font-size:0.875rem;">Show “Save Contact” button</span>
            <span class="toggle"><input type="checkbox" id="saveContactEnabled" ${settings.saveContactEnabled !== false ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></span>
          </label>
          <div class="field">
            <label for="langSelect">Language</label>
            <select class="select" id="langSelect">
              <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español</option>
              <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option>
              <option value="hi" ${settings.language === 'hi' ? 'selected' : ''}>हिन्दी</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card card-pad">
        <p class="section-label">Profile visibility</p>
        <label class="flex items-center justify-between" style="cursor:pointer;">
          <span style="font-size:0.875rem;">Visible in search &amp; discovery</span>
          <span class="toggle"><input type="checkbox" id="searchVisible" ${settings.searchVisible ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></span>
        </label>
      </div>

      <div class="card card-pad" style="border-color:rgba(193,80,80,0.3);">
        <p class="section-label" style="color:var(--danger-deep);">Danger zone</p>
        <p style="margin:0 0 0.85rem;font-size:0.85rem;color:var(--text-muted);">Deleting your account permanently removes your profile, links and analytics. This can't be undone.</p>
        <button type="button" class="btn btn-danger" id="deleteAccountBtn">Delete account</button>
      </div>
    </div>
  `;

  root.querySelector('#saveAccountBtn').addEventListener('click', async () => {
    const name = root.querySelector('#stName').value.trim();
    const email = root.querySelector('#stEmail').value.trim();
    if (!isValidEmail(email)) { toast('Please enter a valid email.', { type: 'error' }); return; }
    const updated = await api.updateProfile({ name, email });
    toast('Account details saved.', { type: 'success' });
    onProfileChanged(updated);
  });

  root.querySelector('#savePassBtn').addEventListener('click', () => {
    const val = root.querySelector('#stNewPass').value;
    if (val && val.length < 8) { toast('Password must be at least 8 characters.', { type: 'error' }); return; }
    toast('Password updated.', { type: 'success' });
    root.querySelector('#stNewPass').value = '';
  });

  let savedPreferences = {
    email: !!settings.notifications.email,
    product: !!settings.notifications.product,
    language: settings.language,
    searchVisible: !!settings.searchVisible,
    saveContactEnabled: settings.saveContactEnabled !== false,
  };

  const savePrefs = async () => {
    const controls = {
      email: root.querySelector('#notifEmail'),
      product: root.querySelector('#notifProduct'),
      language: root.querySelector('#langSelect'),
      searchVisible: root.querySelector('#searchVisible'),
      saveContactEnabled: root.querySelector('#saveContactEnabled'),
    };
    try {
      const updated = await api.updateSettings({
        notifications: { email: controls.email.checked, product: controls.product.checked },
        language: controls.language.value,
        searchVisible: controls.searchVisible.checked,
        saveContactEnabled: controls.saveContactEnabled.checked,
      });
      savedPreferences = {
        email: updated.notifications.email,
        product: updated.notifications.product,
        language: updated.language,
        searchVisible: updated.searchVisible,
        saveContactEnabled: updated.saveContactEnabled,
      };
      onSettingsChanged(updated);
      toast('Preferences saved.', { type: 'success' });
    } catch (err) {
      controls.email.checked = savedPreferences.email;
      controls.product.checked = savedPreferences.product;
      controls.language.value = savedPreferences.language;
      controls.searchVisible.checked = savedPreferences.searchVisible;
      controls.saveContactEnabled.checked = savedPreferences.saveContactEnabled;
      toast(err.message || 'Could not save preferences.', { type: 'error' });
    }
  };
  ['#notifEmail', '#notifProduct', '#langSelect', '#searchVisible', '#saveContactEnabled'].forEach(sel => {
    root.querySelector(sel).addEventListener('change', savePrefs);
  });

  root.querySelector('#deleteAccountBtn').addEventListener('click', () => {
    confirmDialog({
      title: 'Delete your account?',
      message: 'This permanently deletes your Mochimo profile, all links, and all analytics data. This action cannot be undone.',
      confirmLabel: 'Delete my account',
      danger: true,
      onConfirm: async () => {
        await api.deleteAccount();
        toast('Your account has been deleted.');
        onLogout();
      },
    });
  });
}

export { renderSettingsPage };
