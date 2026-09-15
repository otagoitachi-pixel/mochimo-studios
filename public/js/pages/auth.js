import { api, ApiError } from '../lib/api.js';
import { icon } from '../lib/icons.js';
import { toast } from '../lib/toast.js';

function renderAuth(root, { onAuthed }) {
  let mode = 'signup';

  function paint() {
    root.innerHTML = `
      <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:1.5rem;">
        <div class="card card-pad" style="width:100%;max-width:26rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;justify-content:center;margin-bottom:1.25rem;">
            ${icon('cat', { size: 26 })}
            <span class="font-display" style="font-size:1.3rem;">Mochimo</span>
          </div>
          <h1 class="font-display" style="text-align:center;font-size:1.5rem;margin:0 0 0.35rem;">
            ${mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style="text-align:center;color:var(--text-muted);font-size:0.88rem;margin:0 0 1.5rem;">
            ${mode === 'signup' ? 'Start building your Mochimo profile.' : 'Log in to manage your Mochimo profile.'}
          </p>

          <form id="authForm" novalidate style="display:flex;flex-direction:column;gap:1rem;">
            ${mode === 'signup' ? `
              <div class="field">
                <label for="authName">Name</label>
                <input class="input" id="authName" name="name" type="text" autocomplete="name" required>
              </div>
              <div class="field">
                <label for="authUsername">Username</label>
                <input class="input" id="authUsername" name="username" type="text" autocomplete="username" placeholder="yourname" required>
                <span class="hint">3–20 letters, numbers or underscores. This becomes mochimo.studio/u/yourname.</span>
              </div>
            ` : `
              <div class="field">
                <label for="authIdentifier">Email or username</label>
                <input class="input" id="authIdentifier" name="emailOrUsername" type="text" autocomplete="username" required>
              </div>
            `}
            ${mode === 'signup' ? `
              <div class="field">
                <label for="authEmail">Email</label>
                <input class="input" id="authEmail" name="email" type="email" autocomplete="email" required>
              </div>
            ` : ''}
            <div class="field">
              <label for="authPassword">Password</label>
              <input class="input" id="authPassword" name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required minlength="8">
              ${mode === 'signup' ? '<span class="hint">At least 8 characters.</span>' : ''}
            </div>
            <p id="authError" class="field-error" style="display:none;"></p>
            <button type="submit" class="btn btn-accent btn-block" id="authSubmitBtn">
              ${mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
            ${mode === 'login' ? `<button type="button" class="btn btn-ghost btn-block" id="forgotBtn">Forgot password?</button>` : ''}
          </form>

          <p style="text-align:center;font-size:0.85rem;color:var(--text-muted);margin-top:1.25rem;">
            ${mode === 'signup' ? 'Already have a Mochimo?' : "Don't have a Mochimo yet?"}
            <button type="button" id="switchModeBtn" style="background:none;border:none;color:var(--rose-deep);font-weight:600;cursor:pointer;padding:0;">
              ${mode === 'signup' ? 'Log in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    `;

    root.querySelector('#switchModeBtn').addEventListener('click', () => {
      mode = mode === 'signup' ? 'login' : 'signup';
      paint();
    });

    root.querySelector('#forgotBtn')?.addEventListener('click', () => {
      toast('Password reset isn\u2019t available yet in this preview \u2014 it requires a real email backend.', { type: 'default', duration: 4200 });
    });

    root.querySelector('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorEl = root.querySelector('#authError');
      errorEl.style.display = 'none';
      const submitBtn = root.querySelector('#authSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = mode === 'signup' ? 'Creating account…' : 'Logging in…';

      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const user = mode === 'signup' ? await api.signup(data) : await api.login(data);
        toast(mode === 'signup' ? 'Welcome to Mochimo!' : 'Welcome back!', { type: 'success' });
        onAuthed(user);
      } catch (err) {
        errorEl.textContent = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Log in';
      }
    });
  }

  paint();
}

export { renderAuth };
