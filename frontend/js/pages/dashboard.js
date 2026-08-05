// ─── Career OS: Dashboard Page ───
import { listApplications } from '../api.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Your career journey at a glance</p>
    </div>

    <div class="dashboard-grid" id="dashboard-stats">
      ${skeletonCards(4)}
    </div>

    <div class="quick-actions" id="dashboard-actions">
      <div class="glass-card quick-action" data-action="applications">
        <div class="quick-action-icon">📋</div>
        <div class="quick-action-title">Track Application</div>
        <div class="quick-action-desc">Add a new job application to your board</div>
      </div>
      <div class="glass-card quick-action" data-action="matcher">
        <div class="quick-action-icon">🎯</div>
        <div class="quick-action-title">Match Resume</div>
        <div class="quick-action-desc">Check how your resume matches a job description</div>
      </div>
      <div class="glass-card quick-action" data-action="interview">
        <div class="quick-action-icon">🎤</div>
        <div class="quick-action-title">Mock Interview</div>
        <div class="quick-action-desc">Practice with an AI interviewer</div>
      </div>
    </div>

    <div class="dashboard-activity glass-card-static" id="dashboard-activity" style="margin-top:var(--space-8)">
      <h3>Recent Activity</h3>
      <div id="activity-list">
        <div class="skeleton skeleton-text" style="width:90%"></div>
        <div class="skeleton skeleton-text" style="width:70%"></div>
        <div class="skeleton skeleton-text" style="width:80%"></div>
      </div>
    </div>
  `;

  // Quick action navigation
  container.querySelectorAll('.quick-action').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      navigate(`/${action}`);
    });
  });

  // Load real data
  try {
    const apps = await listApplications();
    renderStats(container, apps);
    renderActivity(container, apps);
  } catch (err) {
    showToast(err.message, 'error');
    renderStats(container, []);
    renderActivity(container, []);
  }
}

function renderStats(container, apps) {
  const total = apps.length;
  const stages = {};
  apps.forEach(a => {
    stages[a.stage] = (stages[a.stage] || 0) + 1;
  });

  const statsEl = container.querySelector('#dashboard-stats');
  if (!statsEl) return;
  statsEl.innerHTML = `
    <div class="glass-card-static dashboard-stat slide-up">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--info-bg);color:var(--info)">📋</div>
      </div>
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Applications</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:50ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--warning-bg);color:var(--warning)">💬</div>
      </div>
      <div class="stat-value">${stages.interview || 0}</div>
      <div class="stat-label">In Interview</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:100ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--success-bg);color:var(--success)">🎉</div>
      </div>
      <div class="stat-value">${stages.offer || 0}</div>
      <div class="stat-label">Offers Received</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:150ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:rgba(167,139,250,0.1);color:#a78bfa">📊</div>
      </div>
      <div class="stat-value">${total > 0 ? Math.round(((stages.interview || 0) + (stages.offer || 0)) / total * 100) : 0}%</div>
      <div class="stat-label">Response Rate</div>
    </div>
  `;
}

function renderActivity(container, apps) {
  const activityEl = container.querySelector('#activity-list');
  if (!activityEl) return;
  const recent = apps.slice(0, 5);

  if (recent.length === 0) {
    activityEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-6)">
        <p>No applications yet. Start tracking your job search!</p>
      </div>
    `;
    return;
  }

  activityEl.innerHTML = recent.map(app => {
    const date = new Date(app.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
    const stageColor = `var(--stage-${app.stage})`;

    return `
      <div class="activity-item">
        <div class="activity-dot" style="background:${stageColor}"></div>
        <div>
          <div><strong>${app.company}</strong> — ${app.role}</div>
          <div class="activity-time">${date} · ${app.stage}</div>
        </div>
      </div>
    `;
  }).join('');
}

function skeletonCards(n) {
  return Array.from({ length: n }, () =>
    '<div class="glass-card-static dashboard-stat"><div class="skeleton skeleton-card"></div></div>'
  ).join('');
}
