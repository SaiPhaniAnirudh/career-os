// ─── Career OS: API Client ───
import { getToken } from './auth.js';

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
    throw new Error('Not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Only set Content-Type for JSON bodies (not FormData/multipart)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

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

export function runMatch(resumeId, jdId) {
  return apiFetch('/match', {
    method: 'POST',
    body: JSON.stringify({ resume_id: resumeId, jd_id: jdId }),
  });
}

// ── Interview ──

export function startInterview(jdId = null) {
  return apiFetch('/interview/start', {
    method: 'POST',
    body: JSON.stringify({ jd_id: jdId }),
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
