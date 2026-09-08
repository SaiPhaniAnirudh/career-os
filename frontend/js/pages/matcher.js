// ─── Career OS: Matcher Page ───
import { uploadResume, uploadResumeText, submitJD, scrapeJD, optimizeResumeBullets, runMatch, generateCoverLetter } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderMatcher(container) {
  let resumeId = null;
  let jdId = null;
  let resumeReady = false;
  let jdReady = false;

  container.innerHTML = `
    <div class="page-header">
      <h1>Resume Matcher</h1>
      <p>See how well your resume matches a job description and optimize bullet points with AI</p>
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

      <!-- JD Panel with Tabs -->
      <div class="glass-card-static matcher-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <h3 style="margin:0">📝 Job Description</h3>
          <div style="display:flex;gap:4px;background:var(--bg-input);padding:3px;border-radius:var(--radius-md);border:1px solid var(--border-subtle)">
            <button class="btn btn-ghost btn-sm" id="jd-tab-paste" type="button" style="padding:2px 10px;font-size:var(--text-xs);background:var(--accent-glow);color:var(--accent-solid)">Paste</button>
            <button class="btn btn-ghost btn-sm" id="jd-tab-url" type="button" style="padding:2px 10px;font-size:var(--text-xs)">🔗 Import URL</button>
          </div>
        </div>

        <!-- Paste section -->
        <div id="jd-paste-section">
          <textarea class="input" id="jd-text" rows="11"
            placeholder="Paste the job description here...&#10;&#10;Include the full posting — requirements, responsibilities, qualifications..."></textarea>
          <button class="btn btn-secondary btn-sm" id="jd-submit-btn" style="margin-top:var(--space-3)">
            Submit JD
          </button>
        </div>

        <!-- URL Scraper section -->
        <div id="jd-url-section" style="display:none">
          <p style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:var(--space-3);line-height:var(--leading-relaxed)">
            Directly ingest any job posting from LinkedIn, Greenhouse, Lever, Workday, or company careers sites. Our parser automatically extracts core technical requirements.
          </p>
          <div class="input-group">
            <input class="input" id="jd-url-input" type="url" placeholder="https://boards.greenhouse.io/company/jobs/12345" />
          </div>
          <button class="btn btn-primary btn-sm" id="jd-scrape-btn" style="margin-top:var(--space-3)">
            ⚡ Fetch & Scrape Job
          </button>
          <div id="jd-scrape-status" style="margin-top:var(--space-3);display:none;font-size:var(--text-xs);padding:var(--space-3);background:var(--bg-input);border-radius:var(--radius-md);border-left:3px solid var(--accent-solid)">
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:var(--space-6)">
      <button class="btn btn-primary btn-lg" id="run-match-btn" disabled>
        🎯 Run Match Analysis
      </button>
      <p id="match-status" style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-2)">
        Upload a resume and paste or scrape a JD to get started
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

  // JD tabs
  const tabPaste = container.querySelector('#jd-tab-paste');
  const tabUrl = container.querySelector('#jd-tab-url');
  const pasteSec = container.querySelector('#jd-paste-section');
  const urlSec = container.querySelector('#jd-url-section');
  const urlInput = container.querySelector('#jd-url-input');
  const scrapeBtn = container.querySelector('#jd-scrape-btn');
  const scrapeStatus = container.querySelector('#jd-scrape-status');

  tabPaste.addEventListener('click', () => {
    tabPaste.style.background = 'var(--accent-glow)';
    tabPaste.style.color = 'var(--accent-solid)';
    tabUrl.style.background = 'transparent';
    tabUrl.style.color = 'var(--text-secondary)';
    pasteSec.style.display = 'block';
    urlSec.style.display = 'none';
  });

  tabUrl.addEventListener('click', () => {
    tabUrl.style.background = 'var(--accent-glow)';
    tabUrl.style.color = 'var(--accent-solid)';
    tabPaste.style.background = 'transparent';
    tabPaste.style.color = 'var(--text-secondary)';
    pasteSec.style.display = 'none';
    urlSec.style.display = 'block';
  });

  // JD submit (text)
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

  // JD scrape (URL)
  scrapeBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Please enter a valid job URL', 'warning');
      return;
    }
    scrapeBtn.disabled = true;
    scrapeBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Scraping...';
    try {
      const res = await scrapeJD(url);
      jdId = res.id;
      jdReady = true;
      updateMatchButton();
      scrapeStatus.style.display = 'block';
      scrapeStatus.innerHTML = `
        <strong style="color:var(--success)">✅ Scraped successfully!</strong><br>
        <strong>Title:</strong> ${res.title || 'Job Posting'}<br>
        <span style="color:var(--text-tertiary)">Extracted ${res.parsed_requirements?.length || 0} requirements.</span>
      `;
      container.querySelector('#jd-text').value = res.raw_text;
      showToast('Job description scraped and ready!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      scrapeBtn.disabled = false;
      scrapeBtn.innerHTML = '⚡ Fetch & Scrape Job';
    }
  });

  // Run match
  matchBtn.addEventListener('click', async () => {
    if (!resumeId || !jdId) return;
    matchBtn.disabled = true;
    matchBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Analyzing...';

    try {
      const result = await runMatch(resumeId, jdId);
      renderMatchResult(container, result, resumeId, jdId);
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
      statusEl.textContent = 'Now paste or scrape a job description';
    } else if (jdReady) {
      statusEl.textContent = 'Now upload your resume';
    }
  }
}

function renderMatchResult(container, result, resumeId, jdId) {
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-3)">
        <h3 style="margin:0">Match Results</h3>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="optimize-bullets-btn">
            ✨ AI Bullet Optimizer
          </button>
          <button class="btn btn-secondary btn-sm" id="cover-letter-btn">
            📜 AI Cover Letter
          </button>
          <button class="btn btn-secondary btn-sm" id="export-resume-btn">
            📄 Export ATS Resume
          </button>
          <button class="btn btn-secondary btn-sm" id="export-match-btn">
            📥 Export Report
          </button>
        </div>
      </div>

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

  resultEl.querySelector('#export-match-btn')?.addEventListener('click', () => {
    downloadMatchReport(result);
  });

  resultEl.querySelector('#optimize-bullets-btn')?.addEventListener('click', () => {
    showBulletOptimizerModal(resumeId, jdId, missing);
  });

  resultEl.querySelector('#cover-letter-btn')?.addEventListener('click', () => {
    showCoverLetterModal(resumeId, jdId, missing);
  });

  resultEl.querySelector('#export-resume-btn')?.addEventListener('click', () => {
    showATSResumeModal(resumeId, jdId, missing);
  });
}

function showBulletOptimizerModal(resumeId, jdId, missingKeywords) {
  const modalClose = showModal({
    title: '✨ AI Resume Bullet Optimizer (Google XYZ & STAR)',
    confirmText: 'Done',
    cancelText: 'Close',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:320px;max-width:680px">
        <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-relaxed)">
          Rewrites resume bullets using the <strong>Google XYZ framework</strong> <em>("Accomplished [X] as measured by [Y], by doing [Z]")</em> and <strong>STAR</strong> to maximize recruiter response rates while weaving in target missing skills.
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <div style="font-size:var(--text-xs);color:var(--text-tertiary)">
            Target skills: <strong>${(missingKeywords.slice(0, 6).join(', ')) || 'Core competencies'}</strong>
          </div>
          <button class="btn btn-secondary btn-sm" id="modal-refresh-btn">
            🔄 Refresh Bullets
          </button>
        </div>

        <!-- Custom single bullet input -->
        <div style="background:var(--bg-input);padding:var(--space-3);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)">
          <label style="font-size:var(--text-xs);font-weight:var(--weight-semibold);color:var(--text-primary);display:block;margin-bottom:var(--space-1)">
            Rewrite a Custom Bullet:
          </label>
          <div style="display:flex;gap:var(--space-2)">
            <input class="input" id="custom-bullet-input" placeholder="e.g. Worked on database migration and API performance" style="font-size:var(--text-xs);flex:1" />
            <button class="btn btn-primary btn-sm" id="custom-bullet-btn" style="flex-shrink:0">Rewrite</button>
          </div>
        </div>

        <div id="optimizer-list-container" class="optimizer-list">
          <div style="text-align:center;padding:var(--space-6)">
            <div class="spinner" style="margin:0 auto var(--space-3)"></div>
            <p style="color:var(--text-secondary);font-size:var(--text-sm)">Analyzing resume and generating Google XYZ / STAR bullets...</p>
          </div>
        </div>
      </div>
    `,
  });

  const modalBody = document.getElementById('modal-body');
  const listContainer = modalBody.querySelector('#optimizer-list-container');
  const refreshBtn = modalBody.querySelector('#modal-refresh-btn');
  const customInput = modalBody.querySelector('#custom-bullet-input');
  const customBtn = modalBody.querySelector('#custom-bullet-btn');

  async function loadOptimizations(bulletText = '') {
    listContainer.innerHTML = `
      <div style="text-align:center;padding:var(--space-6)">
        <div class="spinner" style="margin:0 auto var(--space-3)"></div>
        <p style="color:var(--text-secondary);font-size:var(--text-sm)">Optimizing bullets with AI...</p>
      </div>
    `;
    try {
      const data = await optimizeResumeBullets({
        resumeId,
        jdId,
        bulletText,
        missingKeywords,
      });
      renderOptimizationCards(data.optimizations || []);
    } catch (err) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding:var(--space-4)">
          <div class="empty-state-icon">⚠️</div>
          <p style="color:var(--danger)">${err.message}</p>
          <button class="btn btn-secondary btn-sm" id="retry-opt-btn" style="margin-top:var(--space-2)">Try Again</button>
        </div>
      `;
      listContainer.querySelector('#retry-opt-btn')?.addEventListener('click', () => loadOptimizations());
    }
  }

  function renderOptimizationCards(items) {
    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding:var(--space-4)">
          <div class="empty-state-icon">📄</div>
          <p style="color:var(--text-secondary)">No bullet points found to rewrite. Try pasting a custom bullet above!</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items.map((item) => `
      <div class="optimizer-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)">
          <span class="framework-badge ${item.framework === 'STAR' ? 'framework-badge-star' : 'framework-badge-xyz'}">
            ${item.framework || 'Google XYZ'}
          </span>
          ${item.metric_suggestion ? `<span class="metric-badge">📊 ${item.metric_suggestion}</span>` : ''}
        </div>

        <div>
          <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:2px">Original:</div>
          <div class="bullet-original">${item.original || 'Original bullet'}</div>
        </div>

        <div>
          <div style="font-size:var(--text-xs);color:var(--accent-solid);margin-bottom:2px;font-weight:var(--weight-semibold)">✨ Optimized:</div>
          <div class="bullet-optimized">${item.optimized}</div>
        </div>

        ${(item.keywords_added && item.keywords_added.length > 0) ? `
          <div class="bullet-tags">
            <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Target skills integrated:</span>
            ${item.keywords_added.map(kw => `<span class="keyword-tag keyword-matched" style="font-size:11px;padding:2px 8px">${kw}</span>`).join('')}
          </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-1);flex-wrap:wrap;gap:var(--space-2)">
          <span style="font-size:var(--text-xs);color:var(--text-tertiary);font-style:italic;max-width:70%">${item.explanation || ''}</span>
          <button class="btn btn-secondary btn-sm copy-bullet-btn" data-text="${encodeURIComponent(item.optimized)}">
            📋 Copy
          </button>
        </div>
      </div>
    `).join('');

    // Attach copy listeners
    listContainer.querySelectorAll('.copy-bullet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = decodeURIComponent(btn.dataset.text);
        navigator.clipboard.writeText(text);
        const prev = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => { btn.innerHTML = prev; }, 1800);
        showToast('Bullet copied to clipboard!', 'success');
      });
    });
  }

  // Event handlers
  refreshBtn?.addEventListener('click', () => loadOptimizations());

  customBtn?.addEventListener('click', () => {
    const text = customInput.value.trim();
    if (!text) {
      showToast('Please type a bullet point to rewrite', 'warning');
      return;
    }
    loadOptimizations(text);
  });

  // Initial load
  loadOptimizations();
}

function downloadMatchReport(result) {
  const dateStr = new Date().toISOString().split('T')[0];
  const missingList = (result.missing_keywords || []).map(k => `- ${k}`).join('\n') || '- None';
  const suggList = (result.suggestions || []).map(s => `- ${s}`).join('\n') || '- None';

  const md = `# Career OS — Resume & Job Description Match Report
Date: ${new Date().toLocaleString()}

## Match Overview
- **Overall Match Score:** ${result.match_score || 0}%
- **Readiness Rating:** ${(result.match_score || 0) >= 70 ? 'Strong Match' : (result.match_score || 0) >= 40 ? 'Decent Match' : 'Needs Optimization'}

## Missing Keywords & Skills
${missingList}

## AI Recommendations
${suggList}

---
*Report generated by Career OS.*
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `career-os-match-report-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function showCoverLetterModal(resumeId, jdId, missingKeywords = []) {
  let generatedLetter = '';

  showModal({
    title: '📜 AI Tailored Cover Letter Generator',
    confirmText: 'Done',
    cancelText: 'Close',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:320px;max-width:720px">
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0;line-height:var(--leading-relaxed)">
          Generate a compelling, 3–4 paragraph cover letter tying accomplishments from your resume to this specific job description.
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
          <div class="input-group">
            <label for="cl-company" style="font-size:var(--text-xs)">Target Company</label>
            <input class="input" id="cl-company" placeholder="e.g. Google, Stripe" style="font-size:var(--text-xs);padding:var(--space-2)">
          </div>
          <div class="input-group">
            <label for="cl-role" style="font-size:var(--text-xs)">Target Role</label>
            <input class="input" id="cl-role" placeholder="e.g. Full Stack Engineer" style="font-size:var(--text-xs);padding:var(--space-2)">
          </div>
          <div class="input-group">
            <label for="cl-tone" style="font-size:var(--text-xs)">Letter Tone</label>
            <select class="input" id="cl-tone" style="font-size:var(--text-xs);padding:var(--space-2)">
              <option value="confident" selected>Confident & Results-Driven</option>
              <option value="enthusiastic">Enthusiastic & Mission-Driven</option>
              <option value="executive">Executive & Strategic</option>
              <option value="technical">Deeply Technical & Analytical</option>
              <option value="concise">Direct & Punchy</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="generate-cl-btn" style="width:100%;justify-content:center">
          ⚡ Generate Tailored Cover Letter
        </button>

        <div id="cl-loading" style="display:none;text-align:center;padding:var(--space-6)">
          <div class="spinner" style="margin:0 auto var(--space-2)"></div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">Crafting tailored cover letter with Groq AI...</div>
        </div>

        <div id="cl-result-section" style="display:none;display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
            <label style="font-size:var(--text-xs);font-weight:var(--weight-semibold);color:var(--text-primary)">
              Editable Cover Letter Draft:
            </label>
            <div style="display:flex;gap:var(--space-2)">
              <button class="btn btn-ghost btn-sm" id="copy-cl-btn" style="font-size:var(--text-xs);padding:2px 8px">
                📋 Copy
              </button>
              <button class="btn btn-ghost btn-sm" id="download-cl-btn" style="font-size:var(--text-xs);padding:2px 8px">
                📥 Download .txt
              </button>
              <button class="btn btn-secondary btn-sm" id="print-cl-btn" style="font-size:var(--text-xs);padding:2px 8px">
                🖨️ Print / PDF
              </button>
            </div>
          </div>
          <textarea class="input" id="cl-textarea" rows="12" style="font-size:var(--text-xs);line-height:var(--leading-relaxed);font-family:inherit;white-space:pre-wrap"></textarea>
        </div>
      </div>
    `,
  });

  const modalBody = document.getElementById('modal-body');
  const generateBtn = modalBody.querySelector('#generate-cl-btn');
  const loadingEl = modalBody.querySelector('#cl-loading');
  const resultSection = modalBody.querySelector('#cl-result-section');
  const textarea = modalBody.querySelector('#cl-textarea');
  const copyBtn = modalBody.querySelector('#copy-cl-btn');
  const downloadBtn = modalBody.querySelector('#download-cl-btn');
  const printBtn = modalBody.querySelector('#print-cl-btn');

  generateBtn?.addEventListener('click', async () => {
    const company = modalBody.querySelector('#cl-company').value.trim() || 'Hiring Team';
    const role = modalBody.querySelector('#cl-role').value.trim() || 'Target Role';
    const tone = modalBody.querySelector('#cl-tone').value;

    generateBtn.disabled = true;
    loadingEl.style.display = 'block';
    resultSection.style.display = 'none';

    try {
      const res = await generateCoverLetter({
        resumeId,
        jdId,
        company,
        role,
        tone,
      });
      generatedLetter = res.cover_letter || '';
      textarea.value = generatedLetter;
      resultSection.style.display = 'flex';
      showToast('Cover letter generated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      generateBtn.disabled = false;
      loadingEl.style.display = 'none';
    }
  });

  copyBtn?.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Cover letter copied to clipboard!', 'success');
  });

  downloadBtn?.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  printBtn?.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cover Letter</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #111; max-width: 700px; margin: 0 auto; white-space: pre-wrap; font-size: 14px; }
          </style>
        </head>
        <body>${escapeHtml(text)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  });
}

function showATSResumeModal(resumeId, jdId, missingKeywords = []) {
  showModal({
    title: '📄 ATS-Optimized Resume Exporter',
    confirmText: 'Done',
    cancelText: 'Close',
    onConfirm: (close) => close(),
    bodyHTML: `
      <div style="display:flex;flex-direction:column;gap:var(--space-4);min-width:320px;max-width:760px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">
            ATS-friendly single-column layout optimized for parsing systems (Workday, Greenhouse, Lever).
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-secondary btn-sm" id="ats-download-md-btn" style="font-size:var(--text-xs)">
              📥 Download .md
            </button>
            <button class="btn btn-primary btn-sm" id="ats-print-btn" style="font-size:var(--text-xs)">
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>

        <div id="ats-resume-sheet" class="printable-area" style="background:#ffffff;color:#111827;padding:32px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;font-size:13px;line-height:1.5">
          <div style="text-align:center;border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:16px">
            <h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.5px;color:#111827">CANDIDATE NAME</h2>
            <div style="font-size:12px;color:#4b5563">
              Full Stack Engineer • city, country • candidate@email.com • linkedin.com/in/profile • github.com/username
            </div>
          </div>

          <div style="margin-bottom:16px">
            <div style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;padding-bottom:2px;margin-bottom:6px;color:#1f2937">
              Professional Summary
            </div>
            <p style="margin:0;font-size:12.5px;color:#374151">
              Results-driven software engineer with extensive experience designing, building, and deploying scalable distributed web applications, robust REST APIs, and event-driven architectures. Proven track record of improving latency by 35% and accelerating deployment cycles using modern CI/CD and cloud microservices.
            </p>
          </div>

          <div style="margin-bottom:16px">
            <div style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;padding-bottom:2px;margin-bottom:6px;color:#1f2937">
              Core Technical Competencies
            </div>
            <div style="font-size:12.5px;color:#374151;display:flex;flex-wrap:wrap;gap:6px">
              ${(missingKeywords.slice(0, 10).map(k => `<span style="background:#f3f4f6;padding:2px 8px;border-radius:4px;border:1px solid #e5e7eb;font-weight:500">${k}</span>`).join('')) || '<span style="background:#f3f4f6;padding:2px 8px;border-radius:4px">Python, JavaScript, React, SQL, Cloud Architecture</span>'}
            </div>
          </div>

          <div style="margin-bottom:16px">
            <div style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;padding-bottom:2px;margin-bottom:6px;color:#1f2937">
              Professional Experience & Projects
            </div>
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-weight:600;font-size:13px;color:#111827">
                <span>Senior Software Engineer — Tech Systems Corp</span>
                <span style="color:#6b7280;font-weight:normal;font-size:12px">2023 – Present</span>
              </div>
              <ul style="margin:4px 0 0;padding-left:18px;color:#374151;font-size:12.5px;display:flex;flex-direction:column;gap:3px">
                <li>Architected and migrated high-traffic core microservices, increasing throughput by 42% and slashing p99 latency from 450ms to 95ms.</li>
                <li>Spearheaded containerization strategy utilizing Docker and Kubernetes, reducing build deployment times by 65%.</li>
                <li>Collaborated across product and infrastructure teams to deliver high-availability distributed data pipelines processing 10M+ daily events.</li>
              </ul>
            </div>
          </div>

          <div>
            <div style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;padding-bottom:2px;margin-bottom:6px;color:#1f2937">
              Education & Certifications
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#374151">
              <span><strong>Bachelor of Science in Computer Science</strong> — University</span>
              <span style="color:#6b7280">Graduated with Honors</span>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  const modalBody = document.getElementById('modal-body');
  const printBtn = modalBody.querySelector('#ats-print-btn');
  const downloadMdBtn = modalBody.querySelector('#ats-download-md-btn');

  printBtn?.addEventListener('click', () => {
    const sheet = modalBody.querySelector('#ats-resume-sheet');
    if (!sheet) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ATS Resume</title>
          <style>
            @page { margin: 15mm; size: A4; }
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; }
          </style>
        </head>
        <body>${sheet.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  });

  downloadMdBtn?.addEventListener('click', () => {
    const md = `# CANDIDATE NAME
Full Stack Engineer • candidate@email.com

## Professional Summary
Results-driven software engineer with extensive experience designing, building, and deploying scalable distributed web applications, robust REST APIs, and event-driven architectures.

## Core Technical Competencies
${(missingKeywords.slice(0, 10).map(k => `- ${k}`).join('\n')) || '- Full Stack Engineering\n- REST APIs\n- Cloud Architecture'}

## Professional Experience
### Senior Software Engineer — Tech Systems Corp (2023 – Present)
- Architected and migrated high-traffic core microservices, increasing throughput by 42%.
- Spearheaded containerization strategy utilizing Docker, reducing build deployment times by 65%.

## Education
Bachelor of Science in Computer Science
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats-resume-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

