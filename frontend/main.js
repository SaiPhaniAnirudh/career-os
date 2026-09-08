// ─── Career OS: Main Entry Point ───
import './css/variables.css';
import './css/base.css';
import './css/components.css';
import './css/pages.css';

import { route, startRouter, navigate, currentRoute } from './js/router.js';
import { onAuthChange, getUser, supabase } from './js/auth.js';
import { store } from './js/state.js';
import { renderSidebar, openMobileSidebar, closeMobileSidebar } from './js/components/sidebar.js';
import { renderLogin } from './js/pages/login.js';
import { renderDashboard } from './js/pages/dashboard.js';
import { renderApplications } from './js/pages/applications.js';
import { renderAnalytics } from './js/pages/analytics.js';
import { renderMatcher } from './js/pages/matcher.js';
import { renderSkillGaps } from './js/pages/skill_gaps.js';
import { renderInterview } from './js/pages/interview.js';
import { renderPeers } from './js/pages/peers.js';

// ── Auth-aware route guards ──
const PUBLIC_ROUTES = new Set(['/login']);

function showAppShell() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileNav = document.getElementById('mobile-nav');
  if (sidebar) sidebar.style.display = 'flex';
  if (overlay) overlay.style.display = '';
  if (mobileNav) mobileNav.style.display = '';
  document.getElementById('app-main')?.classList.add('app-main');
}

function hideAppShell() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileNav = document.getElementById('mobile-nav');
  if (sidebar) sidebar.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (mobileNav) mobileNav.style.display = 'none';
  document.getElementById('app-main')?.classList.remove('app-main');
}

// ── Register routes ──
route('/login', (container) => {
  hideAppShell();
  renderLogin(container);
});

route('/dashboard', async (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  await renderDashboard(container);
});

route('/applications', async (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  await renderApplications(container);
});

route('/analytics', async (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  await renderAnalytics(container);
});

route('/matcher', (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  renderMatcher(container);
});

route('/skill-gaps', async (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  await renderSkillGaps(container);
});

route('/interview', (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  renderInterview(container);
});

route('/peers', async (container) => {
  if (!store.get('user')) { navigate('/login'); return; }
  showAppShell();
  renderSidebar();
  await renderPeers(container);
});

// ── Prewarm Backend & Database ──
const API_BASE = `${import.meta.env.VITE_API_BASE || 'http://localhost:5000'}/api`;
try {
  fetch(`${API_BASE}/health?ping_db=true`, { mode: 'cors' }).catch(() => {});
} catch {
  // Ignore prewarm failure
}

// ── Initialize ──
async function init() {
  const isOAuthRedirect = window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token=');

  let user = null;
  if (isOAuthRedirect) {
    // Wait for Supabase client to parse the OAuth tokens from the hash
    const { data } = await supabase.auth.getSession();
    user = data?.session?.user ?? (await getUser());
  } else {
    user = await getUser();
  }
  store.set('user', user);

  // Listen for auth changes
  onAuthChange((u) => {
    store.set('user', u);
    if (!u && !PUBLIC_ROUTES.has(currentRoute())) {
      navigate('/login');
    }
  });

  // Mobile sidebar toggle
  document.getElementById('mobile-nav-toggle')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  // Start router
  if (!user && !PUBLIC_ROUTES.has(currentRoute()) && !isOAuthRedirect) {
    navigate('/login');
  } else if (user && (currentRoute() === '/login' || isOAuthRedirect)) {
    navigate('/dashboard');
  }
  startRouter('app-main');

  // ── Register PWA Service Worker ──
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Career OS Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('Career OS Service Worker registration failed:', err);
      });
  }

  // ── Track PWA Installation Prompt ──
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    window.deferredInstallPrompt = null;
    console.log('Career OS installed as a Progressive Web App!');
  });
}

init();

