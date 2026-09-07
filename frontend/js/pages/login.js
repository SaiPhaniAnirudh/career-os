// ─── Career OS: Login Page ───
import { signIn, signUp, signInWithOAuth } from '../auth.js';
import { navigate } from '../router.js';

export function renderLogin(container) {
  let isSignUp = false;

  function render() {
    container.innerHTML = `
      <div class="login-page">
        <div class="login-hero">
          <div class="login-hero-content">
            <div class="login-hero-logo">C</div>
            <h1 class="text-gradient">Career OS</h1>
            <p>Your AI-powered career command center. Match resumes, practice interviews, and track applications — all in one place.</p>

            <div class="login-features">
              <div class="login-feature">
                <div class="login-feature-icon">🎯</div>
                <span>AI-powered resume & JD matching with skill gap analysis</span>
              </div>
              <div class="login-feature">
                <div class="login-feature-icon">🎤</div>
                <span>Mock interviews with real-time AI feedback</span>
              </div>
              <div class="login-feature">
                <div class="login-feature-icon">📋</div>
                <span>Visual kanban board to track every application</span>
              </div>
              <div class="login-feature">
                <div class="login-feature-icon">👥</div>
                <span>Peer matchmaking for mock practice & accountability</span>
              </div>
            </div>
          </div>
        </div>

        <div class="login-form-panel">
          <div class="login-form-container">
            <h2>${isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p>${isSignUp ? 'Start your career journey today' : 'Sign in to your career dashboard'}</p>

            <div id="login-error" class="login-error" style="display:none"></div>

            <div class="oauth-buttons" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-top:var(--space-4)">
              <button type="button" class="btn btn-secondary" id="oauth-google" style="justify-content:center;gap:var(--space-2)">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9c0-.7 0-1.4 0-2z"/><path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"/></svg>
                <span>Google</span>
              </button>
              <button type="button" class="btn btn-secondary" id="oauth-github" style="justify-content:center;gap:var(--space-2)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>GitHub</span>
              </button>
            </div>

            <div style="display:flex;align-items:center;margin:var(--space-4) 0;color:var(--text-tertiary);font-size:var(--text-xs)">
              <div style="flex:1;height:1px;background:var(--border-subtle)"></div>
              <span style="padding:0 var(--space-3)">or with email</span>
              <div style="flex:1;height:1px;background:var(--border-subtle)"></div>
            </div>

            <form class="login-form" id="login-form">
              <div class="input-group">
                <label for="login-email">Email</label>
                <input type="email" class="input" id="login-email"
                  placeholder="you@example.com" required autocomplete="email">
              </div>

              <div class="input-group">
                <label for="login-password">Password</label>
                <input type="password" class="input" id="login-password"
                  placeholder="••••••••" required minlength="6" autocomplete="current-password">
              </div>

              ${isSignUp ? `
                <div class="input-group">
                  <label for="login-confirm">Confirm Password</label>
                  <input type="password" class="input" id="login-confirm"
                    placeholder="••••••••" required minlength="6" autocomplete="new-password">
                </div>
              ` : ''}

              <button type="submit" class="btn btn-primary btn-lg" id="login-submit-btn">
                ${isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div class="login-toggle">
              ${isSignUp
                ? 'Already have an account? <a id="toggle-auth">Sign in</a>'
                : "Don't have an account? <a id=\"toggle-auth\">Sign up</a>"
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Social OAuth handlers
    container.querySelector('#oauth-google')?.addEventListener('click', async () => {
      const { error } = await signInWithOAuth('google');
      if (error) {
        const errorEl = container.querySelector('#login-error');
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
      }
    });

    container.querySelector('#oauth-github')?.addEventListener('click', async () => {
      const { error } = await signInWithOAuth('github');
      if (error) {
        const errorEl = container.querySelector('#login-error');
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
      }
    });

    // Toggle between sign-in / sign-up
    container.querySelector('#toggle-auth')?.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = !isSignUp;
      render();
    });

    // Form submit
    container.querySelector('#login-form').addEventListener('submit', handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errorEl = container.querySelector('#login-error');
    const submitBtn = container.querySelector('#login-submit-btn');

    const emailInput = container.querySelector('#login-email');
    const passwordInput = container.querySelector('#login-password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isSignUp) {
      const confirmInput = container.querySelector('#login-confirm');
      const confirm = confirmInput ? confirmInput.value : '';
      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.style.display = 'block';
        return;
      }
    }

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span>';

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        errorEl.textContent = error.message || 'Authentication failed.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
        return;
      }

      if (isSignUp) {
        errorEl.style.display = 'none';
        // Show success message for email confirmation
        const formEl = container.querySelector('.login-form');
        formEl.innerHTML = `
          <div class="empty-state" style="padding:var(--space-6)">
            <div class="empty-state-icon">📧</div>
            <h3>Check your email</h3>
            <p>We sent a confirmation link to <strong>${email}</strong>. Click it to activate your account, then sign in.</p>
            <button class="btn btn-secondary" id="back-to-signin-btn">Back to Sign In</button>
          </div>
        `;
        formEl.querySelector('#back-to-signin-btn')?.addEventListener('click', () => {
          isSignUp = false;
          render();
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
    }
  }

  render();
}
