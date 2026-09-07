// ─── Career OS: Skill Gaps Page ───
import { getSkillGaps } from '../api.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export async function renderSkillGaps(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1>Skill Gap Analysis</h1>
        <p>Aggregate missing skills ranked across all job descriptions you have matched against</p>
      </div>
      <button class="btn btn-primary" id="go-matcher-btn">🎯 Run New Match</button>
    </div>

    <div class="dashboard-grid" id="skill-gaps-metrics" style="margin-bottom:var(--space-8)">
      ${skeletonCards(4)}
    </div>

    <div class="skill-gaps-container" id="skill-gaps-content">
      <div class="glass-card-static" style="padding:var(--space-6)">
        <div class="skeleton skeleton-text" style="width:50%;margin-bottom:var(--space-4)"></div>
        <div class="skeleton skeleton-card" style="height:120px"></div>
      </div>
    </div>
  `;

  container.querySelector('#go-matcher-btn')?.addEventListener('click', () => {
    navigate('/matcher');
  });

  try {
    const data = await getSkillGaps();
    renderSkillGapsData(container, data);
  } catch (err) {
    showToast(err.message, 'error');
    renderSkillGapsData(container, { matches_considered: 0, gaps: [] });
  }
}

function renderSkillGapsData(container, data) {
  const matchesConsidered = data.matches_considered || 0;
  const gaps = data.gaps || [];
  const metricsEl = container.querySelector('#skill-gaps-metrics');
  const contentEl = container.querySelector('#skill-gaps-content');

  const totalGapsCount = gaps.length;
  const topSkill = gaps.length > 0 ? gaps[0].skill : 'None';
  const topFrequency = gaps.length > 0 ? gaps[0].times_missing : 0;
  const avgGapsPerJob = matchesConsidered > 0 
    ? (gaps.reduce((acc, g) => acc + g.times_missing, 0) / matchesConsidered).toFixed(1)
    : '0';

  metricsEl.innerHTML = `
    <div class="glass-card-static dashboard-stat slide-up">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--info-bg);color:var(--info)">🎯</div>
      </div>
      <div class="stat-value">${matchesConsidered}</div>
      <div class="stat-label">Matches Analyzed</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:50ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--warning-bg);color:var(--warning)">⚡</div>
      </div>
      <div class="stat-value">${totalGapsCount}</div>
      <div class="stat-label">Distinct Skill Gaps</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:100ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:var(--danger-bg);color:var(--danger)">🔥</div>
      </div>
      <div class="stat-value" style="font-size:var(--text-xl);text-transform:capitalize;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(topSkill)}</div>
      <div class="stat-label">Most Frequent (${topFrequency}x)</div>
    </div>

    <div class="glass-card-static dashboard-stat slide-up" style="animation-delay:150ms">
      <div class="dashboard-stat-header">
        <div class="dashboard-stat-icon" style="background:rgba(167,139,250,0.1);color:#a78bfa">📊</div>
      </div>
      <div class="stat-value">${avgGapsPerJob}</div>
      <div class="stat-label">Avg Gaps per JD</div>
    </div>
  `;

  if (matchesConsidered === 0 || gaps.length === 0) {
    contentEl.innerHTML = `
      <div class="glass-card-static" style="padding:var(--space-12);text-align:center">
        <div style="font-size:3rem;margin-bottom:var(--space-4)">📈</div>
        <h2>No Skill Gaps Detected Yet</h2>
        <p style="color:var(--text-secondary);max-width:520px;margin:var(--space-3) auto var(--space-6)">
          Analyze your resume against job postings in the <strong>Resume Matcher</strong> to automatically uncover the top industry skills missing from your profile.
        </p>
        <button class="btn btn-primary btn-lg" id="empty-state-matcher-btn">
          Go to Resume Matcher
        </button>
      </div>
    `;
    contentEl.querySelector('#empty-state-matcher-btn')?.addEventListener('click', () => {
      navigate('/matcher');
    });
    return;
  }

  const maxCount = Math.max(...gaps.map(g => g.times_missing), 1);

  contentEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 340px;gap:var(--space-6);align-items:start">
      <!-- Main Ranked Skills List -->
      <div class="glass-card-static slide-up" style="padding:var(--space-6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
          <div>
            <h3 style="margin-bottom:var(--space-1)">Ranked In-Demand Skills Missing</h3>
            <p style="font-size:var(--text-xs);color:var(--text-tertiary)">Skills that appeared in target job descriptions but were absent in your resume</p>
          </div>
          <input class="input" id="skill-search" placeholder="Search missing skills..." style="max-width:220px;padding:var(--space-2) var(--space-3);font-size:var(--text-xs)">
        </div>

        <div id="gaps-list" style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${renderGapsList(gaps, maxCount, matchesConsidered)}
        </div>
      </div>

      <!-- Actionable Advice & Quick Study Side Panel -->
      <div style="display:flex;flex-direction:column;gap:var(--space-6)">
        <div class="glass-card-static slide-up" style="padding:var(--space-6);animation-delay:100ms">
          <h3 style="margin-bottom:var(--space-3)">🚀 Close Your Gaps</h3>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);line-height:var(--leading-relaxed);margin-bottom:var(--space-4)">
            Target the highest-frequency skills first. Adding genuine projects or coursework demonstrating these capabilities will immediately lift your match scores.
          </p>
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            <button class="btn btn-secondary" id="interview-prep-btn" style="width:100%;justify-content:center">
              🎤 Practice Interview with AI
            </button>
            <button class="btn btn-ghost" id="update-resume-btn" style="width:100%;justify-content:center">
              🎯 Test Updated Resume
            </button>
          </div>
        </div>

        <div class="glass-card-static slide-up" style="padding:var(--space-6);animation-delay:150ms">
          <h4 style="margin-bottom:var(--space-2);font-size:var(--text-sm);color:var(--text-secondary)">💡 Resume Tip</h4>
          <p style="font-size:var(--text-xs);color:var(--text-tertiary);line-height:var(--leading-relaxed)">
            Avoid keyword stuffing. Integrate missing skills into bullet points using the <strong>Action Verb + Task + Impact</strong> framework.
          </p>
        </div>
      </div>
    </div>
  `;

  // Search filter
  const searchInput = contentEl.querySelector('#skill-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = gaps.filter(g => g.skill.toLowerCase().includes(q));
    const listEl = contentEl.querySelector('#gaps-list');
    if (listEl) {
      listEl.innerHTML = renderGapsList(filtered, maxCount, matchesConsidered);
    }
  });

  contentEl.querySelector('#interview-prep-btn')?.addEventListener('click', () => {
    navigate('/interview');
  });

  contentEl.querySelector('#update-resume-btn')?.addEventListener('click', () => {
    navigate('/matcher');
  });
}

function renderGapsList(gaps, maxCount, matchesConsidered) {
  if (gaps.length === 0) {
    return `
      <div style="text-align:center;padding:var(--space-8);color:var(--text-tertiary);font-size:var(--text-sm)">
        No matching skills found.
      </div>
    `;
  }

  return gaps.map((g, idx) => {
    const pct = Math.round((g.times_missing / maxCount) * 100);
    const jobPct = matchesConsidered > 0 ? Math.round((g.times_missing / matchesConsidered) * 100) : 0;
    
    let tagClass = 'tag-subtle';
    let badgeColor = 'var(--text-tertiary)';
    let badgeBg = 'rgba(255,255,255,0.05)';
    
    if (jobPct >= 50) {
      badgeColor = 'var(--danger)';
      badgeBg = 'var(--danger-bg)';
    } else if (jobPct >= 25) {
      badgeColor = 'var(--warning)';
      badgeBg = 'var(--warning-bg)';
    } else {
      badgeColor = 'var(--info)';
      badgeBg = 'var(--info-bg)';
    }

    return `
      <div class="skill-gap-item" style="padding:var(--space-3) var(--space-4);background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:var(--radius-md);transition:background var(--duration-fast)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-tertiary);width:22px">#${idx + 1}</span>
            <span style="font-weight:var(--weight-semibold);font-size:var(--text-sm);color:var(--text-primary);text-transform:capitalize">${escapeHtml(g.skill)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">${g.times_missing} ${g.times_missing === 1 ? 'match' : 'matches'}</span>
            <span style="font-size:var(--text-xs);padding:2px 8px;border-radius:var(--radius-full);color:${badgeColor};background:${badgeBg}">
              ${jobPct}% of jobs
            </span>
          </div>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:var(--radius-full);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg, var(--accent-start), var(--accent-end));border-radius:var(--radius-full);transition:width 0.5s ease-out"></div>
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
