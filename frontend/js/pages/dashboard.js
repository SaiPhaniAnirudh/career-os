// ─── Career OS: Dashboard Page ───
import { listApplications, getSkillGaps } from '../api.js';
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
      <div class="glass-card quick-action" data-action="skill-gaps">
        <div class="quick-action-icon">📈</div>
        <div class="quick-action-title">Skill Gaps</div>
        <div class="quick-action-desc">Review high-demand missing skills</div>
      </div>
      <div class="glass-card quick-action" data-action="interview">
        <div class="quick-action-icon">🎤</div>
        <div class="quick-action-title">Mock Interview</div>
        <div class="quick-action-desc">Practice with an AI interviewer</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:var(--space-6);margin-top:var(--space-8)">
      <div class="dashboard-activity glass-card-static" id="dashboard-activity">
        <h3>Recent Activity</h3>
        <div id="activity-list">
          <div class="skeleton skeleton-text" style="width:90%"></div>
          <div class="skeleton skeleton-text" style="width:70%"></div>
          <div class="skeleton skeleton-text" style="width:80%"></div>
        </div>
      </div>

      <div class="dashboard-activity glass-card-static" id="dashboard-skill-gaps">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <h3 style="margin:0">Top Skill Gaps</h3>
          <a href="#/skill-gaps" style="font-size:var(--text-xs);color:var(--accent-solid)">View All →</a>
        </div>
        <div id="skill-gaps-summary-list">
          <div class="skeleton skeleton-text" style="width:85%"></div>
          <div class="skeleton skeleton-text" style="width:65%"></div>
          <div class="skeleton skeleton-text" style="width:75%"></div>
        </div>
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

  // Load real data in parallel
  const [appsRes, gapsRes] = await Promise.allSettled([
    listApplications(),
    getSkillGaps(),
  ]);

  if (appsRes.status === 'fulfilled') {
    renderStats(container, appsRes.value);
    renderActivity(container, appsRes.value);
  } else {
    showToast(appsRes.reason.message, 'error');
    renderStats(container, []);
    renderActivity(container, []);
  }

  if (gapsRes.status === 'fulfilled') {
    renderSkillGapsSummary(container, gapsRes.value);
  } else {
    renderSkillGapsSummary(container, { matches_considered: 0, gaps: [] });
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

function renderSkillGapsSummary(container, data) {
  const summaryEl = container.querySelector('#skill-gaps-summary-list');
  if (!summaryEl) return;

  const gaps = (data.gaps || []).slice(0, 5);
  if (gaps.length === 0) {
    summaryEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-6)">
        <p>No skill gaps yet. Run the <a href="#/matcher" style="color:var(--accent-solid)">Resume Matcher</a> to detect missing keywords.</p>
      </div>
    `;
    return;
  }

  summaryEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${gaps.map((g, idx) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:rgba(255,255,255,0.02);border-radius:var(--radius-md)">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span style="font-size:var(--text-xs);color:var(--text-tertiary);font-family:var(--font-mono)">#${idx + 1}</span>
            <span style="font-size:var(--text-sm);font-weight:var(--weight-medium);text-transform:capitalize">${g.skill}</span>
          </div>
          <span style="font-size:var(--text-xs);color:var(--danger);background:var(--danger-bg);padding:2px 8px;border-radius:var(--radius-full)">
            Missing ${g.times_missing}x
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

function skeletonCards(n) {
  return Array.from({ length: n }, () =>
    '<div class="glass-card-static dashboard-stat"><div class="skeleton skeleton-card"></div></div>'
  ).join('');
}
