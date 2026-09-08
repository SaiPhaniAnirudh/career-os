// ─── Career OS: Applications Page (Kanban) ───
import { listApplications, createApplication, updateApplication, deleteApplication, generateCoverLetter } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

const STAGE_COLORS = {
  applied:   'var(--stage-applied)',
  screening: 'var(--stage-screening)',
  interview: 'var(--stage-interview)',
  offer:     'var(--stage-offer)',
  rejected:  'var(--stage-rejected)',
  withdrawn: 'var(--stage-withdrawn)',
};

export async function renderApplications(container) {
  let apps = [];
  let filterFollowupOnly = false;

  container.innerHTML = `
    <div class="applications-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-6)">
      <div class="page-header" style="margin-bottom:0">
        <h1>Applications</h1>
        <p>Track your job applications, activity timeline, and follow-up deadlines</p>
      </div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center">
        <button class="btn btn-ghost btn-sm" id="clipper-btn" title="1-Click Web Clipper for LinkedIn, Greenhouse, and Indeed">
          📎 Web Clipper
        </button>
        <button class="btn btn-ghost btn-sm" id="filter-followup-btn">
          🔔 Follow-ups <span id="followup-badge" style="display:none;background:var(--warning);color:#000;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">0</span>
        </button>
        <button class="btn btn-primary" id="add-app-btn">+ New Application</button>
      </div>
    </div>

    <div class="kanban-board" id="kanban-board">
      ${STAGES.map(stage => `
        <div class="kanban-column" data-stage="${stage}">
          <div class="kanban-column-header">
            <div class="kanban-column-dot" style="background:${STAGE_COLORS[stage]}"></div>
            <span class="kanban-column-title">${stage}</span>
            <span class="kanban-column-count" data-count="${stage}">0</span>
          </div>
          <div class="kanban-drop-zone" data-stage="${stage}">
            <div class="skeleton skeleton-card" style="height:80px"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add application button
  container.querySelector('#add-app-btn').addEventListener('click', () => {
    showAddModal(container, apps);
  });

  // Web Clipper button
  container.querySelector('#clipper-btn')?.addEventListener('click', () => {
    showClipperModal();
  });

  // Follow-up filter toggle
  const filterBtn = container.querySelector('#filter-followup-btn');
  filterBtn?.addEventListener('click', () => {
    filterFollowupOnly = !filterFollowupOnly;
    filterBtn.classList.toggle('btn-secondary', filterFollowupOnly);
    filterBtn.classList.toggle('btn-ghost', !filterFollowupOnly);
    renderBoard(container, apps, filterFollowupOnly);
  });

  // Load applications
  try {
    apps = await listApplications();
    renderBoard(container, apps, filterFollowupOnly);
    updateFollowupBadge(container, apps);
    checkWebClipperParams(container, apps);
  } catch (err) {
    showToast(err.message, 'error');
    renderBoard(container, [], false);
  }

  // Setup drag-and-drop
  setupDragAndDrop(container, apps);
}

function updateFollowupBadge(container, apps) {
  const badge = container.querySelector('#followup-badge');
  if (!badge) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingCount = apps.filter(a => a.follow_up_date && a.follow_up_date <= todayStr && !['rejected', 'withdrawn'].includes(a.stage)).length;
  if (pendingCount > 0) {
    badge.textContent = pendingCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function checkWebClipperParams(container, apps) {
  const raw = window.location.hash || window.location.search;
  if (!raw.includes('clip_title') && !raw.includes('clip_url')) return;

  const urlParams = new URLSearchParams(raw.split('?')[1] || '');
  const clipTitle = urlParams.get('clip_title') || '';
  const clipUrl = urlParams.get('clip_url') || '';
  const clipNotes = urlParams.get('clip_notes') || '';

  if (clipTitle || clipUrl) {
    let company = '';
    let role = clipTitle;
    if (clipTitle.includes(' at ')) {
      const parts = clipTitle.split(' at ');
      role = parts[0].trim();
      company = parts[1].split('|')[0].split('-')[0].trim();
    } else if (clipTitle.includes(' - ')) {
      const parts = clipTitle.split(' - ');
      role = parts[0].trim();
      company = parts[1].split('|')[0].trim();
    }

    showAddModal(container, apps, {
      company,
      role,
      url: clipUrl,
      notes: clipNotes ? `Clipped description:\n${clipNotes}` : '',
    });
  }
}

function renderBoard(container, apps, filterFollowupOnly = false) {
  const todayStr = new Date().toISOString().split('T')[0];

  STAGES.forEach(stage => {
    const zone = container.querySelector(`.kanban-drop-zone[data-stage="${stage}"]`);
    const countEl = container.querySelector(`[data-count="${stage}"]`);
    if (!zone || !countEl) return;

    let stageApps = apps.filter(a => a.stage === stage);
    if (filterFollowupOnly) {
      stageApps = stageApps.filter(a => a.follow_up_date);
    }

    countEl.textContent = stageApps.length;

    if (stageApps.length === 0) {
      zone.innerHTML = `
        <div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary);font-size:var(--text-xs)">
          ${filterFollowupOnly ? 'No follow-ups due' : 'No applications'}
        </div>
      `;
      return;
    }

    zone.innerHTML = stageApps.map(app => {
      const date = new Date(app.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });

      let followupBadge = '';
      if (app.follow_up_date) {
        if (app.follow_up_date < todayStr) {
          followupBadge = `<span style="font-size:10.5px;background:rgba(239,68,68,0.15);color:var(--danger);padding:2px 6px;border-radius:var(--radius-sm);font-weight:600;display:inline-flex;align-items:center;gap:3px">⚠️ Overdue (${app.follow_up_date})</span>`;
        } else if (app.follow_up_date === todayStr) {
          followupBadge = `<span style="font-size:10.5px;background:rgba(245,158,11,0.15);color:var(--warning);padding:2px 6px;border-radius:var(--radius-sm);font-weight:600;display:inline-flex;align-items:center;gap:3px">🔔 Due Today</span>`;
        } else {
          followupBadge = `<span style="font-size:10.5px;background:rgba(59,130,246,0.12);color:var(--info);padding:2px 6px;border-radius:var(--radius-sm);display:inline-flex;align-items:center;gap:3px">📅 Follow-up: ${app.follow_up_date}</span>`;
        }
      }

      const timelineCount = (app.timeline || []).length;

      return `
        <div class="glass-card kanban-card slide-up" draggable="true" data-id="${app.id}">
          <div class="kanban-card-company">${escapeHtml(app.company)}</div>
          <div class="kanban-card-role">${escapeHtml(app.role)}</div>

          ${followupBadge ? `<div style="margin:var(--space-1) 0 var(--space-2)">${followupBadge}</div>` : ''}

          ${(app.location || app.salary || app.url || timelineCount > 0) ? `
            <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin:var(--space-2) 0">
              ${app.location ? `<span style="font-size:11px;background:rgba(255,255,255,0.05);padding:1px 6px;border-radius:var(--radius-sm);color:var(--text-secondary)">📍 ${escapeHtml(app.location)}</span>` : ''}
              ${app.salary ? `<span style="font-size:11px;background:rgba(52,211,153,0.1);padding:1px 6px;border-radius:var(--radius-sm);color:var(--success)">💰 ${escapeHtml(app.salary)}</span>` : ''}
              ${timelineCount > 0 ? `<span style="font-size:11px;background:rgba(168,85,247,0.1);padding:1px 6px;border-radius:var(--radius-sm);color:var(--accent-solid)">⏱️ ${timelineCount} activities</span>` : ''}
              ${app.url ? `<a href="${escapeAttr(app.url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--accent-solid);text-decoration:none" onclick="event.stopPropagation()">🔗 Posting</a>` : ''}
            </div>
          ` : ''}

          <div class="kanban-card-meta">
            <span>${date}</span>
            <div class="kanban-card-actions">
              <button class="btn-ghost btn-icon btn-sm cl-app-btn" data-id="${app.id}" title="Generate AI Cover Letter">📜</button>
              <button class="btn-ghost btn-icon btn-sm edit-app-btn" data-id="${app.id}" title="Edit / Activity Timeline">✏️</button>
              <button class="btn-ghost btn-icon btn-sm delete-app-btn" data-id="${app.id}" title="Delete">🗑️</button>
            </div>
          </div>
          ${app.notes ? `<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(app.notes)}</div>` : ''}
        </div>
      `;
    }).join('');

    // Cover Letter buttons
    zone.querySelectorAll('.cl-app-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const app = apps.find(a => a.id === btn.dataset.id);
        if (app) showCoverLetterModalForApp(app);
      });
    });

    // Edit buttons
    zone.querySelectorAll('.edit-app-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const app = apps.find(a => a.id === btn.dataset.id);
        if (app) showEditModal(container, apps, app);
      });
    });

    // Delete buttons
    zone.querySelectorAll('.delete-app-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const app = apps.find(a => a.id === btn.dataset.id);
        if (app) showDeleteModal(container, apps, app);
      });
    });
  });
}

function setupDragAndDrop(container, apps) {
  const board = container.querySelector('#kanban-board');

  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.kanban-card');
    if (!card) return;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
  });

  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    board.querySelectorAll('.kanban-drop-zone').forEach(z => z.classList.remove('drag-over'));
  });

  board.querySelectorAll('.kanban-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over');
      }
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const appId = e.dataTransfer.getData('text/plain');
      const targetStage = zone.dataset.stage;
      const app = apps.find(a => a.id === appId);

      if (!app || app.stage === targetStage) return;

      const prevStage = app.stage;
      app.stage = targetStage;
      renderBoard(container, apps);

      try {
        await updateApplication(appId, { stage: targetStage });
        showToast(`Moved to ${targetStage}`, 'success');
      } catch (err) {
        app.stage = prevStage;
        renderBoard(container, apps);
        showToast(err.message, 'error');
      }
    });
  });
}

function showAddModal(container, apps, prefill = {}) {
  showModal({
    title: 'New Application',
    bodyHTML: `
      <div class="input-group">
        <label for="app-company">Company *</label>
        <input class="input" id="app-company" placeholder="Google, Meta, Startup XYZ..." value="${escapeAttr(prefill.company || '')}" required>
      </div>
      <div class="input-group">
        <label for="app-role">Role *</label>
        <input class="input" id="app-role" placeholder="Software Engineer, Data Analyst..." value="${escapeAttr(prefill.role || '')}" required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="input-group">
          <label for="app-location">Location</label>
          <input class="input" id="app-location" placeholder="Remote, NYC, London..." value="${escapeAttr(prefill.location || '')}">
        </div>
        <div class="input-group">
          <label for="app-salary">Salary / Comp</label>
          <input class="input" id="app-salary" placeholder="$130k - $160k, £80k..." value="${escapeAttr(prefill.salary || '')}">
        </div>
      </div>
      <div class="input-group">
        <label for="app-url">Job URL</label>
        <input type="url" class="input" id="app-url" placeholder="https://careers.company.com/job/123" value="${escapeAttr(prefill.url || '')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="input-group">
          <label for="app-stage">Stage</label>
          <select class="input" id="app-stage">
            ${STAGES.map(s => `<option value="${s}" ${s === (prefill.stage || 'applied') ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="input-group">
          <label for="app-followup">Follow-Up Reminder</label>
          <input type="date" class="input" id="app-followup" value="${prefill.follow_up_date || ''}">
        </div>
      </div>
      <div class="input-group">
        <label for="app-deadline">Application Deadline</label>
        <input type="date" class="input" id="app-deadline" value="${prefill.deadline || ''}">
      </div>
      <div class="input-group">
        <label for="app-notes">Notes</label>
        <textarea class="input" id="app-notes" rows="3" placeholder="Any notes...">${escapeHtml(prefill.notes || '')}</textarea>
      </div>
    `,
    confirmText: 'Add Application',
    onConfirm: async (close) => {
      const company = document.querySelector('#app-company').value.trim();
      const role = document.querySelector('#app-role').value.trim();
      if (!company || !role) {
        showToast('Company and Role are required', 'warning');
        return;
      }

      try {
        const newApp = await createApplication({
          company,
          role,
          location: document.querySelector('#app-location').value.trim() || null,
          salary: document.querySelector('#app-salary').value.trim() || null,
          url: document.querySelector('#app-url').value.trim() || null,
          stage: document.querySelector('#app-stage').value,
          follow_up_date: document.querySelector('#app-followup').value || null,
          deadline: document.querySelector('#app-deadline').value || null,
          notes: document.querySelector('#app-notes').value.trim() || null,
        });
        apps.push(newApp);
        renderBoard(container, apps);
        updateFollowupBadge(container, apps);
        showToast(`Added ${company} — ${role}`, 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
  });
}

function showEditModal(container, apps, app) {
  let timeline = Array.isArray(app.timeline) ? [...app.timeline] : [];

  function renderTimelineListHTML() {
    if (timeline.length === 0) {
      return `<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:var(--space-2) 0">No interactions logged yet.</div>`;
    }
    return timeline.map((item, idx) => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:var(--space-2);background:var(--bg-input);border-radius:var(--radius-sm);font-size:var(--text-xs);margin-bottom:var(--space-2);border-left:3px solid var(--accent-solid)">
        <div>
          <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(item.type || 'Activity')}:</span>
          <span style="color:var(--text-secondary);margin-left:4px">${escapeHtml(item.content || '')}</span>
        </div>
        <span style="color:var(--text-tertiary);font-size:10px;margin-left:8px;flex-shrink:0">${item.date || ''}</span>
      </div>
    `).join('');
  }

  showModal({
    title: `Edit ${app.company} — ${app.role}`,
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:320px;max-width:680px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div class="input-group">
            <label for="edit-company">Company</label>
            <input class="input" id="edit-company" value="${escapeAttr(app.company)}">
          </div>
          <div class="input-group">
            <label for="edit-role">Role</label>
            <input class="input" id="edit-role" value="${escapeAttr(app.role)}">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div class="input-group">
            <label for="edit-location">Location</label>
            <input class="input" id="edit-location" value="${escapeAttr(app.location || '')}" placeholder="Remote, NYC...">
          </div>
          <div class="input-group">
            <label for="edit-salary">Salary / Comp</label>
            <input class="input" id="edit-salary" value="${escapeAttr(app.salary || '')}" placeholder="$140k...">
          </div>
        </div>

        <div class="input-group">
          <label for="edit-url">Job URL</label>
          <input type="url" class="input" id="edit-url" value="${escapeAttr(app.url || '')}" placeholder="https://...">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
          <div class="input-group">
            <label for="edit-stage">Stage</label>
            <select class="input" id="edit-stage">
              ${STAGES.map(s => `<option value="${s}" ${s === app.stage ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label for="edit-followup">Follow-Up Date</label>
            <input type="date" class="input" id="edit-followup" value="${app.follow_up_date || ''}">
          </div>
          <div class="input-group">
            <label for="edit-deadline">Deadline</label>
            <input type="date" class="input" id="edit-deadline" value="${app.deadline || ''}">
          </div>
        </div>

        <div class="input-group">
          <label for="edit-notes">Notes</label>
          <textarea class="input" id="edit-notes" rows="2">${escapeHtml(app.notes || '')}</textarea>
        </div>

        <!-- Activity Timeline -->
        <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
            <label style="font-size:var(--text-xs);font-weight:var(--weight-semibold);color:var(--text-primary)">
              ⏱️ Activity Timeline & Interaction Log
            </label>
            <button class="btn btn-ghost btn-sm" id="modal-cl-btn" type="button" style="font-size:var(--text-xs)">
              📜 Generate Cover Letter
            </button>
          </div>

          <div id="timeline-list-container" style="max-height:160px;overflow-y:auto;margin-bottom:var(--space-3)">
            ${renderTimelineListHTML()}
          </div>

          <div style="display:flex;gap:var(--space-2);background:var(--bg-input);padding:var(--space-2);border-radius:var(--radius-md)">
            <select class="input" id="timeline-type" style="width:140px;font-size:var(--text-xs);padding:var(--space-1) var(--space-2)">
              <option value="📞 Recruiter Call">📞 Recruiter Call</option>
              <option value="💻 Tech Screen">💻 Tech Screen</option>
              <option value="🤝 Final Round">🤝 Final Round</option>
              <option value="📧 Email Follow-up">📧 Email Follow-up</option>
              <option value="📝 Note">📝 Note</option>
            </select>
            <input class="input" id="timeline-content" placeholder="e.g. Cleared round 1, system design scheduled for Friday..." style="flex:1;font-size:var(--text-xs);padding:var(--space-1) var(--space-2)">
            <button class="btn btn-secondary btn-sm" id="timeline-add-btn" type="button" style="font-size:var(--text-xs);flex-shrink:0">
              Log
            </button>
          </div>
        </div>
      </div>
    `,
    confirmText: 'Save Changes',
    onConfirm: async (close) => {
      try {
        const updates = {
          company: document.querySelector('#edit-company').value.trim(),
          role: document.querySelector('#edit-role').value.trim(),
          location: document.querySelector('#edit-location').value.trim() || null,
          salary: document.querySelector('#edit-salary').value.trim() || null,
          url: document.querySelector('#edit-url').value.trim() || null,
          stage: document.querySelector('#edit-stage').value,
          follow_up_date: document.querySelector('#edit-followup').value || null,
          deadline: document.querySelector('#edit-deadline').value || null,
          notes: document.querySelector('#edit-notes').value.trim() || null,
          timeline: timeline,
        };
        const updated = await updateApplication(app.id, updates);
        Object.assign(app, updated);
        renderBoard(container, apps);
        updateFollowupBadge(container, apps);
        showToast('Application updated', 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
  });

  const modalEl = document.getElementById('modal-body');
  const addTimelineBtn = modalEl.querySelector('#timeline-add-btn');
  const timelineContentInput = modalEl.querySelector('#timeline-content');
  const timelineTypeSelect = modalEl.querySelector('#timeline-type');
  const timelineListEl = modalEl.querySelector('#timeline-list-container');
  const modalClBtn = modalEl.querySelector('#modal-cl-btn');

  addTimelineBtn?.addEventListener('click', () => {
    const text = timelineContentInput.value.trim();
    if (!text) return;
    const type = timelineTypeSelect.value;
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timeline.unshift({ type, content: text, date });
    timelineContentInput.value = '';
    timelineListEl.innerHTML = renderTimelineListHTML();
    showToast('Activity logged', 'info');
  });

  modalClBtn?.addEventListener('click', () => {
    showCoverLetterModalForApp(app);
  });
}

function showCoverLetterModalForApp(app) {
  showModal({
    title: `📜 AI Cover Letter — ${escapeHtml(app.company)}`,
    confirmText: 'Done',
    cancelText: 'Close',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);min-width:320px;max-width:700px">
        <p style="font-size:var(--text-xs);color:var(--text-secondary);margin:0">
          Generating targeted cover letter for <strong>${escapeHtml(app.role)}</strong> at <strong>${escapeHtml(app.company)}</strong>.
        </p>

        <div style="display:flex;gap:var(--space-2);align-items:center">
          <label style="font-size:var(--text-xs);color:var(--text-secondary)">Tone:</label>
          <select class="input" id="app-cl-tone" style="font-size:var(--text-xs);padding:var(--space-1) var(--space-2);flex:1">
            <option value="confident" selected>Confident & Results-Driven</option>
            <option value="enthusiastic">Enthusiastic & Culturally Aligned</option>
            <option value="executive">Executive & Strategic</option>
            <option value="technical">Technical & Architectural</option>
            <option value="concise">Direct & Concise</option>
          </select>
          <button class="btn btn-primary btn-sm" id="app-cl-generate-btn" style="font-size:var(--text-xs)">
            ⚡ Generate
          </button>
        </div>

        <div id="app-cl-loading" style="display:none;text-align:center;padding:var(--space-4)">
          <div class="spinner" style="margin:0 auto var(--space-2)"></div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">Drafting letter with Groq AI...</div>
        </div>

        <div id="app-cl-result" style="display:none;display:flex;flex-direction:column;gap:var(--space-2)">
          <div style="display:flex;justify-content:flex-end;gap:var(--space-2)">
            <button class="btn btn-ghost btn-sm" id="app-cl-copy-btn" style="font-size:var(--text-xs)">📋 Copy</button>
            <button class="btn btn-ghost btn-sm" id="app-cl-download-btn" style="font-size:var(--text-xs)">📥 Download</button>
          </div>
          <textarea class="input" id="app-cl-textarea" rows="11" style="font-size:var(--text-xs);line-height:var(--leading-relaxed)"></textarea>
        </div>
      </div>
    `,
  });

  const modal = document.getElementById('modal-body');
  const genBtn = modal.querySelector('#app-cl-generate-btn');
  const loadEl = modal.querySelector('#app-cl-loading');
  const resEl = modal.querySelector('#app-cl-result');
  const txtEl = modal.querySelector('#app-cl-textarea');
  const toneSelect = modal.querySelector('#app-cl-tone');
  const copyBtn = modal.querySelector('#app-cl-copy-btn');
  const downBtn = modal.querySelector('#app-cl-download-btn');

  genBtn?.addEventListener('click', async () => {
    genBtn.disabled = true;
    loadEl.style.display = 'block';
    resEl.style.display = 'none';

    try {
      const res = await generateCoverLetter({
        company: app.company,
        role: app.role,
        tone: toneSelect.value,
        jdText: app.notes || '',
      });
      txtEl.value = res.cover_letter || '';
      resEl.style.display = 'flex';
      showToast('Cover letter ready!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      genBtn.disabled = false;
      loadEl.style.display = 'none';
    }
  });

  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(txtEl.value.trim());
    showToast('Copied to clipboard!', 'success');
  });

  downBtn?.addEventListener('click', () => {
    const text = txtEl.value.trim();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${app.company.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function showClipperModal() {
  const bookmarkletCode = `javascript:(function(){var t=document.title,u=window.location.href,s=window.getSelection()?window.getSelection().toString():'';window.open('https://career-os-two-woad.vercel.app/#/applications?clip_title='+encodeURIComponent(t)+'&clip_url='+encodeURIComponent(u)+'&clip_notes='+encodeURIComponent(s),'_blank');})();`;

  showModal({
    title: '📎 1-Click Web Clipper Bookmarklet',
    confirmText: 'Done',
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:320px;max-width:560px">
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0;line-height:var(--leading-relaxed)">
          Clip any job posting from LinkedIn, Greenhouse, Lever, or Indeed directly into your Career OS Kanban board with 1 click.
        </p>

        <div style="background:var(--bg-input);padding:var(--space-4);border-radius:var(--radius-lg);border:1px dashed var(--accent-solid);text-align:center">
          <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-2)">
            Drag this button to your Bookmarks Toolbar:
          </div>
          <a class="btn btn-primary btn-md" href="${bookmarkletCode}" onclick="event.preventDefault(); showToast('Drag this button to your bookmarks bar above!', 'info');" style="display:inline-flex;align-items:center;gap:var(--space-2);cursor:grab">
            📌 + Save to Career OS
          </a>
        </div>

        <div style="font-size:var(--text-xs);color:var(--text-secondary);line-height:var(--leading-relaxed)">
          <strong>How to use:</strong>
          <ol style="padding-left:var(--space-4);margin-top:var(--space-2);display:flex;flex-direction:column;gap:var(--space-1)">
            <li>Drag the button above to your browser's bookmarks bar.</li>
            <li>When viewing any job posting online, click <strong>"+ Save to Career OS"</strong> in your bookmarks.</li>
            <li>Career OS will automatically open with the company, role title, and posting URL pre-filled!</li>
          </ol>
        </div>
      </div>
    `,
  });
}

function showDeleteModal(container, apps, app) {
  showModal({
    title: 'Delete Application',
    bodyHTML: `<p>Are you sure you want to delete <strong>${escapeHtml(app.company)} — ${escapeHtml(app.role)}</strong>? This cannot be undone.</p>`,
    confirmText: 'Delete',
    danger: true,
    onConfirm: async (close) => {
      try {
        await deleteApplication(app.id);
        const idx = apps.findIndex(a => a.id === app.id);
        if (idx > -1) apps.splice(idx, 1);
        renderBoard(container, apps);
        updateFollowupBadge(container, apps);
        showToast('Application deleted', 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
