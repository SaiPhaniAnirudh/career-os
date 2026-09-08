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
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-6);margin-bottom:var(--space-8)">
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

      <!-- Offer Comparison & Compensation Calculator -->
      <div class="glass-card-static" style="padding:var(--space-6);margin-bottom:var(--space-8)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2)">
          <div>
            <h3 style="margin:0 0 var(--space-1)">💰 Offer Comparison & Total Compensation (TC) Calculator</h3>
            <p style="margin:0;font-size:var(--text-xs);color:var(--text-secondary)">
              Side-by-side breakdown of base salary, equity vesting, target bonus, and 4-year financial trajectory.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" id="reset-offers-btn">Reset Defaults</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:var(--space-6)">
          <!-- Offer A -->
          <div style="background:var(--bg-input);padding:var(--space-4);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
              <input class="input" id="off-a-name" value="Offer A (e.g. Enterprise)" style="font-weight:600;font-size:var(--text-sm);padding:var(--space-1) var(--space-2);width:70%">
              <span style="font-size:var(--text-xs);color:var(--accent-solid);font-weight:600">Company A</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);font-size:var(--text-xs)">
              <div>
                <label>Base Salary ($)</label>
                <input class="input" id="off-a-base" type="number" value="145000" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>Target Bonus (%)</label>
                <input class="input" id="off-a-bonus" type="number" value="15" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>Sign-on Bonus ($)</label>
                <input class="input" id="off-a-signon" type="number" value="15000" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>4-Yr Equity Grant ($)</label>
                <input class="input" id="off-a-equity" type="number" value="120000" style="padding:var(--space-1) var(--space-2)">
              </div>
            </div>

            <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:4px">
                <span style="color:var(--text-secondary)">Year 1 Total Comp:</span>
                <strong id="off-a-y1" style="font-size:var(--text-base);color:var(--success)">$211,750</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:4px">
                <span style="color:var(--text-secondary)">Annual Ongoing TC:</span>
                <span id="off-a-annual" style="color:var(--text-primary)">$196,750 / yr</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs)">
                <span style="color:var(--text-secondary)">4-Year Cumulative:</span>
                <strong id="off-a-4yr" style="color:var(--accent-solid)">$802,000</strong>
              </div>
            </div>
          </div>

          <!-- Offer B -->
          <div style="background:var(--bg-input);padding:var(--space-4);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
              <input class="input" id="off-b-name" value="Offer B (e.g. Growth Startup)" style="font-weight:600;font-size:var(--text-sm);padding:var(--space-1) var(--space-2);width:70%">
              <span style="font-size:var(--text-xs);color:var(--accent-solid);font-weight:600">Company B</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);font-size:var(--text-xs)">
              <div>
                <label>Base Salary ($)</label>
                <input class="input" id="off-b-base" type="number" value="160000" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>Target Bonus (%)</label>
                <input class="input" id="off-b-bonus" type="number" value="10" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>Sign-on Bonus ($)</label>
                <input class="input" id="off-b-signon" type="number" value="25000" style="padding:var(--space-1) var(--space-2)">
              </div>
              <div>
                <label>4-Yr Equity Grant ($)</label>
                <input class="input" id="off-b-equity" type="number" value="80000" style="padding:var(--space-1) var(--space-2)">
              </div>
            </div>

            <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:4px">
                <span style="color:var(--text-secondary)">Year 1 Total Comp:</span>
                <strong id="off-b-y1" style="font-size:var(--text-base);color:var(--success)">$221,000</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);margin-bottom:4px">
                <span style="color:var(--text-secondary)">Annual Ongoing TC:</span>
                <span id="off-b-annual" style="color:var(--text-primary)">$196,000 / yr</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs)">
                <span style="color:var(--text-secondary)">4-Year Cumulative:</span>
                <strong id="off-b-4yr" style="color:var(--accent-solid)">$809,000</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Delta comparison pill -->
        <div id="offer-delta-pill" style="margin-top:var(--space-4);padding:var(--space-3);background:rgba(52,211,153,0.1);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--success);text-align:center;font-weight:600">
          💡 Offer B provides +$9,250 (+4.4%) higher Year 1 Total Comp.
        </div>
      </div>
    `;

    setupOfferCalculator(contentEl);
  }

  function setupOfferCalculator(el) {
    const inputs = ['#off-a-base', '#off-a-bonus', '#off-a-signon', '#off-a-equity',
                    '#off-b-base', '#off-b-bonus', '#off-b-signon', '#off-b-equity'];

    function recalc() {
      const aBase = Number(el.querySelector('#off-a-base')?.value) || 0;
      const aBonus = Number(el.querySelector('#off-a-bonus')?.value) || 0;
      const aSignon = Number(el.querySelector('#off-a-signon')?.value) || 0;
      const aEquity = Number(el.querySelector('#off-a-equity')?.value) || 0;

      const bBase = Number(el.querySelector('#off-b-base')?.value) || 0;
      const bBonus = Number(el.querySelector('#off-b-bonus')?.value) || 0;
      const bSignon = Number(el.querySelector('#off-b-signon')?.value) || 0;
      const bEquity = Number(el.querySelector('#off-b-equity')?.value) || 0;

      // Calculations
      const aAnnualBonus = aBase * (aBonus / 100);
      const aAnnualEquity = aEquity / 4;
      const aY1 = aBase + aAnnualBonus + aSignon + aAnnualEquity;
      const aAnnualOngoing = aBase + aAnnualBonus + aAnnualEquity;
      const a4Yr = (aBase + aAnnualBonus) * 4 + aSignon + aEquity;

      const bAnnualBonus = bBase * (bBonus / 100);
      const bAnnualEquity = bEquity / 4;
      const bY1 = bBase + bAnnualBonus + bSignon + bAnnualEquity;
      const bAnnualOngoing = bBase + bAnnualBonus + bAnnualEquity;
      const b4Yr = (bBase + bAnnualBonus) * 4 + bSignon + bEquity;

      // Update DOM
      el.querySelector('#off-a-y1').textContent = `$${Math.round(aY1).toLocaleString()}`;
      el.querySelector('#off-a-annual').textContent = `$${Math.round(aAnnualOngoing).toLocaleString()} / yr`;
      el.querySelector('#off-a-4yr').textContent = `$${Math.round(a4Yr).toLocaleString()}`;

      el.querySelector('#off-b-y1').textContent = `$${Math.round(bY1).toLocaleString()}`;
      el.querySelector('#off-b-annual').textContent = `$${Math.round(bAnnualOngoing).toLocaleString()} / yr`;
      el.querySelector('#off-b-4yr').textContent = `$${Math.round(b4Yr).toLocaleString()}`;

      const deltaPill = el.querySelector('#offer-delta-pill');
      const diffY1 = bY1 - aY1;
      const aName = el.querySelector('#off-a-name')?.value || 'Offer A';
      const bName = el.querySelector('#off-b-name')?.value || 'Offer B';

      if (Math.abs(diffY1) < 100) {
        deltaPill.textContent = `⚖️ Both offers are virtually identical in Year 1 total compensation.`;
      } else if (diffY1 > 0) {
        const pct = aY1 > 0 ? ((diffY1 / aY1) * 100).toFixed(1) : 0;
        deltaPill.textContent = `💡 ${bName} delivers +$${Math.round(diffY1).toLocaleString()} (+${pct}%) higher Year 1 Total Comp.`;
      } else {
        const absDiff = Math.abs(diffY1);
        const pct = bY1 > 0 ? ((absDiff / bY1) * 100).toFixed(1) : 0;
        deltaPill.textContent = `💡 ${aName} delivers +$${Math.round(absDiff).toLocaleString()} (+${pct}%) higher Year 1 Total Comp.`;
      }
    }

    inputs.forEach(sel => {
      el.querySelector(sel)?.addEventListener('input', recalc);
    });

    el.querySelector('#reset-offers-btn')?.addEventListener('click', () => {
      el.querySelector('#off-a-base').value = '145000';
      el.querySelector('#off-a-bonus').value = '15';
      el.querySelector('#off-a-signon').value = '15000';
      el.querySelector('#off-a-equity').value = '120000';

      el.querySelector('#off-b-base').value = '160000';
      el.querySelector('#off-b-bonus').value = '10';
      el.querySelector('#off-b-signon').value = '25000';
      el.querySelector('#off-b-equity').value = '80000';
      recalc();
    });
  }

  // Initial load
  await loadAnalytics();
}

