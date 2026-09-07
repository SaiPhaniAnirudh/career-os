// ─── Career OS: Sidebar Component ───
import { navigate, currentRoute } from '../router.js';
import { signOut, getUser } from '../auth.js';
import { store } from '../state.js';

const NAV_ITEMS = [
  { path: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { path: '/applications', icon: '📋', label: 'Applications' },
  { path: '/matcher',      icon: '🎯', label: 'Matcher' },
  { path: '/skill-gaps',   icon: '📈', label: 'Skill Gaps' },
  { path: '/interview',    icon: '🎤', label: 'Interview' },
  { path: '/peers',        icon: '👥', label: 'Peer Match' },
];

/**
 * Render the sidebar into the app shell. Call once on mount.
 */
export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  const user = store.get('user');
  const email = user?.email || 'User';
  const initial = email.charAt(0).toUpperCase();

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">C</div>
      <span>Career OS</span>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-nav-label">Main</div>
      ${NAV_ITEMS.map(item => `
        <a class="sidebar-link ${currentRoute() === item.path ? 'active' : ''}"
           data-path="${item.path}" href="#${item.path}">
          <span class="sidebar-link-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user-btn">
        <div class="sidebar-avatar">${initial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-email">${email}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" id="sidebar-logout-btn"
        style="width:100%;margin-top:var(--space-2);justify-content:flex-start;gap:var(--space-2)">
        🚪 Sign Out
      </button>
    </div>
  `;

  // Navigation clicks
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.dataset.path;
      navigate(path);
      closeMobileSidebar();
    });
  });

  // Sign out
  sidebar.querySelector('#sidebar-logout-btn').addEventListener('click', async () => {
    await signOut();
    navigate('/login');
  });

  // Update active state on hash change
  window.addEventListener('hashchange', () => updateActiveLink(sidebar));
}

function updateActiveLink(sidebar) {
  const current = currentRoute();
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.path === current);
  });
}

export function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}

export function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}
