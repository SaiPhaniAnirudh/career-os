// ─── Career OS: Matcher Page ───
import { uploadResume, uploadResumeText, submitJD, runMatch } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderMatcher(container) {
  let resumeId = null;
  let jdId = null;
  let resumeReady = false;
  let jdReady = false;

  container.innerHTML = `
    <div class="page-header">
      <h1>Resume Matcher</h1>
      <p>See how well your resume matches a job description</p>
    </div>

    <div class="matcher-panels">
      <!-- Resume Panel -->
      <div class="glass-card-static matcher-panel">
        <h3>📄 Your Resume</h3>

        <div class="matcher-upload-area" id="resume-upload-area">
          <div class="matcher-upload-icon">📤</div>
          <div><strong>Drop your PDF here</strong> or click to browse</div>
          <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-2)">PDF files only</div>
          <input type="file" id="resume-file-input" accept=".pdf" style="display:none">
        </div>

        <div style="text-align:center;color:var(--text-tertiary);margin:var(--space-4) 0;font-size:var(--text-sm)">
          — or paste your resume text —
        </div>

        <textarea class="input" id="resume-text" rows="6"
          placeholder="Paste your resume text here..."></textarea>
        <button class="btn btn-secondary btn-sm" id="resume-text-btn" style="margin-top:var(--space-3)">
          Upload Text
        </button>
      </div>

      <!-- JD Panel -->
      <div class="glass-card-static matcher-panel">
        <h3>📝 Job Description</h3>
        <textarea class="input" id="jd-text" rows="12"
          placeholder="Paste the job description here...&#10;&#10;Include the full posting — requirements, responsibilities, qualifications..."></textarea>
        <button class="btn btn-secondary btn-sm" id="jd-submit-btn" style="margin-top:var(--space-3)">
          Submit JD
        </button>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:var(--space-6)">
      <button class="btn btn-primary btn-lg" id="run-match-btn" disabled>
        🎯 Run Match Analysis
      </button>
      <p id="match-status" style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-2)">
        Upload a resume and paste a JD to get started
      </p>
    </div>

    <div id="match-result"></div>
  `;

  const uploadArea = container.querySelector('#resume-upload-area');
  const fileInput = container.querySelector('#resume-file-input');
  const matchBtn = container.querySelector('#run-match-btn');
  const statusEl = container.querySelector('#match-status');

  // File upload click
  uploadArea.addEventListener('click', () => fileInput.click());

  // File drag-and-drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--accent-solid)';
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '';
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileUpload(fileInput.files[0]);
  });

  // Resume text upload
  container.querySelector('#resume-text-btn').addEventListener('click', async () => {
    const text = container.querySelector('#resume-text').value.trim();
    if (!text) {
      showToast('Please paste your resume text', 'warning');
      return;
    }
    try {
      const res = await uploadResumeText(text);
      resumeId = res.id;
      resumeReady = true;
      uploadArea.classList.add('has-file');
      uploadArea.innerHTML = `
        <div class="matcher-upload-icon">✅</div>
        <div><strong>Resume uploaded</strong> (text)</div>
      `;
      updateMatchButton();
      showToast('Resume uploaded successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // JD submit
  container.querySelector('#jd-submit-btn').addEventListener('click', async () => {
    const text = container.querySelector('#jd-text').value.trim();
    if (!text) {
      showToast('Please paste the job description', 'warning');
      return;
    }
    try {
      const res = await submitJD(text);
      jdId = res.id;
      jdReady = true;
      updateMatchButton();
      showToast('Job description saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Run match
  matchBtn.addEventListener('click', async () => {
    if (!resumeId || !jdId) return;
    matchBtn.disabled = true;
    matchBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Analyzing...';

    try {
      const result = await runMatch(resumeId, jdId);
      renderMatchResult(container, result);
      showToast('Match analysis complete!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      matchBtn.disabled = false;
      matchBtn.innerHTML = '🎯 Run Match Analysis';
    }
  });

  async function handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Only PDF files are supported', 'warning');
      return;
    }

    uploadArea.innerHTML = `
      <div class="spinner"></div>
      <div style="margin-top:var(--space-2)">Uploading ${file.name}...</div>
    `;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadResume(formData);
      resumeId = res.id;
      resumeReady = true;
      uploadArea.classList.add('has-file');
      uploadArea.innerHTML = `
        <div class="matcher-upload-icon">✅</div>
        <div><strong>${file.name}</strong> uploaded</div>
      `;
      updateMatchButton();
      showToast('Resume uploaded successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      uploadArea.innerHTML = `
        <div class="matcher-upload-icon">📤</div>
        <div><strong>Drop your PDF here</strong> or click to browse</div>
      `;
    }
  }

  function updateMatchButton() {
    matchBtn.disabled = !(resumeReady && jdReady);
    if (resumeReady && jdReady) {
      statusEl.textContent = 'Ready to analyze!';
      statusEl.style.color = 'var(--success)';
    } else if (resumeReady) {
      statusEl.textContent = 'Now paste a job description';
    } else if (jdReady) {
      statusEl.textContent = 'Now upload your resume';
    }
  }
}

function renderMatchResult(container, result) {
  const resultEl = container.querySelector('#match-result');
  const score = result.match_score || 0;
  const missing = result.missing_keywords || [];
  const suggestions = result.suggestions || [];

  // Calculate circumference for the ring
  const circumference = 2 * Math.PI * 54; // r=54
  const offset = circumference - (score / 100) * circumference;

  let scoreColor = 'var(--danger)';
  if (score >= 70) scoreColor = 'var(--success)';
  else if (score >= 40) scoreColor = 'var(--warning)';

  resultEl.innerHTML = `
    <div class="glass-card-static matcher-result slide-up">
      <h3>Match Results</h3>

      <div class="matcher-result-header">
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--accent-start)" />
                <stop offset="100%" stop-color="var(--accent-end)" />
              </linearGradient>
            </defs>
            <circle class="score-ring-bg" cx="60" cy="60" r="54" />
            <circle class="score-ring-progress" cx="60" cy="60" r="54"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}" />
          </svg>
          <div class="score-ring-text">
            <div class="score-ring-value" style="color:${scoreColor}">${score}%</div>
            <div class="score-ring-label">Match</div>
          </div>
        </div>

        <div style="flex:1">
          <h4 style="margin-bottom:var(--space-2)">
            ${score >= 70 ? '🎉 Strong Match!' : score >= 40 ? '💪 Decent Match' : '⚠️ Weak Match'}
          </h4>
          <p style="color:var(--text-secondary);font-size:var(--text-sm)">
            ${score >= 70
              ? 'Your resume aligns well with this role. Fine-tune the missing areas below.'
              : score >= 40
                ? 'There\'s overlap, but several key areas need attention.'
                : 'Consider tailoring your resume more specifically to this role.'
            }
          </p>
        </div>
      </div>

      ${missing.length > 0 ? `
        <div style="margin-top:var(--space-4)">
          <h4 style="margin-bottom:var(--space-3)">Missing Keywords</h4>
          <div class="matcher-keywords">
            ${missing.map(kw => `<span class="keyword-tag keyword-missing">${kw}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${suggestions.length > 0 ? `
        <div style="margin-top:var(--space-4)">
          <h4 style="margin-bottom:var(--space-3)">💡 Suggestions</h4>
          <ul style="color:var(--text-secondary);font-size:var(--text-sm);padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2)">
            ${suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}
