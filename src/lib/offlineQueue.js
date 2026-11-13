// src/lib/offlineQueue.js
import { openDB } from 'idb';

const DB = 'assessment-offline';
const STORE = 'submissions';

async function db() {
  return openDB(DB, 1, {
    upgrade(d) { d.createObjectStore(STORE, { keyPath: 'assessment_id' }); },
  });
}

export async function queueSubmission(assessmentId, payload) {
  const d = await db();
  await d.put(STORE, { assessment_id: assessmentId, payload, queued_at: Date.now() });
}

export async function flushSubmissions() {
  const d = await db();
  const all = await d.getAll(STORE);
  for (const item of all) {
    try {
      const res = await fetch(`/api/student/assessments/${item.assessment_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Approval-Token': item.payload.token,
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ answers: item.payload.answers }),
        credentials: 'include',
      });
      if (res.ok) await d.delete(STORE, item.assessment_id);
    } catch { /* leave in queue */ }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushSubmissions);
  flushSubmissions();
}