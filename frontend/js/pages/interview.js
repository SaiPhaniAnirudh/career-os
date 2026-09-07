// ─── Career OS: Interview Page (Chat UI with Voice) ───
import { startInterview, respondInterview, getInterviewFeedback, listInterviewSessions } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderInterview(container) {
  let sessionId = null;
  let transcript = [];
  let isLoading = false;
  let isSpeechEnabled = true;
  let isListening = false;
  let recognition = null;

  container.innerHTML = `
    <div class="interview-container">
      <div class="interview-header">
        <div>
          <h1>Mock Interview</h1>
          <p style="color:var(--text-secondary)">Practice technical interviews with real-time AI voice & feedback</p>
        </div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost" id="speech-toggle-btn" title="Toggle AI voice reading questions aloud">
            🔊 AI Voice: On
          </button>
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
          <p>Start a mock interview session tailored to your target role or focus topic. The AI interviewer asks questions out loud, evaluates your answers, and delivers structured feedback.</p>
          <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3);justify-content:center">
            <button class="btn btn-primary" id="start-empty-btn">🎤 Choose Topic & Start</button>
          </div>
        </div>
      </div>

      <div class="interview-input-area" id="interview-input-area" style="display:none">
        <textarea class="input" id="interview-answer" rows="1"
          placeholder="Type or speak your answer... (Press Enter to send, Shift+Enter for newline)" style="resize:none;min-height:44px"></textarea>
        <button class="btn btn-secondary" id="mic-btn" type="button" title="Speak your answer (Speech-to-Text)" style="padding:0 var(--space-4);min-width:48px;display:flex;align-items:center;justify-content:center">
          🎙️
        </button>
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
  const speechToggleBtn = container.querySelector('#speech-toggle-btn');
  const micBtn = container.querySelector('#mic-btn');

  // Speech Toggle
  speechToggleBtn?.addEventListener('click', () => {
    isSpeechEnabled = !isSpeechEnabled;
    speechToggleBtn.textContent = isSpeechEnabled ? '🔊 AI Voice: On' : '🔇 AI Voice: Off';
    if (!isSpeechEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  // Speech Recognition (Microphone STT)
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        answerInput.value = (answerInput.value + ' ' + finalTranscript).trim();
        answerInput.style.height = Math.min(answerInput.scrollHeight, 150) + 'px';
        sendBtn.disabled = !answerInput.value.trim();
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please grant permission in browser.', 'warning');
      }
      stopListening();
    };

    recognition.onend = () => {
      if (isListening) {
        stopListening();
      }
    };

    micBtn?.addEventListener('click', () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  } else {
    if (micBtn) {
      micBtn.title = 'Speech recognition not supported in this browser';
      micBtn.style.opacity = '0.5';
      micBtn.addEventListener('click', () => {
        showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'info');
      });
    }
  }

  function startListening() {
    try {
      recognition.start();
      isListening = true;
      if (micBtn) {
        micBtn.style.background = 'var(--danger-bg)';
        micBtn.style.borderColor = 'var(--danger)';
        micBtn.innerHTML = '<span style="animation:pulse 1s infinite">🔴</span> Listening';
      }
      showToast('Listening... speak your answer.', 'info');
    } catch (e) {
      console.error(e);
    }
  }

  function stopListening() {
    try {
      recognition?.stop();
    } catch (e) {}
    isListening = false;
    if (micBtn) {
      micBtn.style.background = '';
      micBtn.style.borderColor = '';
      micBtn.innerHTML = '🎙️';
    }
  }

  function speakQuestion(text) {
    if (!isSpeechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

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
      const firstQ = transcript.find(t => t.role === 'interviewer');
      if (firstQ) speakQuestion(firstQ.content);
    } catch (err) {
      showToast(err.message, 'error');
      startBtn.disabled = false;
      startBtn.innerHTML = '🎤 Start Interview';
    }
  }

  // Send answer
  sendBtn.addEventListener('click', handleSend);

  async function handleSend() {
    stopListening();
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
      const lastQ = transcript.filter(t => t.role === 'interviewer').slice(-1)[0];
      if (lastQ) speakQuestion(lastQ.content);
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
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);flex-wrap:wrap;gap:var(--space-2)">
            <h3 style="margin:0">📝 AI Interview Feedback</h3>
            <button class="btn btn-secondary btn-sm" id="export-transcript-btn">
              📥 Export Transcript (.md)
            </button>
          </div>
          <div class="interview-feedback-content" style="white-space:pre-wrap;line-height:var(--leading-relaxed)">${escapeHtml(feedbackText)}</div>
        </div>
      `;

      feedbackContainer.querySelector('#export-transcript-btn')?.addEventListener('click', () => {
        downloadInterviewTranscript(sessionId, transcript, feedbackText);
      });

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

function downloadInterviewTranscript(sessionId, transcript, feedbackText) {
  const dateStr = new Date().toISOString().split('T')[0];
  const transcriptLines = (transcript || []).map(t => {
    const speaker = t.role === 'interviewer' ? '🤖 Interviewer (AI)' : '👤 Candidate (You)';
    return `### ${speaker}\n${t.content}\n`;
  }).join('\n');

  const md = `# Career OS — Mock Interview Transcript & Feedback
Date: ${new Date().toLocaleString()}
Session ID: ${sessionId || 'active-session'}

## AI Feedback Summary
${feedbackText || 'No feedback requested.'}

## Conversation Transcript
${transcriptLines || 'No conversation recorded.'}

---
*Report generated by Career OS Mock Interview Engine.*
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `career-os-interview-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
