// ─── Career OS: Interview Page (Chat UI) ───
import { startInterview, respondInterview, getInterviewFeedback, listInterviewSessions } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderInterview(container) {
  let sessionId = null;
  let transcript = [];
  let isLoading = false;

  container.innerHTML = `
    <div class="interview-container">
      <div class="interview-header">
        <div>
          <h1>Mock Interview</h1>
          <p style="color:var(--text-secondary)">Practice technical interviews with real-time AI feedback</p>
        </div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <button class="btn btn-ghost" id="history-btn">
            📜 Past Sessions
          </button>
          <button class="btn btn-secondary" id="feedback-btn" style="display:none">
            📝 Get Feedback
          </button>
          <button class="btn btn-primary" id="start-btn">
            🎤 Start Interview
          </button>
        </div>
      </div>

      <div class="interview-messages" id="interview-messages">
        <div class="empty-state">
          <div class="empty-state-icon">🎤</div>
          <h3>Ready to practice?</h3>
          <p>Start a mock interview session tailored to your target role or focus topic. The AI interviewer asks questions, evaluates your answers, and delivers structured feedback.</p>
          <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3);justify-content:center">
            <button class="btn btn-primary" id="start-empty-btn">🎤 Choose Topic & Start</button>
          </div>
        </div>
      </div>

      <div class="interview-input-area" id="interview-input-area" style="display:none">
        <textarea class="input" id="interview-answer" rows="1"
          placeholder="Type your answer... (Press Enter to send, Shift+Enter for newline)" style="resize:none;min-height:44px"></textarea>
        <button class="btn btn-primary" id="send-btn" disabled>
          Send
        </button>
      </div>

      <div id="interview-feedback-container"></div>
    </div>
  `;

  const messagesEl = container.querySelector('#interview-messages');
  const inputArea = container.querySelector('#interview-input-area');
  const answerInput = container.querySelector('#interview-answer');
  const sendBtn = container.querySelector('#send-btn');
  const startBtn = container.querySelector('#start-btn');
  const startEmptyBtn = container.querySelector('#start-empty-btn');
  const feedbackBtn = container.querySelector('#feedback-btn');
  const historyBtn = container.querySelector('#history-btn');

  // Auto-resize textarea
  answerInput.addEventListener('input', () => {
    answerInput.style.height = 'auto';
    answerInput.style.height = Math.min(answerInput.scrollHeight, 150) + 'px';
    sendBtn.disabled = !answerInput.value.trim();
  });

  // Enter to send (Shift+Enter for newline)
  answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (answerInput.value.trim()) handleSend();
    }
  });

  // Start interview trigger
  startBtn.addEventListener('click', () => promptStartModal());
  startEmptyBtn?.addEventListener('click', () => promptStartModal());

  // Past sessions history
  historyBtn.addEventListener('click', async () => {
    try {
      historyBtn.disabled = true;
      const sessions = await listInterviewSessions();
      showHistoryModal(sessions);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      historyBtn.disabled = false;
    }
  });

  function promptStartModal() {
    showModal({
      title: 'Start Mock Interview',
      bodyHTML: `
        <div class="input-group">
          <label for="interview-role-input">Target Role or Topic (Optional)</label>
          <input class="input" id="interview-role-input" 
            placeholder="e.g. Senior Frontend React Engineer, System Design, DevOps Kubernetes...">
          <span style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-1)">
            Leave blank for a general software engineering interview.
          </span>
        </div>
      `,
      confirmText: 'Begin Session',
      onConfirm: async (close) => {
        const topic = document.querySelector('#interview-role-input')?.value.trim() || null;
        close();
        await launchInterview(topic);
      },
    });
  }

  async function launchInterview(customTopic) {
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Starting...';

    try {
      const session = await startInterview(null, customTopic);
      sessionId = session.id;
      transcript = session.transcript || [];

      // Clear empty state & show messages
      messagesEl.innerHTML = '';
      inputArea.style.display = 'flex';
      feedbackBtn.style.display = 'inline-flex';
      startBtn.textContent = '🔄 New Interview';
      startBtn.disabled = false;

      renderMessages();
      answerInput.focus();
    } catch (err) {
      showToast(err.message, 'error');
      startBtn.disabled = false;
      startBtn.innerHTML = '🎤 Start Interview';
    }
  }

  // Send answer
  sendBtn.addEventListener('click', handleSend);

  async function handleSend() {
    const answer = answerInput.value.trim();
    if (!answer || !sessionId || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    answerInput.value = '';
    answerInput.style.height = 'auto';

    // Add candidate bubble immediately
    transcript.push({ role: 'candidate', content: answer });
    renderMessages();

    // Show typing indicator
    showTypingIndicator();

    try {
      const updated = await respondInterview(sessionId, answer);
      transcript = updated.transcript || transcript;
      removeTypingIndicator();
      renderMessages();
      answerInput.focus();
    } catch (err) {
      removeTypingIndicator();
      showToast(err.message, 'error');
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
    }
  }

  // Get feedback
  feedbackBtn.addEventListener('click', async () => {
    if (!sessionId) return;
    feedbackBtn.disabled = true;
    feedbackBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Generating...';

    try {
      const result = await getInterviewFeedback(sessionId);
      const feedbackContainer = container.querySelector('#interview-feedback-container');
      const feedbackText = result.feedback?.summary || 'No feedback available.';

      feedbackContainer.innerHTML = `
        <div class="glass-card-static interview-feedback slide-up">
          <h3>📝 AI Interview Feedback</h3>
          <div class="interview-feedback-content" style="white-space:pre-wrap;line-height:var(--leading-relaxed)">${escapeHtml(feedbackText)}</div>
        </div>
      `;

      feedbackContainer.scrollIntoView({ behavior: 'smooth' });
      showToast('Feedback generated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      feedbackBtn.disabled = false;
      feedbackBtn.innerHTML = '📝 Get Feedback';
    }
  });

  function renderMessages() {
    messagesEl.innerHTML = transcript.map(msg => {
      const isInterviewer = msg.role === 'interviewer';
      return `
        <div class="chat-bubble ${isInterviewer ? 'chat-bubble-interviewer' : 'chat-bubble-candidate'}">
          <div class="chat-bubble-role">${isInterviewer ? '🤖 Interviewer' : '👤 You'}</div>
          <div style="white-space:pre-wrap">${escapeHtml(msg.content)}</div>
        </div>
      `;
    }).join('');

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'chat-bubble chat-bubble-interviewer';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <div class="chat-bubble-role">🤖 Interviewer</div>
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(indicator);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = messagesEl.querySelector('#typing-indicator');
    if (indicator) indicator.remove();
  }

  function showHistoryModal(sessions) {
    if (!sessions || sessions.length === 0) {
      showModal({
        title: 'Past Interview Sessions',
        bodyHTML: '<div style="padding:var(--space-4);text-align:center;color:var(--text-tertiary)">No previous interview sessions found.</div>',
        confirmText: 'Close',
        onConfirm: (close) => close(),
      });
      return;
    }

    const itemsHTML = sessions.map(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const questionCount = (s.transcript || []).filter(t => t.role === 'interviewer').length;
      const hasFeedback = !!s.feedback?.summary;

      return `
        <div style="padding:var(--space-3);background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-3)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
            <span style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Session ${s.id.slice(0, 8)}...</span>
            <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${date}</span>
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-2)">
            Questions asked: ${questionCount} · ${hasFeedback ? '✅ Feedback Available' : 'No feedback generated'}
          </div>
          ${hasFeedback ? `
            <div style="font-size:var(--text-xs);background:rgba(0,0,0,0.3);padding:var(--space-2);border-radius:var(--radius-sm);color:var(--text-secondary);line-height:var(--leading-normal)">
              ${escapeHtml(s.feedback.summary.slice(0, 200))}...
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    showModal({
      title: 'Past Interview Sessions',
      bodyHTML: `<div style="max-height:400px;overflow-y:auto;padding-right:var(--space-2)">${itemsHTML}</div>`,
      confirmText: 'Close',
      onConfirm: (close) => close(),
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
