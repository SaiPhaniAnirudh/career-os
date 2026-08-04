// ─── Career OS: Interview Page (Chat UI) ───
import { startInterview, respondInterview, getInterviewFeedback } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderInterview(container) {
  let sessionId = null;
  let transcript = [];
  let isLoading = false;

  container.innerHTML = `
    <div class="interview-container">
      <div class="interview-header">
        <div>
          <h1>Mock Interview</h1>
          <p style="color:var(--text-secondary)">Practice with an AI interviewer</p>
        </div>
        <div style="display:flex;gap:var(--space-3)">
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
          <p>Start a mock interview session. The AI interviewer will ask you questions based on common software engineering topics, or you can provide a specific job description.</p>
        </div>
      </div>

      <div class="interview-input-area" id="interview-input-area" style="display:none">
        <textarea class="input" id="interview-answer" rows="1"
          placeholder="Type your answer..." style="resize:none;min-height:44px"></textarea>
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
  const feedbackBtn = container.querySelector('#feedback-btn');

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

  // Start interview
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Starting...';

    try {
      const session = await startInterview();
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
  });

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
          <h3>📝 Interview Feedback</h3>
          <div class="interview-feedback-content">${escapeHtml(feedbackText)}</div>
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
          <div>${escapeHtml(msg.content)}</div>
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
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
