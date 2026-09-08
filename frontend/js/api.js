// ─── Career OS: API Client ───
import { getToken, supabase } from './auth.js';
import { navigate } from './router.js';

// VITE_API_BASE lets prod builds point at the deployed backend without a
// code change — set it in a .env file (Vite convention) or your host's
// build-time env vars. Falls back to localhost for local dev.
const API_BASE = `${import.meta.env.VITE_API_BASE || 'http://localhost:5000'}/api`;

/**
 * Authenticated fetch wrapper. Automatically attaches the Supabase JWT
 * and handles JSON parsing + error extraction.
 */
async function apiFetch(path, options = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error('Please sign in to continue.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Only set Content-Type for JSON bodies (not FormData/multipart)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Network error: Unable to reach the server. The backend may be spinning up from cold start. Please wait 30 seconds and try again.');
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {
      error: res.status === 502 || res.status === 503
        ? 'Backend service is starting up from cold start. Please wait a few moments and retry.'
        : `Server returned status ${res.status}`,
    };
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ── Applications ──

export function listApplications() {
  return apiFetch('/applications');
}

export function createApplication(body) {
  return apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateApplication(id, updates) {
  return apiFetch(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteApplication(id) {
  return apiFetch(`/applications/${id}`, { method: 'DELETE' });
}

export function getApplicationAnalytics() {
  return apiFetch('/applications/analytics');
}

// ── Matching ──

export function uploadResume(formData) {
  return apiFetch('/resume/upload', {
    method: 'POST',
    body: formData,  // FormData — no Content-Type header (browser sets boundary)
  });
}

export function uploadResumeText(rawText) {
  return apiFetch('/resume/upload', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export function submitJD(rawText) {
  return apiFetch('/jd/submit', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export function scrapeJD(url) {
  return apiFetch('/jd/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function optimizeResumeBullets({ resumeId = null, jdId = null, bulletText = '', missingKeywords = [] } = {}) {
  return apiFetch('/resume/optimize', {
    method: 'POST',
    body: JSON.stringify({
      resume_id: resumeId,
      jd_id: jdId,
      bullet_text: bulletText,
      missing_keywords: missingKeywords,
    }),
  });
}

export function runMatch(resumeId, jdId) {
  return apiFetch('/match', {
    method: 'POST',
    body: JSON.stringify({ resume_id: resumeId, jd_id: jdId }),
  });
}

export function generateCoverLetter({ resumeId = null, jdId = null, resumeText = '', jdText = '', company = '', role = '', tone = 'confident' } = {}) {
  return apiFetch('/cover-letter', {
    method: 'POST',
    body: JSON.stringify({
      resume_id: resumeId,
      jd_id: jdId,
      resume_text: resumeText,
      jd_text: jdText,
      company,
      role,
      tone,
    }),
  });
}

// ── Interview ──

export function listInterviewSessions() {
  return apiFetch('/interview/sessions');
}

export function startInterview(jdId = null, customTopic = null) {
  return apiFetch('/interview/start', {
    method: 'POST',
    body: JSON.stringify({ jd_id: jdId, custom_topic: customTopic }),
  });
}

export function respondInterview(sessionId, answer) {
  return apiFetch('/interview/respond', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
}

export function getInterviewFeedback(sessionId) {
  return apiFetch('/interview/feedback', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// ── Skill Gaps ──

export function getSkillGaps() {
  return apiFetch('/skill-gaps');
}

// ── Peers (Phase 4 Matchmaking) ──

export function getMyPeerProfile() {
  return apiFetch('/peers/me');
}

export function savePeerProfile(profileData) {
  return apiFetch('/peers/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
}

export function listPeers() {
  return apiFetch('/peers');
}

export function sendPeerRequest(receiverId, message) {
  return apiFetch('/peers/connect', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId, message }),
  });
}

export function listPeerRequests() {
  return apiFetch('/peers/requests');
}

export function respondPeerRequest(requestId, status) {
  return apiFetch(`/peers/requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

