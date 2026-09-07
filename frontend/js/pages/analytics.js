// ─── Career OS: Analytics & Conversion Funnel Page ───
import { getApplicationAnalytics } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1>Conversion Funnel & Analytics</h1>
        <p>Comprehensive breakdown of your hiring pipeline stages, conversion rates, and velocity</p>
      </div>
      <button class="btn btn-secondary btn-sm" id="refresh-analytics-btn">
        🔄 Refresh Metrics
      </button>
    </div>

    <div id="analytics-content">
      <div style="text-align:center;padding:var(--space-8)">
        <div class="spinner" style="margin:0 auto var(--space-4)"></div>
        <p style="color:var(--text-secondary)">Loading pipeline analytics...</p>
      </div>
    </div>
  `;

  const contentEl = container.querySelector('#analytics-content');
  const refreshBtn = container.querySelector('#refresh-analytics-btn');

  refreshBtn.addEventListener('click', () => loadAnalytics());

  async function loadAnalytics() {
    try {
      const data = await getApplicationAnalytics();
      renderDashboardData(data);
    } catch (err) {
      contentEl.innerHTML = `
        <div class="glass-card-static empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load analytics</h3>
          <p style="color:var(--text-secondary)">${err.message}</p>
          <button class="btn btn-secondary btn-sm" id="retry-analytics-btn" style="margin-top:var(--space-4)">
            Retry
          </button>
        </div>
      `;
      contentEl.querySelector('#retry-analytics-btn')?.addEventListener('click', loadAnalytics);
    }
  }

  function renderDashboardData(data) {
    const total = data.total_applications || 0;
    const active = data.active_applications || 0;
    const metrics = data.metrics || {};
    const funnel = data.funnel || [];
    const stageCounts = data.stage_counts || {};

    if (total === 0) {
      contentEl.innerHTML = `
        <div class="glass-card-static empty-state">
          <div class="empty-state-icon">📈</div>
          <h3>No applications tracked yet</h3>
          <p style="color:var(--text-secondary);max-width:440px;margin:var(--space-2) auto var(--space-4)">
            Add your job applications in the Applications tracker to automatically generate your conversion funnel, drop-off rates, and pipeline velocity metrics.
          </p>
          <a class="btn btn-primary" href="#/applications">Track First Application</a>
        </div>
      `;
      return;
    }

    const offerRate = metrics.overall_offer_rate || 0;
    const interviewRate = metrics.interview_rate || 0;
    const avgDays = metrics.average_active_days || 0;
    const recent7 = metrics.recent_7_days || 0;

    // Coaching recommendation based on funnel shape
    let coachingHeadline = 'Healthy Pipeline Conversion';
    let coachingTip = 'Your pipeline is progressing smoothly across stages. Keep applying and following up consistently.';
    let coachingBadge = 'var(--success)';

    const screeningCount = (funnel[1] && funnel[1].count) || 0;
    const interviewCount = (funnel[2] && funnel[2].count) || 0;
    const offerCount = (funnel[3] && funnel[3].count) || 0;

    if (total >= 3 && screeningCount / total < 0.25) {
      coachingHeadline = '⚠️ High Resume Drop-off at Screening';
      coachingTip = 'Less than 25% of your applications reach screening. Run our Resume Matcher and AI Bullet Optimizer to align your bullets with ATS keywords.';
      coachingBadge = 'var(--warning)';
    } else if (screeningCount >= 2 && interviewCount / screeningCount < 0.3) {
      coachingHeadline = '⚠️ Recruiter Screen Drop-off';
      coachingTip = 'Candidates are dropping off after the initial recruiter screen. Refine your 60-second elevator pitch and behavioral stories.';
      coachingBadge = 'var(--warning)';
    } else if (interviewCount >= 2 && offerCount === 0) {
      coachingHeadline = '🎯 Interview-to-Offer Bottleneck';
      coachingTip = 'You are landing technical interviews! Sharpen system design and live coding practice in our Mock Interview simulator.';
      coachingBadge = 'var(--accent-solid)';
    } else if (offerCount >= 1) {
      coachingHeadline = '🎉 Strong Offer Velocity!';
      coachingTip = 'You have secured offers in this search cycle. Leverage competing offers to negotiate salary and equity packages.';
      coachingBadge = 'var(--success)';
    }

    // Stage bar gradient colors
    const stageColors = {
      'Applied': 'linear-gradient(90deg, #3b82f6, #60a5fa)',
      'Screening': 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
      'Interview': 'linear-gradient(90deg, #ec4899, #f472b6)',
      'Offer': 'linear-gradient(90deg, #10b981, #34d399)',
    };

    contentEl.innerHTML = `
      <!-- KPI Cards -->
      <div class="analytics-grid">
        <div class="glass-card-static stat-card">
          <div class="stat-card-label">Total Applications</div>
          <div class="stat-card-value">${total}</div>
          <div class="stat-card-sub">${active} active in pipeline</div>
        </div>

        <div class="glass-card-static stat-card">
          <div class="stat-card-label">Interview Rate</div>
          <div class="stat-card-value" style="color:#60a5fa">${interviewRate}%</div>
          <div class="stat-card-sub">${interviewCount} reached interview</div>
        </div>

        <div class="glass-card-static stat-card">
          <div class="stat-card-label">Offer Rate</div>
          <div class="stat-card-value" style="color:#4ade80">${offerRate}%</div>
          <div class="stat-card-sub">${offerCount} total offers received</div>
        </div>

        <div class="glass-card-static stat-card">
          <div class="stat-card-label">Pipeline Velocity</div>
          <div class="stat-card-value" style="color:#f59e0b">${avgDays}d</div>
          <div class="stat-card-sub">${recent7} added in last 7 days</div>
        </div>
      </div>

      <!-- Conversion Funnel Section -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-6);margin-bottom:var(--space-6)">
        <!-- Funnel Visualization Card -->
        <div class="glass-card-static" style="padding:var(--space-6)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5)">
            <h3 style="margin:0">Pipeline Conversion Funnel</h3>
            <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Cumulative stage conversion</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${funnel.map((f, i) => {
              const maxCount = Math.max(1, funnel[0]?.count || total);
              const barWidth = Math.max(12, Math.round((f.count / maxCount) * 100));
              const isFirst = i === 0;
              const dropPct = f.drop_off_pct || 0;
              const convPct = f.conversion_from_prev || 0;

              return `
                <div class="funnel-stage-row">
                  <div class="funnel-stage-meta">
                    <div class="funnel-stage-name">${f.stage}</div>
                    <div class="funnel-stage-count">${f.count} applications</div>
                  </div>

                  <div class="funnel-stage-bar-wrap">
                    <div class="funnel-stage-bar" style="width:${barWidth}%;background:${stageColors[f.stage] || 'var(--accent-solid)'}">
                      ${f.count}
                    </div>
                  </div>

                  <div class="funnel-drop-badge" style="${isFirst ? 'background:rgba(255,255,255,0.05);color:var(--text-secondary);border-color:transparent' : ''}">
                    ${isFirst ? '100% Entry' : `-${dropPct}% drop`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Conversion Highlights -->
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--space-3);margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--border-subtle);text-align:center">
            <div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Applied → Screen</div>
              <div style="font-weight:var(--weight-bold);color:#8b5cf6;font-size:var(--text-md);margin-top:2px">
                ${funnel[1]?.conversion_from_prev || 0}%
              </div>
            </div>
            <div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Screen → Interview</div>
              <div style="font-weight:var(--weight-bold);color:#ec4899;font-size:var(--text-md);margin-top:2px">
                ${funnel[2]?.conversion_from_prev || 0}%
              </div>
            </div>
            <div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Interview → Offer</div>
              <div style="font-weight:var(--weight-bold);color:#10b981;font-size:var(--text-md);margin-top:2px">
                ${funnel[3]?.conversion_from_prev || 0}%
              </div>
            </div>
          </div>
        </div>

        <!-- Strategy & Bottlenecks Card -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="glass-card-static" style="padding:var(--space-5);border-left:4px solid ${coachingBadge}">
            <div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:var(--space-1)">
              Pipeline Insight
            </div>
            <h4 style="margin:0 0 var(--space-2);color:var(--text-primary)">
              ${coachingHeadline}
            </h4>
            <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-relaxed);margin:0">
              ${coachingTip}
            </p>
          </div>

          <div class="glass-card-static" style="padding:var(--space-5);flex:1">
            <h4 style="margin:0 0 var(--space-3)">Current Stage Snapshot</h4>
            <div style="display:flex;flex-direction:column;gap:var(--space-2)">
              ${Object.entries(stageCounts).map(([st, cnt]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-xs);padding:var(--space-2) 0;border-bottom:1px solid rgba(255,255,255,0.03)">
                  <span style="text-transform:capitalize;color:var(--text-secondary)">${st}</span>
                  <span class="badge ${st === 'offer' ? 'badge-offer' : st === 'interview' ? 'badge-interview' : st === 'rejected' ? 'badge-rejected' : 'badge-applied'}">
                    ${cnt}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Insights Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-6)">
        <!-- Top Locations -->
        <div class="glass-card-static" style="padding:var(--space-5)">
          <h4 style="margin:0 0 var(--space-3)">Top Target Locations</h4>
          ${(metrics.top_locations && metrics.top_locations.length > 0) ? `
            <div style="display:flex;flex-direction:column;gap:var(--space-2)">
              ${metrics.top_locations.map(loc => `
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-sm)">
                  <span>📍 ${loc.location}</span>
                  <span style="color:var(--text-tertiary);font-size:var(--text-xs)">${loc.count} apps</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color:var(--text-tertiary);font-size:var(--text-sm)">Add locations to applications to see location demographics.</p>
          `}
        </div>

        <!-- Activity Velocity -->
        <div class="glass-card-static" style="padding:var(--space-5)">
          <h4 style="margin:0 0 var(--space-3)">Activity & Cadence</h4>
          <div style="display:flex;flex-direction:column;gap:var(--space-3);font-size:var(--text-sm)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="color:var(--text-secondary)">Last 7 Days Applications</span>
              <strong>${metrics.recent_7_days || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="color:var(--text-secondary)">Last 30 Days Applications</span>
              <strong>${metrics.recent_30_days || 0}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="color:var(--text-secondary)">Applications with Stated Salary</span>
              <strong>${metrics.has_salary_count || 0} / ${total}</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Initial load
  await loadAnalytics();
}
