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
        <button class="btn btn-secondary" id="instant-room-btn">
          🎙️ Live Mock Room
        </button>
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
  container.querySelector('#instant-room-btn')?.addEventListener('click', () => {
    openPracticeRoomModal();
  });

  container.querySelector('#edit-profile-btn')?.addEventListener('click', () => {
    openProfileModal(container);
  });

  container.querySelector('#view-requests-btn')?.addEventListener('click', () => {
    openRequestsModal();
  });

  // Check URL query parameters for auto-joining room (e.g. #/peers?room=xyz)
  const hashParts = window.location.hash.split('?');
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    const roomId = params.get('room');
    if (roomId) {
      setTimeout(() => openPracticeRoomModal(null, roomId), 250);
    }
  }

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
        <div style="display:flex;gap:var(--space-2);margin-top:auto">
          <button class="btn btn-secondary btn-sm connect-peer-btn" data-id="${peer.user_id}" data-role="${escapeAttr(peer.target_role)}" style="flex:1;justify-content:center">
            🤝 Connect
          </button>
          <button class="btn btn-primary btn-sm practice-room-btn" data-id="${peer.user_id}" data-role="${escapeAttr(peer.target_role)}" data-company="${escapeAttr(peer.target_company || '')}" style="flex:1;justify-content:center">
            🎙️ Mock Room
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Connect click handlers
  gridEl.querySelectorAll('.connect-peer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openConnectModal(btn.dataset.id, btn.dataset.role);
    });
  });

  gridEl.querySelectorAll('.practice-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openPracticeRoomModal({
        user_id: btn.dataset.id,
        target_role: btn.dataset.role,
        target_company: btn.dataset.company,
      });
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
            ` : r.status === 'accepted' ? `
              <div style="margin-top:var(--space-2)">
                <button class="btn btn-sm btn-secondary launch-req-room-btn" data-id="${r.id}">
                  🎙️ Enter Practice Room
                </button>
              </div>
            ` : ''}
          </div>
        `).join('');

    const outgoingHTML = outgoing.length === 0
      ? '<p style="color:var(--text-tertiary);font-size:var(--text-xs);padding:var(--space-2) 0">No sent requests.</p>'
      : outgoing.map(r => `
          <div style="padding:var(--space-2) var(--space-3);background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);margin-bottom:var(--space-2);display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)">
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">Sent: ${r.message ? escapeHtml(r.message.slice(0, 30)) + '...' : 'Mock interview request'}</span>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:10px;color:${r.status === 'accepted' ? 'var(--success)' : r.status === 'declined' ? 'var(--danger)' : 'var(--warning)'}">
                ${r.status}
              </span>
              ${r.status === 'accepted' ? `
                <button class="btn btn-sm btn-secondary launch-req-room-btn" data-id="${r.id}" style="font-size:10px;padding:2px 7px">
                  🎙️ Room
                </button>
              ` : ''}
            </div>
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
          btn.parentElement.innerHTML = `
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:11px;color:var(--success)">Accepted ✅</span>
              <button class="btn btn-sm btn-secondary launch-req-room-btn" data-id="${btn.dataset.id}" style="font-size:10px;padding:2px 7px">
                🎙️ Enter Room
              </button>
            </div>
          `;
          btn.parentElement.querySelector('.launch-req-room-btn')?.addEventListener('click', () => {
            openPracticeRoomModal(null, `req-${btn.dataset.id.slice(0, 8)}`);
          });
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

    document.querySelectorAll('.launch-req-room-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openPracticeRoomModal(null, `req-${btn.dataset.id.slice(0, 8)}`);
      });
    });

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Curated Mock Practice Question Bank ───
const PRACTICE_QUESTIONS = [
  {
    id: 'sd-tinyurl',
    category: 'System Design',
    title: 'Distributed URL Shortener (TinyURL)',
    difficulty: 'Medium',
    duration: '45 min',
    overview: 'Design a scalable, highly available URL shortening service similar to TinyURL or bit.ly.',
    requirements: [
      'Functional: Shorten long URL to unique 7-char alias.',
      'Functional: Redirect short URLs with HTTP 301/302 to destination in < 10ms.',
      'Scale: 100M URLs created/month, 100:1 read-to-write ratio (~3,800 reads/sec).',
      'Non-Functional: High availability (99.99%), low latency, fault tolerance.'
    ],
    clarifications: [
      'Characters: [a-zA-Z0-9] = 62 chars. 62^7 = ~3.5 trillion URLs.',
      '301 (Permanent) vs 302 (Temporary): 301 reduces server load via browser cache; 302 enables real-time analytics.'
    ],
    architectureTips: [
      'ID Gen: Distributed Snowflake / Ticket Server or pre-allocated Base62 ranges.',
      'Storage: NoSQL (DynamoDB / Cassandra) or PostgreSQL with B-tree index on short_code.',
      'Caching: Redis / Memcached cluster caching top 20% most active URLs (80/20 rule).'
    ],
    codeSnippet: `# Python Base62 Encoder Skeleton
CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARS[0]
    res = []
    while num > 0:
        res.append(CHARS[num % 62])
        num //= 62
    return "".join(reversed(res)).zfill(7)
`
  },
  {
    id: 'sd-ratelimiter',
    category: 'System Design',
    title: 'Distributed API Rate Limiter',
    difficulty: 'Hard',
    duration: '45 min',
    overview: 'Design a resilient distributed rate limiter middleware to protect microservices against abusive traffic.',
    requirements: [
      'Functional: Throttle requests by client IP, user ID, or API key.',
      'Functional: Return HTTP 429 Too Many Requests with Retry-After header.',
      'Scale: 500k requests/sec across regions with < 2ms latency overhead.',
      'Non-Functional: Fault tolerance (fallback open on cache failure).'
    ],
    clarifications: [
      'Algorithms: Token Bucket, Leaky Bucket, Sliding Window Counter.',
      'Placement: API Gateway (Envoy/Kong) or application middleware layer.'
    ],
    architectureTips: [
      'Sliding Window Counter: Combines current window count with previous window weighted percentage.',
      'Redis Implementation: Lua scripts for atomic get-and-increment operations to avoid race conditions.'
    ],
    codeSnippet: `# Sliding Window Counter (Python / Redis)
import time

def is_allowed(redis_client, key: str, limit: int, window_sec: int) -> bool:
    now = time.time()
    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, 0, now - window_sec)
    pipe.zcard(key)
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, window_sec)
    _, count, _, _ = pipe.execute()
    return count < limit
`
  },
  {
    id: 'sd-chat',
    category: 'System Design',
    title: 'Real-Time Messaging System (Slack / WhatsApp)',
    difficulty: 'Hard',
    duration: '45 min',
    overview: 'Design a low-latency 1-on-1 and group real-time messaging architecture with offline sync.',
    requirements: [
      'Functional: Low-latency 1-on-1 messaging (< 100ms globally).',
      'Functional: Online presence status & read receipts.',
      'Scale: 50M daily active users sending 1B messages/day.'
    ],
    clarifications: [
      'Protocol: WebSockets for bidirectional duplex streaming; HTTP fallback.',
      'Ordering: Monotonically increasing sequence IDs per chat channel.'
    ],
    architectureTips: [
      'WebSocket Servers: Maintain stateful persistent TCP connections.',
      'Session Registry: Redis cluster mapping active userId -> websocket_server_ip.',
      'Message Store: Apache Cassandra / ScyllaDB for append-only high write volume.'
    ],
    codeSnippet: `// WebSocket Chat Message Schema
{
  "message_id": "msg_9f82a1b",
  "channel_id": "ch_team_backend",
  "sender_id": "usr_442",
  "recipient_id": "usr_109",
  "content": "API latency reduced by 40% after Redis caching!",
  "timestamp": 1725800000000,
  "status": "delivered"
}
`
  },
  {
    id: 'algo-lru',
    category: 'Algorithms',
    title: 'LRU Cache (Least Recently Used)',
    difficulty: 'Medium',
    duration: '35 min',
    overview: 'Implement an LRU cache with get(key) and put(key, val) running in O(1) average time complexity.',
    requirements: [
      'LRUCache(capacity): Initializes cache.',
      'get(key): Returns value if exists, else -1. Moves accessed item to MRU position.',
      'put(key, value): Inserts or updates. If full, evicts least recently used.'
    ],
    clarifications: [
      'O(1) time complexity requirement for both get and put.',
      'Data structure: Doubly Linked List + Hash Map.'
    ],
    architectureTips: [
      'Dummy Head & Tail nodes prevent null-check edge cases.',
      'Always update both the hash map and linked list pointers.'
    ],
    codeSnippet: `class Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap, self.cache = capacity, {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add_to_head(node)
            return node.val
        return -1
`
  },
  {
    id: 'algo-topk',
    category: 'Algorithms',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    duration: '30 min',
    overview: 'Given an integer array nums and integer k, return the k most frequent elements in better than O(N log N) time.',
    requirements: [
      'Input: nums = [1,1,1,2,2,3], k = 2 -> Output: [1,2]',
      'Target time complexity: O(N log K) or O(N).'
    ],
    clarifications: [
      '1 <= k <= number of unique elements.',
      'Can numbers be negative? Yes.'
    ],
    architectureTips: [
      'Approach 1: Min-Heap of size K (O(N log K)).',
      'Approach 2: Bucket Sort array indexed by frequency (O(N)).'
    ],
    codeSnippet: `from collections import Counter
import heapq

def topKFrequent(nums: list[int], k: int) -> list[int]:
    count = Counter(nums)
    return heapq.nlargest(k, count.keys(), key=count.get)
`
  },
  {
    id: 'star-conflict',
    category: 'Behavioral / STAR',
    title: 'Handling Technical Disagreement on Architecture',
    difficulty: 'Behavioral',
    duration: '30 min',
    overview: 'Evaluate technical leadership, empathy, objective decision-making, and constructive resolution under pressure.',
    requirements: [
      'Prompt: "Tell me about a time you strongly disagreed with a team member or manager regarding an engineering decision."',
      'Candidate should structure answer via STAR: Situation, Task, Action, Result.'
    ],
    clarifications: [
      'Did candidate focus on data, benchmarks, and business tradeoffs rather than personal opinions?',
      'Did candidate demonstrate ability to "Disagree and Commit" if needed?'
    ],
    architectureTips: [
      'Green flags: Ran proof-of-concept (POC), benchmarked p99 latency, documented RFC tradeoffs, sought neutral review.',
      'Red flags: Blaming others, forcing choice without data, holding resentment.'
    ],
    codeSnippet: `STAR RESPONSE TEMPLATE:
- Situation: During our microservice migration, team debated MongoDB vs PostgreSQL.
- Task: Align on the storage engine without delaying sprint timeline.
- Action: Built 1-day benchmark comparing throughput, query flexibility, and operational overhead.
- Result: Team adopted Postgres with JSONB, saving $1,200/mo and shipping on schedule.
`
  }
];

// ─── Live 1-on-1 WebRTC Mock Practice Room ───
export function openPracticeRoomModal(peer = null, initialRoomId = null) {
  const roomId = initialRoomId || `mock-${Math.random().toString(36).substring(2, 8)}`;
  let currentRole = 'interviewer';
  let localStream = null;
  let pc = null;
  let isMuted = false;
  let isVideoOff = false;
  let timerSeconds = 45 * 60;
  let timerInterval = null;
  let isTimerRunning = false;
  const scores = [4, 4, 4, 4]; // [Problem Solving, Architecture, Code Quality, Communication]

  // Multi-tab signaling & scratchpad synchronization
  const channel = new BroadcastChannel(`career_os_mock_${roomId}`);

  showModal({
    title: '🎙️ 1-on-1 Peer Mock Practice Room',
    confirmText: 'Done / Leave Room',
    cancelText: 'Minimize',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);min-width:320px;max-width:880px">
        <!-- Top Session Bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3);background:var(--bg-card);padding:var(--space-2) var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Room:</span>
            <code style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:var(--radius-sm);font-weight:bold;color:var(--accent-hover)">${escapeHtml(roomId)}</code>
            <button class="btn btn-ghost btn-sm" id="copy-room-link-btn" title="Copy Invite Link" style="font-size:11px;padding:2px 8px">
              📋 Copy Link
            </button>
          </div>

          <!-- Countdown Timer -->
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.3);padding:3px 10px;border-radius:var(--radius-full);border:1px solid var(--border-subtle)">
              <span style="font-size:12px">⏱️</span>
              <span id="room-timer-display" style="font-family:monospace;font-size:14px;font-weight:700;color:var(--text-primary)">45:00</span>
            </div>
            <button class="btn btn-ghost btn-sm" id="timer-toggle-btn" style="font-size:11px;padding:2px 8px">▶️ Start</button>
            <button class="btn btn-ghost btn-sm" id="timer-reset-btn" style="font-size:11px;padding:2px 6px">🔄</button>
            <div style="display:flex;gap:2px">
              <button class="btn btn-ghost btn-sm timer-preset-btn" data-min="30" style="font-size:10px;padding:1px 5px">30m</button>
              <button class="btn btn-ghost btn-sm timer-preset-btn" data-min="45" style="font-size:10px;padding:1px 5px;font-weight:bold">45m</button>
              <button class="btn btn-ghost btn-sm timer-preset-btn" data-min="60" style="font-size:10px;padding:1px 5px">60m</button>
            </div>
          </div>

          <!-- Role Switcher -->
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span style="font-size:11px;color:var(--text-tertiary)">Role:</span>
            <div style="display:inline-flex;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);overflow:hidden">
              <button class="btn btn-primary btn-sm role-btn" data-role="interviewer" style="font-size:11px;padding:2px 8px;border-radius:0">Interviewer</button>
              <button class="btn btn-ghost btn-sm role-btn" data-role="candidate" style="font-size:11px;padding:2px 8px;border-radius:0">Candidate</button>
            </div>
          </div>
        </div>

        <!-- Main Video Feeds (2-column grid) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-3)">
          <!-- Local Video Box -->
          <div style="position:relative;background:#0d1117;border:1px solid var(--border-subtle);border-radius:var(--radius-md);height:190px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <video id="room-local-video" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>
            <div id="room-local-fallback" style="display:none;flex-direction:column;align-items:center;gap:6px;color:var(--text-secondary)">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg, var(--accent-start), var(--accent-end));display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff">👤</div>
              <span style="font-size:11px">You (Audio / Fallback Active)</span>
            </div>
            <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);padding:2px 8px;border-radius:var(--radius-sm);font-size:11px;color:#fff;backdrop-filter:blur(4px)">
              You <span id="local-role-tag" style="color:var(--accent-hover)">(Interviewer)</span>
            </div>
            <!-- Media controls overlay -->
            <div style="position:absolute;bottom:8px;right:8px;display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" id="btn-toggle-mic" title="Mute/Unmute" style="font-size:11px;padding:3px 7px;background:rgba(0,0,0,0.65);color:#fff">🎤</button>
              <button class="btn btn-ghost btn-sm" id="btn-toggle-cam" title="Video On/Off" style="font-size:11px;padding:3px 7px;background:rgba(0,0,0,0.65);color:#fff">📹</button>
              <button class="btn btn-ghost btn-sm" id="btn-screen-share" title="Share Screen" style="font-size:11px;padding:3px 7px;background:rgba(0,0,0,0.65);color:#fff">🖥️</button>
            </div>
          </div>

          <!-- Peer Video Box -->
          <div style="position:relative;background:#0d1117;border:1px solid var(--border-subtle);border-radius:var(--radius-md);height:190px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <video id="room-remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:none"></video>
            <div id="room-remote-fallback" style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text-tertiary);text-align:center;padding:var(--space-2)">
              <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:20px">👥</div>
              <span id="remote-peer-status" style="font-size:11px">Waiting for peer to join...</span>
              <button class="btn btn-secondary btn-sm" id="btn-share-invite" style="font-size:10.5px;padding:2px 8px;margin-top:2px">Copy Invite Link</button>
            </div>
            <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);padding:2px 8px;border-radius:var(--radius-sm);font-size:11px;color:#fff;backdrop-filter:blur(4px)">
              <span id="remote-peer-name">${peer ? escapeHtml(peer.target_role) : 'Peer Partner'}</span>
            </div>
          </div>
        </div>

        <!-- Role Guidance banner -->
        <div id="role-guide-banner" style="font-size:11.5px;padding:8px 12px;background:rgba(124,108,240,0.1);border-left:3px solid var(--accent-solid);border-radius:var(--radius-sm);color:var(--text-secondary)">
          <strong>Interviewer Mode:</strong> Guide the session, ask clarifying questions, and rate the candidate using the rubric below.
        </div>

        <!-- Workspace Tabs -->
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">
          <div style="display:flex;gap:var(--space-2);border-bottom:1px solid var(--border-subtle);padding-bottom:var(--space-2)">
            <button class="btn btn-primary btn-sm ws-tab-btn" data-tab="rubric" style="font-size:12px">📝 Rubric & Evaluation</button>
            <button class="btn btn-ghost btn-sm ws-tab-btn" data-tab="questions" style="font-size:12px">💡 Question Bank</button>
            <button class="btn btn-ghost btn-sm ws-tab-btn" data-tab="scratchpad" style="font-size:12px">💻 Live Scratchpad</button>
          </div>

          <!-- Tab 1: Rubric -->
          <div id="tab-rubric-content" class="ws-tab-panel" style="display:flex;flex-direction:column;gap:var(--space-3)">
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm)">
              <span style="font-size:var(--text-xs);color:var(--text-secondary)">Rate candidate on 4 dimensions (1 - 5):</span>
              <span id="rubric-score-badge" style="font-size:var(--text-xs);font-weight:700;color:var(--success)">
                Score: 16/20 (80%) • Hire 👍
              </span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(190px, 1fr));gap:var(--space-2)">
              ${['Problem Solving & Scope', 'System / Algo Design', 'Code & Edge Cases', 'Communication'].map((dim, idx) => `
                <div style="background:var(--bg-input);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);border:1px solid var(--border-subtle)">
                  <div style="font-size:11px;font-weight:600;margin-bottom:6px;color:var(--text-secondary)">${dim}</div>
                  <div style="display:flex;gap:4px">
                    ${[1, 2, 3, 4, 5].map(pt => `
                      <button class="btn btn-sm rating-pt-btn ${pt === 4 ? 'btn-primary' : 'btn-ghost'}" data-idx="${idx}" data-val="${pt}" style="flex:1;padding:2px 0;font-size:11px;min-width:0">
                        ${pt}
                      </button>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="input-group" style="margin-bottom:0">
              <label for="rubric-notes-input" style="font-size:11px">Constructive Feedback & Key Takeaways</label>
              <textarea class="input" id="rubric-notes-input" rows="2" placeholder="Great articulation of data storage tradeoffs. Make sure to clarify p99 latency constraints before designing the cache layer..." style="font-size:12px"></textarea>
            </div>

            <div style="display:flex;justify-content:flex-end">
              <button class="btn btn-secondary btn-sm" id="export-scorecard-btn" style="font-size:11px">
                💾 Download Scorecard Report (.txt)
              </button>
            </div>
          </div>

          <!-- Tab 2: Question Bank -->
          <div id="tab-questions-content" class="ws-tab-panel" style="display:none;flex-direction:column;gap:var(--space-3)">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
              <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Select Question:</span>
                <select class="input" id="question-select-dropdown" style="font-size:12px;padding:3px 8px;width:240px">
                  ${PRACTICE_QUESTIONS.map(q => `
                    <option value="${q.id}">[${q.category}] ${q.title}</option>
                  `).join('')}
                </select>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-insert-scratchpad" style="font-size:11px">
                📋 Insert Question into Scratchpad
              </button>
            </div>

            <div id="question-detail-card" style="background:var(--bg-input);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--border-subtle);display:flex;flex-direction:column;gap:var(--space-2);max-height:220px;overflow-y:auto">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Tab 3: Live Shared Scratchpad -->
          <div id="tab-scratchpad-content" class="ws-tab-panel" style="display:none;flex-direction:column;gap:var(--space-2)">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
              <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-ghost btn-sm pad-template-btn" data-type="python" style="font-size:10.5px;padding:2px 7px">🐍 Python</button>
                <button class="btn btn-ghost btn-sm pad-template-btn" data-type="system" style="font-size:10.5px;padding:2px 7px">📐 Architecture</button>
                <button class="btn btn-ghost btn-sm pad-template-btn" data-type="star" style="font-size:10.5px;padding:2px 7px">⭐ STAR</button>
              </div>
              <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-ghost btn-sm" id="btn-clear-scratchpad" style="font-size:10.5px;padding:2px 7px">🧹 Clear</button>
                <button class="btn btn-secondary btn-sm" id="btn-copy-scratchpad" style="font-size:10.5px;padding:2px 7px">📋 Copy</button>
              </div>
            </div>

            <textarea id="room-scratchpad-input" class="input" rows="8" placeholder="// Collaborative Scratchpad - synchronized across open tabs in this room. Type code, schemas, or design notes here..." style="font-family:monospace;font-size:12px;line-height:1.5;background:#0d1117;color:#e6edf3;white-space:pre"></textarea>
            <div style="font-size:10px;color:var(--text-tertiary);text-align:right">
              Tip: Press Tab to indent (2 spaces). Changes sync live to other tabs in this room.
            </div>
          </div>
        </div>
      </div>
    `,
  });

  // Widen modal dialog for comfortable side-by-side video and workspace
  const modalContent = document.querySelector('#modal-overlay .modal-content');
  if (modalContent) {
    modalContent.style.maxWidth = '920px';
    modalContent.style.width = '95vw';
  }

  // 1. Copy Room Invite Link
  function copyInvite() {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/peers?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Room invite link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy invite link:', inviteUrl);
    });
  }

  document.getElementById('copy-room-link-btn')?.addEventListener('click', copyInvite);
  document.getElementById('btn-share-invite')?.addEventListener('click', copyInvite);

  // 2. Local Media Setup
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStream = stream;
        const videoEl = document.getElementById('room-local-video');
        if (videoEl) videoEl.srcObject = stream;
        if (pc) {
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }
      })
      .catch(err => {
        console.warn('Camera/Mic not accessible:', err);
        const fallback = document.getElementById('room-local-fallback');
        const videoEl = document.getElementById('room-local-video');
        if (fallback) fallback.style.display = 'flex';
        if (videoEl) videoEl.style.display = 'none';
        showToast('Camera/Mic not detected. Audio/Text fallback active.', 'info');
      });
  } else {
    const fallback = document.getElementById('room-local-fallback');
    const videoEl = document.getElementById('room-local-video');
    if (fallback) fallback.style.display = 'flex';
    if (videoEl) videoEl.style.display = 'none';
  }

  // 3. Media Controls
  document.getElementById('btn-toggle-mic')?.addEventListener('click', (e) => {
    isMuted = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    }
    e.currentTarget.textContent = isMuted ? '🔇' : '🎤';
    e.currentTarget.style.color = isMuted ? 'var(--danger)' : '#fff';
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  });

  document.getElementById('btn-toggle-cam')?.addEventListener('click', (e) => {
    isVideoOff = !isVideoOff;
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
    }
    const fallback = document.getElementById('room-local-fallback');
    const videoEl = document.getElementById('room-local-video');
    if (isVideoOff) {
      if (videoEl) videoEl.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
    } else {
      if (videoEl) videoEl.style.display = 'block';
      if (fallback) fallback.style.display = 'none';
    }
    e.currentTarget.textContent = isVideoOff ? '📷🚫' : '📹';
    e.currentTarget.style.color = isVideoOff ? 'var(--danger)' : '#fff';
  });

  document.getElementById('btn-screen-share')?.addEventListener('click', async (e) => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showToast('Screen sharing not supported on this browser/device', 'warning');
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const videoEl = document.getElementById('room-local-video');
      if (videoEl) {
        videoEl.srcObject = screenStream;
        videoEl.style.transform = 'none';
      }
      screenTrack.onended = () => {
        if (localStream && videoEl) {
          videoEl.srcObject = localStream;
          videoEl.style.transform = 'scaleX(-1)';
        }
      };
      showToast('Screen sharing started', 'success');
    } catch (err) {
      console.warn('Screen share canceled or denied:', err);
    }
  });

  // 4. WebRTC Peer Connection & Signaling
  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.ontrack = (event) => {
      const remoteVideo = document.getElementById('room-remote-video');
      const remoteFallback = document.getElementById('room-remote-fallback');
      const remoteStatus = document.getElementById('remote-peer-status');
      if (remoteVideo && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.style.display = 'block';
        if (remoteFallback) remoteFallback.style.display = 'none';
        if (remoteStatus) remoteStatus.textContent = 'Peer Connected 🟢';
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.postMessage({ type: 'candidate', candidate: event.candidate });
      }
    };
  } catch (err) {
    console.warn('RTCPeerConnection initialization error:', err);
  }

  channel.onmessage = async (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'join') {
      if (pc) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.postMessage({ type: 'offer', offer });
          const remoteStatus = document.getElementById('remote-peer-status');
          if (remoteStatus) remoteStatus.textContent = 'Connecting with peer...';
        } catch (err) {
          console.warn('Offer creation error:', err);
        }
      }
    } else if (data.type === 'offer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.postMessage({ type: 'answer', answer });
          const remoteStatus = document.getElementById('remote-peer-status');
          if (remoteStatus) remoteStatus.textContent = 'Peer Connected 🟢';
        } catch (err) {
          console.warn('Answer creation error:', err);
        }
      }
    } else if (data.type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          const remoteStatus = document.getElementById('remote-peer-status');
          if (remoteStatus) remoteStatus.textContent = 'Peer Connected 🟢';
        } catch (err) {
          console.warn('Set remote description error:', err);
        }
      }
    } else if (data.type === 'candidate') {
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.warn('Add ice candidate error:', err);
        }
      }
    } else if (data.type === 'scratchpad-sync') {
      const pad = document.getElementById('room-scratchpad-input');
      if (pad && pad.value !== data.text) {
        pad.value = data.text;
      }
    }
  };

  // Announce presence to other tabs
  channel.postMessage({ type: 'join' });

  // 5. Timer Controls
  function updateTimerDisplay() {
    const displayEl = document.getElementById('room-timer-display');
    if (!displayEl) return;
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (timerSeconds <= 300) {
      displayEl.style.color = 'var(--danger)';
    } else {
      displayEl.style.color = 'var(--text-primary)';
    }
  }

  document.getElementById('timer-toggle-btn')?.addEventListener('click', (e) => {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      e.currentTarget.textContent = '▶️ Resume';
    } else {
      isTimerRunning = true;
      e.currentTarget.textContent = '⏸️ Pause';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          updateTimerDisplay();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          showToast('Time is up! Begin wrap-up & feedback evaluation.', 'warning');
        }
      }, 1000);
    }
  });

  document.getElementById('timer-reset-btn')?.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = 45 * 60;
    updateTimerDisplay();
    const toggleBtn = document.getElementById('timer-toggle-btn');
    if (toggleBtn) toggleBtn.textContent = '▶️ Start';
  });

  document.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      clearInterval(timerInterval);
      isTimerRunning = false;
      const mins = parseInt(btn.dataset.min, 10);
      timerSeconds = mins * 60;
      updateTimerDisplay();
      const toggleBtn = document.getElementById('timer-toggle-btn');
      if (toggleBtn) toggleBtn.textContent = '▶️ Start';
    });
  });

  // 6. Role Switcher
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');
      currentRole = btn.dataset.role;

      const tag = document.getElementById('local-role-tag');
      if (tag) tag.textContent = currentRole === 'interviewer' ? '(Interviewer)' : '(Candidate)';

      const guide = document.getElementById('role-guide-banner');
      if (guide) {
        if (currentRole === 'interviewer') {
          guide.innerHTML = '<strong>Interviewer Mode:</strong> Guide the session, ask clarifying questions, and rate the candidate using the rubric below.';
        } else {
          guide.innerHTML = '<strong>Candidate Mode:</strong> Ask clarifying questions, state your assumptions, articulate tradeoffs out loud, and test your code in the scratchpad.';
        }
      }
    });
  });

  // 7. Workspace Tab Navigation
  document.querySelectorAll('.ws-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ws-tab-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');

      const tab = btn.dataset.tab;
      document.querySelectorAll('.ws-tab-panel').forEach(p => p.style.display = 'none');
      const targetPanel = document.getElementById(`tab-${tab}-content`);
      if (targetPanel) targetPanel.style.display = 'flex';
    });
  });

  // 8. Rubric Rating Buttons & Export
  function updateScoreBadge() {
    const total = scores.reduce((a, b) => a + b, 0);
    const pct = Math.round((total / 20) * 100);
    let rec = 'Hire 👍';
    let color = 'var(--success)';
    if (pct >= 90) rec = 'Strong Hire 🌟';
    else if (pct >= 75) rec = 'Hire 👍';
    else if (pct >= 60) { rec = 'Leaning Hire 🤔'; color = 'var(--warning)'; }
    else { rec = 'No Hire ❌'; color = 'var(--danger)'; }

    const badge = document.getElementById('rubric-score-badge');
    if (badge) {
      badge.textContent = `Score: ${total}/20 (${pct}%) • ${rec}`;
      badge.style.color = color;
    }
  }

  document.querySelectorAll('.rating-pt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const val = parseInt(btn.dataset.val, 10);
      scores[idx] = val;

      const parent = btn.parentElement;
      parent.querySelectorAll('.rating-pt-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-ghost');
      });
      btn.classList.remove('btn-ghost');
      btn.classList.add('btn-primary');

      updateScoreBadge();
    });
  });

  document.getElementById('export-scorecard-btn')?.addEventListener('click', () => {
    const total = scores.reduce((a, b) => a + b, 0);
    const pct = Math.round((total / 20) * 100);
    const notes = document.getElementById('rubric-notes-input')?.value.trim() || 'No notes provided.';
    const report = `======================================================
CAREER OS — PEER MOCK INTERVIEW SCORECARD
======================================================
Room ID:           ${roomId}
Date:              ${new Date().toLocaleDateString()}
Role Evaluated:    ${peer?.target_role || 'Software Engineer'}
Target Company:    ${peer?.target_company || 'Tech Industry'}

FINAL RATING:      ${total} / 20 (${pct}%)
RECOMMENDATION:    ${pct >= 90 ? 'Strong Hire' : pct >= 75 ? 'Hire' : pct >= 60 ? 'Leaning Hire' : 'No Hire'}

CRITERIA BREAKDOWN:
1. Problem Solving & Scoping:        ${scores[0]} / 5
2. System / Algo Design:            ${scores[1]} / 5
3. Code Quality & Edge Cases:       ${scores[2]} / 5
4. Communication & Articulation:    ${scores[3]} / 5

INTERVIEWER NOTES & FEEDBACK:
${notes}
======================================================
Generated by Career OS Peer Matchmaking System.
`;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-scorecard-${roomId}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Scorecard report exported!', 'success');
  });

  // 9. Question Bank Details & Insertion
  function renderQuestionDetail(qId) {
    const q = PRACTICE_QUESTIONS.find(item => item.id === qId) || PRACTICE_QUESTIONS[0];
    const container = document.getElementById('question-detail-card');
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h4 style="font-size:var(--text-sm);margin:0 0 2px;color:var(--text-primary)">${escapeHtml(q.title)}</h4>
          <span style="font-size:11px;color:var(--text-tertiary)">${q.category} • ${q.difficulty} • ⏱️ ${q.duration}</span>
        </div>
      </div>
      <p style="font-size:11.5px;color:var(--text-secondary);margin:0">${escapeHtml(q.overview)}</p>

      <div style="font-size:11px">
        <strong style="color:var(--text-primary)">Key Requirements:</strong>
        <ul style="margin:2px 0 0;padding-left:16px;color:var(--text-secondary)">
          ${q.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>

      <div style="font-size:11px">
        <strong style="color:var(--text-primary)">Clarifying Questions & Tips:</strong>
        <ul style="margin:2px 0 0;padding-left:16px;color:var(--text-secondary)">
          ${q.clarifications.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  const qSelect = document.getElementById('question-select-dropdown');
  qSelect?.addEventListener('change', (e) => {
    renderQuestionDetail(e.target.value);
  });
  renderQuestionDetail(PRACTICE_QUESTIONS[0].id);

  document.getElementById('btn-insert-scratchpad')?.addEventListener('click', () => {
    const qId = qSelect?.value || PRACTICE_QUESTIONS[0].id;
    const q = PRACTICE_QUESTIONS.find(item => item.id === qId) || PRACTICE_QUESTIONS[0];
    const pad = document.getElementById('room-scratchpad-input');
    if (pad) {
      const template = `/* ========================================================
   PROBLEM: ${q.title} (${q.category})
   ${q.overview}
   ======================================================== */

${q.codeSnippet}
`;
      pad.value = template + (pad.value ? '\n\n' + pad.value : '');
      channel.postMessage({ type: 'scratchpad-sync', text: pad.value });
      showToast('Question inserted into scratchpad!', 'success');

      // Switch to scratchpad tab
      document.querySelector('.ws-tab-btn[data-tab="scratchpad"]')?.click();
    }
  });

  // 10. Live Scratchpad Sync & Templates
  const padEl = document.getElementById('room-scratchpad-input');
  padEl?.addEventListener('input', () => {
    channel.postMessage({ type: 'scratchpad-sync', text: padEl.value });
  });

  padEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = padEl.selectionStart;
      const end = padEl.selectionEnd;
      padEl.value = padEl.value.substring(0, start) + '  ' + padEl.value.substring(end);
      padEl.selectionStart = padEl.selectionEnd = start + 2;
      channel.postMessage({ type: 'scratchpad-sync', text: padEl.value });
    }
  });

  document.getElementById('btn-copy-scratchpad')?.addEventListener('click', () => {
    if (padEl) {
      navigator.clipboard.writeText(padEl.value).then(() => {
        showToast('Scratchpad copied to clipboard!', 'success');
      });
    }
  });

  document.getElementById('btn-clear-scratchpad')?.addEventListener('click', () => {
    if (padEl && confirm('Clear scratchpad content?')) {
      padEl.value = '';
      channel.postMessage({ type: 'scratchpad-sync', text: '' });
      showToast('Scratchpad cleared', 'info');
    }
  });

  document.querySelectorAll('.pad-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      let snippet = '';
      if (type === 'python') {
        snippet = `class Solution:\n    def solve(self, inputs):\n        # 1. Clarify constraints & edge cases\n        # 2. State time & space complexity: O(N)\n        pass\n`;
      } else if (type === 'system') {
        snippet = `SYSTEM ARCHITECTURE OUTLINE:\n1. Requirements & Scale (DAU, Read/Write Ratio, Storage)\n2. High-Level Architecture (CDN -> LB -> API Gateway -> Services)\n3. Storage & Caching (Relational/NoSQL, Redis LRU, Partitioning)\n4. Bottlenecks & Resilience (Rate limiting, Failover, Replication)\n`;
      } else if (type === 'star') {
        snippet = `STAR METHOD FRAMEWORK:\n- Situation: Context, project, stakeholders involved.\n- Task: Objective, challenge, and constraints.\n- Action: Key decisions, POC, benchmark data, empathy.\n- Result: Quantified impact, latency improvement, lesson learned.\n`;
      }
      if (padEl) {
        padEl.value = snippet + (padEl.value ? '\n' + padEl.value : '');
        channel.postMessage({ type: 'scratchpad-sync', text: padEl.value });
        showToast('Template added to scratchpad', 'success');
      }
    });
  });

  // 11. Modal Close Cleanup Hook
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    const observer = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        cleanup();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  function cleanup() {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
    if (channel) {
      channel.close();
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
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

