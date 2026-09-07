// ─── Career OS: Peer Matchmaking Page ───
import { getMyPeerProfile, savePeerProfile, listPeers, sendPeerRequest, listPeerRequests, respondPeerRequest } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export async function renderPeers(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1>Peer Matchmaking</h1>
        <p>Connect with peers targeting similar companies & roles for mock interviews, feedback, and accountability</p>
      </div>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
        <button class="btn btn-ghost" id="view-requests-btn">
          📬 Requests <span id="requests-badge" style="display:none;background:var(--accent-solid);color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:4px">0</span>
        </button>
        <button class="btn btn-primary" id="edit-profile-btn">
          👤 My Match Profile
        </button>
      </div>
    </div>

    <div id="peer-status-banner" style="margin-bottom:var(--space-6)"></div>

    <div class="glass-card-static" style="padding:var(--space-4) var(--space-5);margin-bottom:var(--space-6);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-4)">
      <div style="display:flex;align-items:center;gap:var(--space-3);flex:1;min-width:240px">
        <span style="font-size:var(--text-lg)">🔍</span>
        <input class="input" id="peer-search-input" placeholder="Search by role, company, or skill..." style="padding:var(--space-2) var(--space-3)">
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-tertiary)" id="peer-count-text">
        Loading peers...
      </div>
    </div>

    <div id="peers-grid" class="dashboard-grid" style="grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-6)">
      ${skeletonCards(6)}
    </div>
  `;

  // Attach Header Buttons
  container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
    openProfileModal(container);
  });

  container.querySelector('#view-requests-btn')?.addEventListener('click', () => {
    openRequestsModal();
  });

  // Load Initial Data
  await loadPeersPage(container);
}

let cachedMyProfile = null;
let cachedPeers = [];

async function loadPeersPage(container) {
  try {
    const [myProfile, peers, reqs] = await Promise.all([
      getMyPeerProfile().catch(() => null),
      listPeers().catch(() => []),
      listPeerRequests().catch(() => ({ incoming: [], outgoing: [] })),
    ]);

    cachedMyProfile = myProfile;
    cachedPeers = peers;

    // Requests badge
    const pendingIncoming = (reqs.incoming || []).filter(r => r.status === 'pending');
    const badgeEl = container.querySelector('#requests-badge');
    if (badgeEl && pendingIncoming.length > 0) {
      badgeEl.textContent = pendingIncoming.length;
      badgeEl.style.display = 'inline-block';
    }

    renderBanner(container, myProfile);
    renderPeerCards(container, peers);

    // Search filter
    const searchInput = container.querySelector('#peer-search-input');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = cachedPeers.filter(p => {
        const role = (p.target_role || '').toLowerCase();
        const comp = (p.target_company || '').toLowerCase();
        const skills = (p.skills || []).map(s => s.toLowerCase()).join(' ');
        return role.includes(q) || comp.includes(q) || skills.includes(q);
      });
      renderPeerCards(container, filtered);
    });

  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBanner(container, myProfile) {
  const bannerEl = container.querySelector('#peer-status-banner');
  if (!bannerEl) return;

  if (!myProfile) {
    bannerEl.innerHTML = `
      <div class="glass-card" style="padding:var(--space-4) var(--space-5);border-left:4px solid var(--accent-solid);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
        <div>
          <strong style="color:var(--text-primary)">Complete your Match Profile</strong>
          <p style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">
            Set your target role and skills to unlock higher peer compatibility scores and let others connect with you.
          </p>
        </div>
        <button class="btn btn-secondary btn-sm" id="banner-setup-btn">Set Up Profile</button>
      </div>
    `;
    bannerEl.querySelector('#banner-setup-btn')?.addEventListener('click', () => {
      openProfileModal(container);
    });
  } else {
    bannerEl.innerHTML = `
      <div class="glass-card-static" style="padding:var(--space-3) var(--space-5);display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap">
        <span style="font-size:var(--text-sm);color:var(--text-tertiary)">Your Profile:</span>
        <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-primary)">🎯 ${escapeHtml(myProfile.target_role)}</span>
        ${myProfile.target_company ? `<span style="font-size:var(--text-xs);color:var(--text-secondary);background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:var(--radius-sm)">🏢 ${escapeHtml(myProfile.target_company)}</span>` : ''}
        <span style="font-size:var(--text-xs);color:var(--info);background:var(--info-bg);padding:2px 8px;border-radius:var(--radius-sm)">${escapeHtml(myProfile.availability || 'Flexible')}</span>
        <span style="font-size:var(--text-xs);color:var(--text-tertiary);margin-left:auto">${(myProfile.skills || []).length} skills listed</span>
      </div>
    `;
  }
}

function renderPeerCards(container, peers) {
  const gridEl = container.querySelector('#peers-grid');
  const countEl = container.querySelector('#peer-count-text');
  if (!gridEl) return;

  if (countEl) {
    countEl.textContent = `${peers.length} active ${peers.length === 1 ? 'peer' : 'peers'} found`;
  }

  if (peers.length === 0) {
    gridEl.innerHTML = `
      <div class="glass-card-static" style="grid-column:1/-1;padding:var(--space-10);text-align:center">
        <div style="font-size:2.5rem;margin-bottom:var(--space-3)">👥</div>
        <h3>No Peers Found</h3>
        <p style="color:var(--text-secondary);max-width:480px;margin:var(--space-2) auto var(--space-4);font-size:var(--text-sm)">
          Be the first in your role or company circle! Complete your match profile to appear in peer discovery.
        </p>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = peers.map(peer => {
    const initials = (peer.target_role || 'P').slice(0, 2).toUpperCase();
    const score = peer.match_score || 50;
    const scoreColor = score >= 70 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--info)';
    const scoreBg = score >= 70 ? 'var(--success-bg)' : score >= 50 ? 'var(--warning-bg)' : 'var(--info-bg)';

    return `
      <div class="glass-card-static slide-up" style="display:flex;flex-direction:column;justify-content:space-between;padding:var(--space-5);border-radius:var(--radius-lg)">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div style="width:40px;height:40px;border-radius:var(--radius-md);background:linear-gradient(135deg, var(--accent-start), var(--accent-end));display:flex;align-items:center;justify-content:center;font-weight:var(--weight-bold);color:#fff;font-size:var(--text-sm)">
                ${initials}
              </div>
              <div>
                <div style="font-weight:var(--weight-semibold);font-size:var(--text-base);color:var(--text-primary);line-height:var(--leading-tight)">
                  ${escapeHtml(peer.target_role)}
                </div>
                ${peer.target_company ? `<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Targeting ${escapeHtml(peer.target_company)}</div>` : ''}
              </div>
            </div>
            <span style="font-size:var(--text-xs);font-weight:var(--weight-semibold);color:${scoreColor};background:${scoreBg};padding:3px 8px;border-radius:var(--radius-full);white-space:nowrap">
              ⚡ ${score}% Match
            </span>
          </div>

          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);font-size:11px">
            <span style="background:rgba(255,255,255,0.05);padding:2px 7px;border-radius:var(--radius-sm);color:var(--text-secondary)">
              📊 ${escapeHtml(peer.experience_level || 'Mid-Level')}
            </span>
            <span style="background:rgba(255,255,255,0.05);padding:2px 7px;border-radius:var(--radius-sm);color:var(--text-secondary)">
              🕒 ${escapeHtml(peer.availability || 'Flexible')}
            </span>
          </div>

          ${peer.bio ? `<p style="font-size:var(--text-xs);color:var(--text-tertiary);line-height:var(--leading-normal);margin-bottom:var(--space-3);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escapeHtml(peer.bio)}</p>` : ''}

          ${(peer.skills && peer.skills.length > 0) ? `
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:var(--space-4)">
              ${peer.skills.slice(0, 5).map(s => {
                const isShared = (peer.shared_skills || []).includes(s);
                return `
                  <span style="font-size:11px;padding:2px 7px;border-radius:var(--radius-sm);text-transform:capitalize;background:${isShared ? 'rgba(124,108,240,0.15)' : 'rgba(255,255,255,0.03)'};color:${isShared ? 'var(--accent-hover)' : 'var(--text-tertiary)'};border:1px solid ${isShared ? 'var(--border-accent)' : 'transparent'}">
                    ${escapeHtml(s)}
                  </span>
                `;
              }).join('')}
              ${peer.skills.length > 5 ? `<span style="font-size:10px;color:var(--text-tertiary);align-self:center">+${peer.skills.length - 5} more</span>` : ''}
            </div>
          ` : ''}
        </div>

        <button class="btn btn-secondary btn-sm connect-peer-btn" data-id="${peer.user_id}" data-role="${escapeAttr(peer.target_role)}" style="width:100%;justify-content:center">
          🤝 Request Mock Practice
        </button>
      </div>
    `;
  }).join('');

  // Connect click handlers
  gridEl.querySelectorAll('.connect-peer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openConnectModal(btn.dataset.id, btn.dataset.role);
    });
  });
}

function openProfileModal(container) {
  const profile = cachedMyProfile || {};
  const skillsString = (profile.skills || []).join(', ');

  showModal({
    title: profile.id ? 'Edit Your Match Profile' : 'Create Your Match Profile',
    bodyHTML: `
      <div class="input-group">
        <label for="peer-name">Display Name</label>
        <input class="input" id="peer-name" placeholder="e.g. Anirudh or Alex M." value="${escapeAttr(profile.display_name || '')}">
      </div>
      <div class="input-group">
        <label for="peer-role">Target Role *</label>
        <input class="input" id="peer-role" placeholder="e.g. Senior Backend Engineer, Frontend Specialist..." value="${escapeAttr(profile.target_role || '')}" required>
      </div>
      <div class="input-group">
        <label for="peer-company">Target Company (Optional)</label>
        <input class="input" id="peer-company" placeholder="e.g. Google, Meta, Stripe, Startups..." value="${escapeAttr(profile.target_company || '')}">
      </div>
      <div class="input-group">
        <label for="peer-skills">Top Skills (Comma-separated)</label>
        <input class="input" id="peer-skills" placeholder="e.g. Python, Docker, React, System Design, SQL" value="${escapeAttr(skillsString)}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="input-group">
          <label for="peer-level">Experience Level</label>
          <select class="input" id="peer-level">
            ${['Junior / Entry', 'Mid-Level', 'Senior', 'Staff / Lead', 'Career Switcher'].map(lvl => `
              <option value="${lvl}" ${profile.experience_level === lvl ? 'selected' : ''}>${lvl}</option>
            `).join('')}
          </select>
        </div>
        <div class="input-group">
          <label for="peer-avail">Availability</label>
          <select class="input" id="peer-avail">
            ${['Flexible', 'Weekends Only', 'Weekday Evenings', 'Full-time Practice'].map(av => `
              <option value="${av}" ${profile.availability === av ? 'selected' : ''}>${av}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="input-group">
        <label for="peer-email">Preferred Contact Email (Optional)</label>
        <input type="email" class="input" id="peer-email" placeholder="you@example.com" value="${escapeAttr(profile.contact_email || '')}">
      </div>
      <div class="input-group">
        <label for="peer-bio">Short Bio & Focus Topics</label>
        <textarea class="input" id="peer-bio" rows="2" placeholder="Tell peers what you are practicing (e.g. LeetCode mediums, system design interviews)...">${escapeHtml(profile.bio || '')}</textarea>
      </div>
    `,
    confirmText: 'Save Match Profile',
    onConfirm: async (close) => {
      const target_role = document.querySelector('#peer-role').value.trim();
      if (!target_role) {
        showToast('Target role is required', 'warning');
        return;
      }

      try {
        const updated = await savePeerProfile({
          display_name: document.querySelector('#peer-name')?.value.trim() || undefined,
          target_role,
          target_company: document.querySelector('#peer-company').value.trim(),
          skills: document.querySelector('#peer-skills').value.trim(),
          experience_level: document.querySelector('#peer-level').value,
          availability: document.querySelector('#peer-avail').value,
          contact_email: document.querySelector('#peer-email').value.trim() || null,
          bio: document.querySelector('#peer-bio').value.trim(),
        });
        cachedMyProfile = updated;
        showToast('Profile saved successfully!', 'success');
        close();
        await loadPeersPage(container);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

function openConnectModal(receiverId, receiverRole) {
  showModal({
    title: `Connect with ${receiverRole || 'Peer'}`,
    bodyHTML: `
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">
        Send an invitation to connect for peer mock interviews, resume exchange, or accountability sessions.
      </p>
      <div class="input-group">
        <label for="connect-message">Message</label>
        <textarea class="input" id="connect-message" rows="3" placeholder="Hi! I'm also preparing for software roles and would love to run a practice mock interview together this week..."></textarea>
      </div>
    `,
    confirmText: 'Send Request',
    onConfirm: async (close) => {
      const message = document.querySelector('#connect-message').value.trim();
      try {
        await sendPeerRequest(receiverId, message);
        showToast('Connection request sent!', 'success');
        close();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

async function openRequestsModal() {
  try {
    const data = await listPeerRequests();
    const incoming = data.incoming || [];
    const outgoing = data.outgoing || [];

    const incomingHTML = incoming.length === 0
      ? '<p style="color:var(--text-tertiary);font-size:var(--text-xs);padding:var(--space-2) 0">No incoming connection requests.</p>'
      : incoming.map(r => `
          <div style="padding:var(--space-3);background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:var(--text-xs);color:var(--text-secondary)">Status: <strong style="color:${r.status === 'accepted' ? 'var(--success)' : r.status === 'declined' ? 'var(--danger)' : 'var(--warning)'}">${r.status}</strong></span>
              <span style="font-size:10px;color:var(--text-tertiary)">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            ${r.message ? `<p style="font-size:var(--text-xs);color:var(--text-primary);margin-bottom:var(--space-2)">"${escapeHtml(r.message)}"</p>` : ''}
            ${r.status === 'pending' ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">
                <button class="btn btn-sm btn-primary accept-req-btn" data-id="${r.id}">Accept</button>
                <button class="btn btn-sm btn-ghost decline-req-btn" data-id="${r.id}">Decline</button>
              </div>
            ` : ''}
          </div>
        `).join('');

    const outgoingHTML = outgoing.length === 0
      ? '<p style="color:var(--text-tertiary);font-size:var(--text-xs);padding:var(--space-2) 0">No sent requests.</p>'
      : outgoing.map(r => `
          <div style="padding:var(--space-2) var(--space-3);background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);margin-bottom:var(--space-2);display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">Sent: ${r.message ? escapeHtml(r.message.slice(0, 30)) + '...' : 'Mock interview request'}</span>
            <span style="font-size:10px;color:${r.status === 'accepted' ? 'var(--success)' : r.status === 'declined' ? 'var(--danger)' : 'var(--warning)'}">
              ${r.status}
            </span>
          </div>
        `).join('');

    showModal({
      title: 'Peer Connection Requests',
      bodyHTML: `
        <h4 style="font-size:var(--text-sm);margin-bottom:var(--space-2)">📥 Incoming Requests (${incoming.length})</h4>
        <div id="incoming-container" style="max-height:180px;overflow-y:auto;margin-bottom:var(--space-4)">${incomingHTML}</div>

        <h4 style="font-size:var(--text-sm);margin-bottom:var(--space-2)">📤 Sent Requests (${outgoing.length})</h4>
        <div style="max-height:150px;overflow-y:auto">${outgoingHTML}</div>
      `,
      confirmText: 'Close',
      onConfirm: (close) => close(),
    });

    // Wire accept/decline buttons
    document.querySelectorAll('.accept-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await respondPeerRequest(btn.dataset.id, 'accepted');
          showToast('Request accepted!', 'success');
          btn.parentElement.innerHTML = '<span style="font-size:11px;color:var(--success)">Accepted ✅</span>';
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    document.querySelectorAll('.decline-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await respondPeerRequest(btn.dataset.id, 'declined');
          showToast('Request declined', 'info');
          btn.parentElement.innerHTML = '<span style="font-size:11px;color:var(--danger)">Declined</span>';
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

  } catch (err) {
    showToast(err.message, 'error');
  }
}

function skeletonCards(n) {
  return Array.from({ length: n }, () =>
    '<div class="glass-card-static" style="height:190px"><div class="skeleton skeleton-card" style="height:100%"></div></div>'
  ).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
