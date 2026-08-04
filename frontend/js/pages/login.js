// ─── Career OS: Login Page ───
import { signIn, signUp } from '../auth.js';
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
                <div class="login-feature-icon">🌍</div>
                <span>Built for job seekers & career switchers worldwide</span>
              </div>
            </div>
          </div>
        </div>

        <div class="login-form-panel">
          <div class="login-form-container">
            <h2>${isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p>${isSignUp ? 'Start your career journey today' : 'Sign in to your career dashboard'}</p>

            <div id="login-error" class="login-error" style="display:none"></div>

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
        container.querySelector('.login-form').innerHTML = `
          <div class="empty-state" style="padding:var(--space-6)">
            <div class="empty-state-icon">📧</div>
            <h3>Check your email</h3>
            <p>We sent a confirmation link to <strong>${email}</strong>. Click it to activate your account, then sign in.</p>
            <button class="btn btn-secondary" onclick="location.hash='/login'">Back to Sign In</button>
          </div>
        `;
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
