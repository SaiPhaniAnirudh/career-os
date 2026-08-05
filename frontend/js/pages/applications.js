// ─── Career OS: Applications Page (Kanban) ───
import { listApplications, createApplication, updateApplication, deleteApplication } from '../api.js';
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

  container.innerHTML = `
    <div class="applications-header">
      <div class="page-header" style="margin-bottom:0">
        <h1>Applications</h1>
        <p>Track your job applications across every stage</p>
      </div>
      <button class="btn btn-primary" id="add-app-btn">+ New Application</button>
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

  // Load applications
  try {
    apps = await listApplications();
    renderBoard(container, apps);
  } catch (err) {
    showToast(err.message, 'error');
    renderBoard(container, []);
  }

  // Setup drag-and-drop
  setupDragAndDrop(container, apps);
}

function renderBoard(container, apps) {
  STAGES.forEach(stage => {
    const zone = container.querySelector(`.kanban-drop-zone[data-stage="${stage}"]`);
    const countEl = container.querySelector(`[data-count="${stage}"]`);
    if (!zone || !countEl) return;
    const stageApps = apps.filter(a => a.stage === stage);

    countEl.textContent = stageApps.length;

    if (stageApps.length === 0) {
      zone.innerHTML = `
        <div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary);font-size:var(--text-xs)">
          No applications
        </div>
      `;
      return;
    }

    zone.innerHTML = stageApps.map(app => {
      const date = new Date(app.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      return `
        <div class="glass-card kanban-card slide-up" draggable="true" data-id="${app.id}">
          <div class="kanban-card-company">${escapeHtml(app.company)}</div>
          <div class="kanban-card-role">${escapeHtml(app.role)}</div>
          <div class="kanban-card-meta">
            <span>${date}</span>
            <div class="kanban-card-actions">
              <button class="btn-ghost btn-icon btn-sm edit-app-btn" data-id="${app.id}" title="Edit">✏️</button>
              <button class="btn-ghost btn-icon btn-sm delete-app-btn" data-id="${app.id}" title="Delete">🗑️</button>
            </div>
          </div>
          ${app.notes ? `<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(app.notes)}</div>` : ''}
        </div>
      `;
    }).join('');

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

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      const appId = e.dataTransfer.getData('text/plain');
      const newStage = zone.dataset.stage;

      try {
        await updateApplication(appId, { stage: newStage });
        const app = apps.find(a => a.id === appId);
        if (app) app.stage = newStage;
        renderBoard(container, apps);
        showToast(`Moved to ${newStage}`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function showAddModal(container, apps) {
  showModal({
    title: 'New Application',
    bodyHTML: `
      <div class="input-group">
        <label for="app-company">Company *</label>
        <input class="input" id="app-company" placeholder="Google, Meta, Startup XYZ..." required>
      </div>
      <div class="input-group">
        <label for="app-role">Role *</label>
        <input class="input" id="app-role" placeholder="Software Engineer, Data Analyst..." required>
      </div>
      <div class="input-group">
        <label for="app-stage">Stage</label>
        <select class="input" id="app-stage">
          ${STAGES.map(s => `<option value="${s}" ${s === 'applied' ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label for="app-deadline">Deadline</label>
        <input type="date" class="input" id="app-deadline">
      </div>
      <div class="input-group">
        <label for="app-notes">Notes</label>
        <textarea class="input" id="app-notes" rows="3" placeholder="Any notes..."></textarea>
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
          stage: document.querySelector('#app-stage').value,
          deadline: document.querySelector('#app-deadline').value || null,
          notes: document.querySelector('#app-notes').value.trim() || null,
        });
        apps.push(newApp);
        renderBoard(container, apps);
        showToast(`Added ${company} — ${role}`, 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
  });
}

function showEditModal(container, apps, app) {
  showModal({
    title: 'Edit Application',
    bodyHTML: `
      <div class="input-group">
        <label for="edit-company">Company</label>
        <input class="input" id="edit-company" value="${escapeAttr(app.company)}">
      </div>
      <div class="input-group">
        <label for="edit-role">Role</label>
        <input class="input" id="edit-role" value="${escapeAttr(app.role)}">
      </div>
      <div class="input-group">
        <label for="edit-stage">Stage</label>
        <select class="input" id="edit-stage">
          ${STAGES.map(s => `<option value="${s}" ${s === app.stage ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label for="edit-deadline">Deadline</label>
        <input type="date" class="input" id="edit-deadline" value="${app.deadline || ''}">
      </div>
      <div class="input-group">
        <label for="edit-notes">Notes</label>
        <textarea class="input" id="edit-notes" rows="3">${escapeHtml(app.notes || '')}</textarea>
      </div>
    `,
    confirmText: 'Save Changes',
    onConfirm: async (close) => {
      try {
        const updates = {
          company: document.querySelector('#edit-company').value.trim(),
          role: document.querySelector('#edit-role').value.trim(),
          stage: document.querySelector('#edit-stage').value,
          deadline: document.querySelector('#edit-deadline').value || null,
          notes: document.querySelector('#edit-notes').value.trim() || null,
        };
        const updated = await updateApplication(app.id, updates);
        Object.assign(app, updated);
        renderBoard(container, apps);
        showToast('Application updated', 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
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
