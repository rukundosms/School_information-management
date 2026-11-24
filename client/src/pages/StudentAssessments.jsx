// src/pages/student/StudentAssessments.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { apiFetch, getStoredAuth } from '../api/client';
import { queueSubmission } from '../lib/offlineQueue';

// ==========================================
// QUESTION TYPE NORMALIZER
// ==========================================
function getNormalizedType(rawType) {
  if (!rawType) return 'short_answer';
  const s = String(rawType).toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('multi') || s === 'mcq' || s === 'multiplechoice') return 'multiple_choice';
  if (s.includes('true') || s === 'tf' || s === 'truefalse') return 'true_false';
  if (s.includes('match')) return 'matching';
  if (s.includes('fill') || s === 'fillblank' || s === 'gapfill') return 'fill_blank';
  if (s.includes('essay')) return 'essay';
  if (s.includes('long')) return 'long_answer';
  if (s.includes('short')) return 'short_answer';
  return 'short_answer';
}

// ==========================================
// ANTI-CHEAT CONFIG (tune per deployment)
// ==========================================
const AC = {
  // If true, the FIRST tab-switch auto-submits (old behavior).
  // If false, first tab-switch within grace window is allowed (incident recorded);
  // staying hidden past the grace window still submits.
  SUBMIT_ON_FIRST_TAB_SWITCH: false,
  TAB_SWITCH_GRACE_MS: 800,       // ignore sub-second alt-tabs
  BLUR_GRACE_MS: 3000,            // matches old behavior
  BLUR_SUBMIT_AFTER_WARNINGS: 1,  // submit when warnings > this
  BLOCK_PASTE: true,              // also block paste into answers
  FLUSH_DEBOUNCE_MS: 400,
  MAX_QUEUE: 500,
};

// ==========================================
// INCIDENT HELPERS (offline-safe, idempotent)
// ==========================================
function makeIncident(type, severity, detail) {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return {
    client_uuid: id,
    incident_type: type,
    severity,
    detail: detail ? String(detail).slice(0, 480) : null,
    client_ts: new Date().toISOString(),
  };
}

// ==========================================
// INLINE FILL-IN-THE-BLANK COMPONENT
// ==========================================
function InlineFillBlank({ text, value, onChange, disabled }) {
  if (!text) return null;

  // Split on 2+ underscores (supports ___ or _____ or ________)
  const parts = text.split(/(_{2,})/g);
  const hasBlanks = parts.length > 1;

  const currentVal = value || '';
  const answersArr = currentVal.length
    ? (currentVal.includes('||') ? currentVal.split('||') : currentVal.split(','))
    : [];

  // If no blank markers found, render the text plainly (fallback to short-answer style)
  if (!hasBlanks) {
    return (
      <div className="text-gray-800 mb-4 whitespace-pre-wrap text-lg leading-relaxed">
        {text}
      </div>
    );
  }

  let blankIndex = 0;

  return (
    <div className="text-gray-800 mb-6 whitespace-pre-wrap text-lg leading-relaxed">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const idx = blankIndex++;
          return (
            <input
              key={`blank-${idx}`}
              type="text"
              disabled={disabled}
              value={answersArr[idx] || ''}
              onChange={(e) => {
                const next = [...answersArr];
                while (next.length <= idx) next.push('');
                next[idx] = e.target.value;
                // Trim trailing empty answers to avoid "||" noise
                const trimmed = next.join('||').replace(/(\|\|)+$/, '');
                onChange(trimmed);
              }}
              className="inline-block mx-2 border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-600 px-2 py-1 text-center font-semibold text-blue-700 min-w-[80px]"
              placeholder="…"
              autoComplete="off"
              aria-label={`Blank ${idx + 1}`}
            />
          );
        }
        return <span key={`text-${i}`}>{part}</span>;
      })}
    </div>
  );
}

// ==========================================
// MATCHING PARSER
// ==========================================
function parseMatchingQuestion(text) {
  if (!text) return null;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  const options = [];
  lines.forEach((line) => {
    if (/Column A|Column B/i.test(line)) return;
    const itemMatch = line.match(/^(\d+)\.\s+(.*)/i);
    if (itemMatch) { items.push({ num: itemMatch[1], text: itemMatch[2] }); return; }
    const optMatch = line.match(/^([A-E])\.\s+(.*)/i);
    if (optMatch) { options.push({ letter: optMatch[1], text: optMatch[2] }); }
  });
  if (items.length === 0 || options.length === 0) return null;
  return { items, options };
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function StudentAssessments() {
  const { t, i18n } = useTranslation(['assessments', 'common']);

  // ---- Basic state ----
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState('');
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle');

  // ---- Refs ----
  const answersRef = useRef(answers);
  const isConfirmingRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const questionHeadingRef = useRef(null);
  const startedAtRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const requestingRef = useRef(null);

  // ---- Incident tracking ----
  const [incidents, setIncidents] = useState([]);
  const incidentsRef = useRef([]);           // mirror for unload beacon & submit
  const incidentQueueRef = useRef([]);       // pending retry queue (offline)
  const incidentFlushTimerRef = useRef(null);

  // ---- Approval flow ----
  const [requestingAssessment, setRequestingAssessment] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [approvedToken, setApprovedToken] = useState(null);
  const requestPollRef = useRef(null);
  const socketRef = useRef(null);
  const startingRef = useRef(false);

  // ==========================================
  // EFFECTS
  // ==========================================
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => () => {
    if (requestPollRef.current) clearInterval(requestPollRef.current);
    if (socketRef.current) socketRef.current.disconnect();
    if (incidentFlushTimerRef.current) clearTimeout(incidentFlushTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeAssessment && questionHeadingRef.current) {
      questionHeadingRef.current.focus();
    }
  }, [currentQuestionIndex, activeAssessment]);

  const loadAssessments = () => {
    setQuizError('');
    apiFetch('/api/student/assessments')
      .then((d) => setAssessments(d.assessments || []))
      .catch((e) => setError(e.message));
  };

  const fmtTime = (s) => {
    if (s == null) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const safeParse = (s) => {
    try { return JSON.parse(s); } catch { return {}; }
  };

  // ==========================================
  // INCIDENT FLUSH (offline-safe + idempotent)
  // ==========================================
  const flushIncidents = useCallback((assessmentId, batch, { beacon = false } = {}) => {
    if (!assessmentId || !batch || batch.length === 0) return;
    const url = `/api/student/assessments/${assessmentId}/incident`;
    const body = JSON.stringify({ incidents: batch });

    if (beacon) {
      // keepalive fetch: works during page unload and can carry auth headers.
      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Approval-Token': approvedToken || '',
          },
          body,
          keepalive: true,
          credentials: 'include',
        }).catch(() => {});
      } catch { /* best effort */ }
      return;
    }

    apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Approval-Token': approvedToken || '',
      },
      body,
    }).catch(() => {
      // Re-queue on failure (offline). Keep bounded.
      incidentQueueRef.current.push(...batch);
      if (incidentQueueRef.current.length > AC.MAX_QUEUE) {
        incidentQueueRef.current = incidentQueueRef.current.slice(-AC.MAX_QUEUE);
      }
    });
  }, [approvedToken]);

  const recordIncident = useCallback((type, severity, detail) => {
    if (!activeAssessment || submittedRef.current) return;
    const inc = makeIncident(type, severity, detail);
    incidentsRef.current.push(inc);
    setIncidents((prev) => [...prev, inc]);

    // Debounced flush — batches bursts (e.g. paste + copy) into one request.
    if (incidentFlushTimerRef.current) clearTimeout(incidentFlushTimerRef.current);
    incidentFlushTimerRef.current = setTimeout(() => {
      incidentFlushTimerRef.current = null;
      const pending = incidentsRef.current.splice(0);
      const queued = incidentQueueRef.current.splice(0);
      const all = [...queued, ...pending];
      if (all.length) flushIncidents(activeAssessment.assessment_id, all);
    }, AC.FLUSH_DEBOUNCE_MS);
  }, [activeAssessment, flushIncidents]);

  // ==========================================
  // REQUEST START (WebSocket + Poll)
  // ==========================================
  const requestStart = async (assessment) => {
    if (requestingRef.current === assessment.assessment_id) return;

    requestingRef.current = assessment.assessment_id;
    if (requestPollRef.current) clearInterval(requestPollRef.current);

    setRequestingAssessment(assessment.assessment_id);
    setRequestStatus('requesting');
    setQuizError('');
    setApprovedToken(null);
    startingRef.current = false;

    // 1. Send request
    try {
      const res = await apiFetch(
        `/api/student/assessments/${assessment.assessment_id}/request-start`,
        { method: 'POST' }
      );

      // If teacher already approved
      if (res?.status === 'approved' && res?.approval_token) {
        setApprovedToken(res.approval_token);
        setRequestStatus('approved');
        setRequestingAssessment(null);
        return;
      }

      setRequestStatus('waiting');

      // 2. Setup Socket
      try {
        if (socketRef.current) socketRef.current.disconnect();
        const auth = getStoredAuth();
        socketRef.current = io('/', {
          withCredentials: true,
          auth: { token: auth?.token },
          transports: ['websocket', 'polling'],
        });

        socketRef.current.on('connect', () => {
          socketRef.current?.emit('subscribe-assessment', {
            assessment_id: assessment.assessment_id,
          });
        });

        socketRef.current.on('assessment-approved', ({ assessment_id, approval_token }) => {
          if (assessment_id !== assessment.assessment_id) return;
          setApprovedToken(approval_token);
          setRequestStatus('approved');
          setRequestingAssessment(null);
          if (requestPollRef.current) {
            clearInterval(requestPollRef.current);
            requestPollRef.current = null;
          }
          if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
        });

        socketRef.current.on('assessment-rejected', ({ assessment_id }) => {
          if (assessment_id !== assessment.assessment_id) return;
          setRequestStatus('rejected');
          toast.error(t('assessments:rejected'));
          if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
          setTimeout(() => { setRequestStatus(null); setRequestingAssessment(null); }, 4000);
        });

      } catch (e) {
        console.warn('[requestStart] socket init failed', e);
      }

      // 3. Polling fallback
      requestPollRef.current = setInterval(async () => {
        try {
          const s = await apiFetch(
            `/api/student/assessments/${assessment.assessment_id}/request-status`
          );
          if (s?.status === 'approved' && s?.approval_token) {
            clearInterval(requestPollRef.current);
            requestPollRef.current = null;
            setApprovedToken(s.approval_token);
            setRequestStatus('approved');
            setRequestingAssessment(null);
            if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
          } else if (s?.status === 'rejected') {
            clearInterval(requestPollRef.current);
            requestPollRef.current = null;
            setRequestStatus('rejected');
            toast.error(t('assessments:rejected'));
            setTimeout(() => { setRequestStatus(null); setRequestingAssessment(null); }, 4000);
          }
        } catch (e) {
          if (e?.status === 401 || e?.status === 403) {
            clearInterval(requestPollRef.current);
            requestPollRef.current = null;
            setRequestStatus(null);
            setRequestingAssessment(null);
            toast.error(e.message || 'Session expired.');
          }
        }
      }, 5000);

    } catch (err) {
      setRequestStatus(null);
      setRequestingAssessment(null);
      toast.error(err.message || 'Failed to request start.');
    }
  };

  // ==========================================
  // START EXAM
  // ==========================================
  const startAssessment = async (assessment) => {
    if (startingRef.current) return;
    startingRef.current = true;

    let tokenToUse = approvedToken;

    // If approved but we don't have the token locally (e.g. page refreshed),
    // silently ping the backend to get the active token before starting.
    if (!tokenToUse) {
      try {
        const res = await apiFetch(
          `/api/student/assessments/${assessment.assessment_id}/request-start`,
          { method: 'POST' }
        );
        if (res?.status === 'approved' && res?.approval_token) {
          tokenToUse = res.approval_token;
          setApprovedToken(res.approval_token);
        } else {
          toast.error('Session expired. Please request again.');
          startingRef.current = false;
          loadAssessments();
          return;
        }
      } catch (err) {
        toast.error(err.message);
        startingRef.current = false;
        return;
      }
    }

    setLoadingQuiz(true);
    setQuizError('');
    setWarnings(0);
    setIncidents([]);
    incidentsRef.current = [];
    incidentQueueRef.current = [];
    setTimeLeft(null);
    submittedRef.current = false;
    setCurrentQuestionIndex(0);
    startedAtRef.current = Date.now();

    const savedKey = `assessment_${assessment.assessment_id}_answers`;
    const savedAnswers = localStorage.getItem(savedKey);
    setAnswers(savedAnswers ? safeParse(savedAnswers) : {});

    try {
      const data = await apiFetch(`/api/student/assessments/${assessment.assessment_id}/take`, {
        headers: { 'X-Approval-Token': tokenToUse },
      });

      setQuestions(data.questions || []);
      setTimeLeft(data.remaining_seconds ?? null);

      // Restore the latest server copy first; localStorage remains a fallback.
      try {
        const cloud = await apiFetch(`/api/student/assessments/${assessment.assessment_id}/draft`, {
          headers: { 'X-Approval-Token': tokenToUse },
        });
        const cloudRows = cloud?.draft?.answers;
        if (Array.isArray(cloudRows)) {
          const restored = {};
          cloudRows.forEach((item) => {
            if (item && item.qid != null) restored[item.qid] = item.user_answer ?? '';
          });
          setAnswers(restored);
          localStorage.setItem(savedKey, JSON.stringify(restored));
          setSaveStatus('saved');
        } else {
          setSaveStatus('idle');
        }
      } catch (draftErr) {
        console.warn('[assessment] Could not restore cloud draft; using local copy.', draftErr);
        setAnswers(savedAnswers ? safeParse(savedAnswers) : {});
        setSaveStatus('offline');
      }

      // Activate the quiz only after restoration, so autosave cannot overwrite
      // a newer cloud draft with an older browser copy during page startup.
      setActiveAssessment(assessment);

      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {
      startingRef.current = false;
      setActiveAssessment(null);
      setQuestions([]);
      setAnswers({});
      setQuizError(err.message);
      toast.error(err.message, { duration: 6000 });
    } finally {
      setLoadingQuiz(false);
    }
  };

  // ==========================================
  // ANSWER CHANGE
  // ==========================================
  const handleAnswerChange = (qid, value) => {
    setAnswers((prev) => {
      const updated = { ...prev, [qid]: value };
      if (activeAssessment) {
        localStorage.setItem(
          `assessment_${activeAssessment.assessment_id}_answers`,
          JSON.stringify(updated)
        );
      }
      return updated;
    });
  };

  const clearSavedAnswers = () => {
    if (activeAssessment) {
      localStorage.removeItem(`assessment_${activeAssessment.assessment_id}_answers`);
    }
  };

  const buildPayload = (latest) =>
    questions.map((q) => {
      const type = getNormalizedType(q.question_type);
      const val = latest[q.question_id] || '';
      const isChoice = type === 'multiple_choice' || type === 'true_false';
      return { qid: q.question_id, user_answer: val, user_letter: isChoice ? val : '' };
    });

  const saveDraft = useCallback((assessment, latestAnswers, submitReason = null) => {
    if (!assessment) return Promise.resolve(false);
    const key = `assessment_${assessment.assessment_id}_answers`;
    const snapshot = { ...(latestAnswers || {}) };
    // Keep a local copy immediately, even when the network is unavailable.
    try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch {}
    const payload = buildPayload(snapshot);

    saveQueueRef.current = saveQueueRef.current.catch(() => false).then(async () => {
      setSaveStatus('saving');
      try {
        await apiFetch(`/api/student/assessments/${assessment.assessment_id}/draft`, {
          method: 'PUT',
          headers: { 'X-Approval-Token': approvedToken },
          body: JSON.stringify({ answers: payload, submit_reason: submitReason }),
        });
        setSaveStatus('saved');
        return true;
      } catch (err) {
        console.warn('[assessment] Cloud autosave failed; local copy retained.', err);
        setSaveStatus('offline');
        return false;
      }
    });
    return saveQueueRef.current;
  }, [approvedToken, questions]);

  // Save shortly after every answer change, and also every five seconds.
  useEffect(() => {
    if (!activeAssessment || submitting || submittedRef.current) return;
    const timeout = setTimeout(() => {
      saveDraft(activeAssessment, answers);
    }, 500);
    return () => clearTimeout(timeout);
  }, [activeAssessment, answers, saveDraft, submitting]);

  useEffect(() => {
    if (!activeAssessment || submitting) return;
    const interval = setInterval(() => {
      saveDraft(activeAssessment, answersRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAssessment, saveDraft, submitting]);

  // When connectivity returns, push the latest local answers to TiDB.
  useEffect(() => {
    if (!activeAssessment) return;
    const onOnline = () => {
      saveDraft(activeAssessment, answersRef.current);
      // Also retry any queued incidents
      if (incidentQueueRef.current.length) {
        const batch = incidentQueueRef.current.splice(0);
        flushIncidents(activeAssessment.assessment_id, batch);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [activeAssessment, saveDraft, flushIncidents]);

  // ==========================================
  // DRAIN INCIDENTS (used by submit paths)
  // ==========================================
  const drainIncidents = useCallback(() => {
    if (incidentFlushTimerRef.current) {
      clearTimeout(incidentFlushTimerRef.current);
      incidentFlushTimerRef.current = null;
    }
    const pending = incidentsRef.current.splice(0);
    const queued = incidentQueueRef.current.splice(0);
    return [...queued, ...pending];
  }, []);

  // ==========================================
  // FORCE SUBMIT
  // ==========================================
  const forceSubmit = useCallback(
    async (reasonKey) => {
      if (submitting || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const reason = t(`assessments:reasons.${reasonKey}`);
      toast.error(t('assessments:auto_submitted_reason', { reason }), { duration: 8000 });

      try {
        const savedKey = `assessment_${activeAssessment.assessment_id}_answers`;
        const savedStr = localStorage.getItem(savedKey);
        let latest = answersRef.current;
        if (savedStr) latest = safeParse(savedStr);

        const payload = buildPayload(latest);
        const token = approvedToken;
        await saveDraft(activeAssessment, latest, reasonKey);

        // Flush + include incidents
        const allIncidents = drainIncidents();
        if (allIncidents.length) {
          flushIncidents(activeAssessment.assessment_id, allIncidents);
        }

        try {
          await apiFetch(`/api/student/assessments/${activeAssessment.assessment_id}/submit`, {
            method: 'POST',
            headers: { 'X-Approval-Token': token },
            body: JSON.stringify({
              answers: payload,
              submit_reason: reasonKey,
              incidents: allIncidents,
            }),
          });
          clearSavedAnswers();
          setApprovedToken(null);
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setActiveAssessment(null);
          setQuestions([]);
          setAnswers({});
          setIncidents([]);
          loadAssessments();
        } catch (netErr) {
          if (netErr.name === 'TypeError' || netErr.status === 0) {
            await queueSubmission(activeAssessment.assessment_id, {
              answers: payload,
              token,
              incidents: allIncidents,
            });
            toast('Offline — your submission will be retried automatically. Your local backup is retained.', { icon: '📶', duration: 6000 });
            setActiveAssessment(null);
            setQuestions([]);
            setAnswers({});
            setIncidents([]);
            loadAssessments();
          } else {
            throw netErr;
          }
        }
      } catch (err) {
        toast.error(err.message);
        submittedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [activeAssessment, questions, submitting, t, approvedToken, saveDraft, drainIncidents, flushIncidents]
  );

  // ==========================================
  // TIMER
  // ==========================================
  useEffect(() => {
    if (!activeAssessment || timeLeft == null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null) return prev;
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          forceSubmit('time_expired');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeAssessment, forceSubmit]);

  // ==========================================
  // ANTI-CHEAT (records incidents + enforces)
  // ==========================================
  useEffect(() => {
    if (!activeAssessment) return;

    const assessmentId = activeAssessment.assessment_id;
    let blurTimer = null;
    let tabGraceTimer = null;

    // -------- TAB VISIBILITY --------
    const onVis = () => {
      if (submittedRef.current || isConfirmingRef.current) return;
      if (document.hidden) {
        recordIncident('tab_hidden', 3, 'visibilitychange:hidden');
        if (AC.SUBMIT_ON_FIRST_TAB_SWITCH) {
          forceSubmit('tab_switch');
          return;
        }
        // Grace window — ignore ultra-fast alt-tabs that come right back.
        tabGraceTimer = setTimeout(() => {
          tabGraceTimer = null;
          if (document.hidden && !submittedRef.current && !isConfirmingRef.current) {
            forceSubmit('tab_switch');
          }
        }, AC.TAB_SWITCH_GRACE_MS);
      } else {
        if (tabGraceTimer) { clearTimeout(tabGraceTimer); tabGraceTimer = null; }
      }
    };

    // -------- WINDOW BLUR / FOCUS --------
    const onBlur = () => {
      if (submittedRef.current || isConfirmingRef.current) return;
      if (blurTimer) return;
      blurTimer = setTimeout(() => {
        blurTimer = null;
        if (!document.hasFocus() && !submittedRef.current && !isConfirmingRef.current) {
          recordIncident('window_blur', 2, `blur>${AC.BLUR_GRACE_MS}ms`);
          setWarnings((prev) => {
            const n = prev + 1;
            if (n <= AC.BLUR_SUBMIT_AFTER_WARNINGS) {
              toast(t('assessments:warning_leave_once'), { icon: '⚠️', duration: 6000 });
            } else {
              forceSubmit('multiple_leave');
            }
            return n;
          });
        }
      }, AC.BLUR_GRACE_MS);
    };

    const onFocus = () => {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
    };

    // -------- FULLSCREEN EXIT --------
    const onFs = () => {
      if (!document.fullscreenElement && !submittedRef.current && !isConfirmingRef.current) {
        recordIncident('fullscreen_exit', 3, 'fullscreenchange');
        forceSubmit('fullscreen_exit');
      }
    };

    // -------- CONTEXT MENU --------
    const onContext = (e) => {
      e.preventDefault();
      recordIncident('context_menu', 1, e.target?.tagName || null);
    };

    // -------- COPY / PASTE / CUT --------
    const onCopy = (e) => {
      recordIncident('copy', 2, e.target?.tagName || '');
      // Prevent exfiltration of exam text
      e.preventDefault();
    };
    const onCut = (e) => {
      recordIncident('cut', 2, e.target?.tagName || '');
      e.preventDefault();
    };
    const onPaste = (e) => {
      recordIncident('paste', 2, e.target?.tagName || '');
      if (AC.BLOCK_PASTE) e.preventDefault();
    };

    // -------- KEYBOARD SHORTCUTS --------
    const onKeyDown = (e) => {
      const k = e.key?.toLowerCase();
      // DevTools / view-source / print / save
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 'p', 's'].includes(k))
      ) {
        e.preventDefault();
        recordIncident('shortcut', 3, `key:${e.key}${e.shiftKey ? '+shift' : ''}`);
        return;
      }
      // Copy/paste/cut (some browsers do not fire DOM events in inputs for ctrl shortcuts)
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(k)) {
        recordIncident('shortcut', 2, `key:ctrl+${k}`);
      }
      if ((e.ctrlKey || e.metaKey) && k === 'a') {
        recordIncident('shortcut', 1, 'key:ctrl+a');
      }
    };

    // -------- UNLOAD — flush incidents via keepalive --------
    const onBeforeUnload = () => {
      const all = drainIncidents();
      if (all.length) {
        try { flushIncidents(assessmentId, all, { beacon: true }); } catch { /* noop */ }
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (blurTimer) clearTimeout(blurTimer);
      if (tabGraceTimer) clearTimeout(tabGraceTimer);
      if (incidentFlushTimerRef.current) {
        clearTimeout(incidentFlushTimerRef.current);
        incidentFlushTimerRef.current = null;
      }
    };
  }, [activeAssessment, forceSubmit, t, recordIncident, flushIncidents, drainIncidents]);

  // ==========================================
  // HEARTBEAT
  // ==========================================
  useEffect(() => {
    if (!activeAssessment) return;
    const id = setInterval(() => {
      const elapsed = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : 0;
      apiFetch(`/api/student/assessments/${activeAssessment.assessment_id}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ warnings, elapsed, incident_count: incidents.length }),
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [activeAssessment, warnings, incidents.length]);

  // ==========================================
  // NORMAL SUBMIT
  // ==========================================
  const submitAssessment = async () => {
    if (submittedRef.current) return;

    isConfirmingRef.current = true;
    const ok = window.confirm(t('assessments:confirm_submit'));
    isConfirmingRef.current = false;
    if (!ok) return;

    submittedRef.current = true;
    setSubmitting(true);
    setQuizError('');

    try {
      const savedKey = `assessment_${activeAssessment.assessment_id}_answers`;
      const savedStr = localStorage.getItem(savedKey);
      const latest = savedStr ? safeParse(savedStr) : answers;
      const payload = buildPayload(latest);
      const token = approvedToken;
      await saveDraft(activeAssessment, latest, 'manual');

      const allIncidents = drainIncidents();
      if (allIncidents.length) {
        flushIncidents(activeAssessment.assessment_id, allIncidents);
      }

      try {
        await apiFetch(`/api/student/assessments/${activeAssessment.assessment_id}/submit`, {
          method: 'POST',
          headers: { 'X-Approval-Token': token },
          body: JSON.stringify({
            answers: payload,
            submit_reason: 'manual',
            incidents: allIncidents,
          }),
        });
        clearSavedAnswers();
        toast.success(t('assessments:submitted_success'));
        setApprovedToken(null);
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setActiveAssessment(null);
        setQuestions([]);
        setAnswers({});
        setIncidents([]);
        loadAssessments();
      } catch (netErr) {
        if (netErr.name === 'TypeError' || netErr.status === 0) {
          await queueSubmission(activeAssessment.assessment_id, {
            answers: payload,
            token,
            incidents: allIncidents,
          });
          toast('Offline — will retry automatically. Your local backup is retained.', { icon: '📶' });
          setActiveAssessment(null);
          setQuestions([]);
          setAnswers({});
          setIncidents([]);
          loadAssessments();
        } else {
          throw netErr;
        }
      }
    } catch (err) {
      toast.error(err.message);
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER: QUIZ VIEW
  // ==========================================
  if (activeAssessment) {
    const urgent = timeLeft != null && timeLeft <= 60;
    const warn = timeLeft != null && timeLeft <= 300 && timeLeft > 60;
    const answeredCount = Object.keys(answers).length;
    const currentQ = questions[currentQuestionIndex];
    const qType = currentQ ? getNormalizedType(currentQ.question_type) : 'short_answer';

    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto select-none" onContextMenu={(e) => e.preventDefault()}>
        <a href="#quiz-body" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:p-2 focus:z-50 focus:rounded">
          Skip to questions
        </a>

        <div className="sticky top-0 z-40 bg-white shadow-md rounded-xl mb-6 p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-school">
          <div>
            <h1 className="text-xl font-bold text-school">{activeAssessment.title}</h1>
            <p className="text-sm text-gray-500">
              <i className="fas fa-shield-alt mr-1"></i> {t('assessments:secure_mode')}
            </p>
            <p className={`text-xs mt-1 font-semibold ${saveStatus === 'saved' ? 'text-green-700' : saveStatus === 'offline' ? 'text-orange-700' : 'text-gray-500'}`} aria-live="polite">
              {saveStatus === 'saving' && 'Saving answers to cloud…'}
              {saveStatus === 'saved' && '✓ Answers saved to TiDB Cloud'}
              {saveStatus === 'offline' && 'Offline: local backup kept; cloud save pending'}
              {saveStatus === 'idle' && 'Answer backup is ready'}
            </p>
          </div>
          <div role="timer" aria-live={urgent ? 'assertive' : 'off'} aria-label={t('assessments:time_remaining')} className={`flex items-center gap-3 rounded-lg px-6 py-2 font-bold ${urgent ? 'bg-red-100 text-red-700 border-2 border-red-400 animate-pulse' : warn ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400' : 'bg-green-100 text-green-800 border-2 border-green-400'}`}>
            <i className="fas fa-stopwatch text-2xl" aria-hidden="true"></i>
            <span className="text-sm uppercase">{t('assessments:time_remaining')}</span>
            <span className="ml-auto text-3xl font-mono tracking-wider">{fmtTime(timeLeft)}</span>
          </div>
        </div>

        {warnings > 0 && (
          <div role="alert" className="bg-red-600 text-white px-4 py-2 rounded-lg mb-4 text-center font-bold animate-pulse">
            <i className="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>
            {t('assessments:warning_leave')}
          </div>
        )}

        {quizError && <div role="alert" className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 font-bold">{quizError}</div>}

        {loadingQuiz ? (
          <div className="text-center p-10">
            <i className="fas fa-spinner fa-spin text-2xl" aria-hidden="true"></i>{' '}
            {t('assessments:loading_secure')}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start" id="quiz-body">
            <div className="flex-1 w-full space-y-6">
              {currentQ && (
                <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${answers[currentQ.question_id] !== undefined && answers[currentQ.question_id] !== '' ? 'border-green-500' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 ref={questionHeadingRef} tabIndex={-1} className="font-bold text-lg text-gray-800 outline-none" aria-live="polite">
                      {t('assessments:question_of', { current: currentQuestionIndex + 1, total: questions.length })}
                    </h3>
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{currentQ.marks} {t('assessments:marks')}</span>
                  </div>

                  {qType === 'multiple_choice' && (
                    <>
                      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{currentQ.question_text}</p>
                      <fieldset className="space-y-3">
                        <legend className="sr-only">Choose one option</legend>
                        {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                          const optionText = currentQ[`option_${letter.toLowerCase()}`];
                          if (!optionText) return null;
                          const checked = answers[currentQ.question_id] === letter;
                          return (
                            <label key={letter} onClick={(e) => { e.preventDefault(); handleAnswerChange(currentQ.question_id, letter); }} className={`flex items-center p-3 border rounded-lg cursor-pointer transition select-none ${checked ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                              <input type="radio" checked={checked} onChange={() => handleAnswerChange(currentQ.question_id, letter)} className="mr-3 w-4 h-4 pointer-events-none" tabIndex={-1} />
                              <span className="font-bold mr-2">{letter}.</span>
                              <span>{optionText}</span>
                            </label>
                          );
                        })}
                      </fieldset>
                    </>
                  )}

                  {qType === 'true_false' && (
                    <>
                      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{currentQ.question_text}</p>
                      <fieldset className="flex gap-4">
                        <legend className="sr-only">True or False</legend>
                        {['True', 'False'].map((val) => {
                          const checked = answers[currentQ.question_id] === val;
                          return (
                            <label key={val} onClick={(e) => { e.preventDefault(); handleAnswerChange(currentQ.question_id, val); }} className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition select-none ${checked ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-300' : 'hover:bg-gray-50 border-gray-200'}`}>
                              <input type="radio" checked={checked} onChange={() => handleAnswerChange(currentQ.question_id, val)} className="mr-2 w-4 h-4 pointer-events-none" tabIndex={-1} />
                              <span className="font-semibold text-base">{val}</span>
                            </label>
                          );
                        })}
                      </fieldset>
                    </>
                  )}

                  {qType === 'fill_blank' && (
                    <InlineFillBlank
                      text={currentQ.question_text}
                      value={answers[currentQ.question_id] || ''}
                      onChange={(val) => handleAnswerChange(currentQ.question_id, val)}
                      disabled={submitting}
                    />
                  )}

                  {(qType === 'short_answer' || qType === 'long_answer' || qType === 'essay') && (
                    <>
                      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{currentQ.question_text}</p>
                      <textarea
                        rows={qType === 'short_answer' ? 3 : 6}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-school focus:outline-none"
                        placeholder={t('assessments:type_answer_here')}
                        value={answers[currentQ.question_id] || ''}
                        onChange={(e) => handleAnswerChange(currentQ.question_id, e.target.value)}
                      />
                    </>
                  )}

                  {qType === 'matching' && (() => {
                    const matchData = parseMatchingQuestion(currentQ.question_text);
                    if (!matchData) return <textarea rows="4" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-school" placeholder="Type answers (e.g., 1-B, 2-C)" value={answers[currentQ.question_id] || ''} onChange={(e) => handleAnswerChange(currentQ.question_id, e.target.value)} />;
                    return (
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-bold text-sm text-gray-600 mb-2 uppercase">{t('assessments:match_column_a')}</h4>
                            <ul className="space-y-3">
                              {matchData.items.map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                  <span className="font-bold text-gray-700 w-4">{item.num}.</span>
                                  <span className="flex-1 text-sm text-gray-800">{item.text}</span>
                                  <select className="border-2 border-gray-300 rounded-md p-1.5 text-sm bg-white" value={(answers[currentQ.question_id] || '').split(',')[i] || ''} onChange={(e) => {
                                    const arr = (answers[currentQ.question_id] || '').split(',');
                                    while (arr.length < matchData.items.length) arr.push('');
                                    arr[i] = e.target.value;
                                    handleAnswerChange(currentQ.question_id, arr.join(','));
                                  }}>
                                    <option value="">{t('assessments:select_option')}</option>
                                    {matchData.options.map((opt) => <option key={opt.letter} value={opt.letter}>{opt.letter}</option>)}
                                  </select>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-600 mb-2 uppercase">{t('assessments:match_column_b')}</h4>
                            <ul className="space-y-2">
                              {matchData.options.map((opt) => <li key={opt.letter} className="text-sm bg-white p-2 rounded border"><span className="font-bold mr-2 text-school">{opt.letter}.</span>{opt.text}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0} className="flex-1 md:flex-none px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold disabled:opacity-50"><i className="fas fa-arrow-left mr-2"></i>{t('assessments:previous')}</button>
                  <button onClick={() => setCurrentQuestionIndex((p) => Math.min(questions.length - 1, p + 1))} disabled={currentQuestionIndex === questions.length - 1} className="flex-1 md:flex-none px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold disabled:opacity-50">{t('assessments:next')}<i className="fas fa-arrow-right ml-2"></i></button>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <p className="text-sm text-gray-500">{t('assessments:answered_of', { answered: answeredCount, total: questions.length })}</p>
                  <button onClick={submitAssessment} disabled={submitting} className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">{submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}{submitting ? t('assessments:submitting') : t('assessments:submit')}</button>
                </div>
              </div>
            </div>

            <aside className="w-full lg:w-72 lg:sticky lg:top-32 shrink-0">
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase border-b pb-2">{t('assessments:questions')}</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const isAnswered = answers[q.question_id] !== undefined && answers[q.question_id] !== '';
                    const isCurrent = index === currentQuestionIndex;
                    return (
                      <button key={q.question_id} onClick={() => setCurrentQuestionIndex(index)} className={`w-full aspect-square flex items-center justify-center rounded-full font-bold text-sm transition-colors border ${isCurrent ? 'ring-4 ring-blue-300 bg-blue-600 text-white border-blue-700' : isAnswered ? 'bg-green-600 text-white border-green-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}>{index + 1}</button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: LIST VIEW
  // ==========================================
  if (error) return <div role="alert" className="alert-error">{error}</div>;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-school mb-4">{t('assessments:title')}</h1>
      {quizError && (
        <div role="alert" className="bg-red-100 text-red-700 p-3 rounded-lg mb-3 flex items-center justify-between">
          <span>{quizError}</span>
          <button onClick={() => setQuizError('')} className="font-bold text-lg">×</button>
        </div>
      )}
      <div className="card" style={{ padding: 0 }}>
        <table className="data w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Title</th>
              <th className="p-4 font-semibold text-gray-600">{t('assessments:deadline')}</th>
              <th className="p-4 font-semibold text-gray-600">{t('assessments:status')}</th>
              <th className="p-4 font-semibold text-gray-600">{t('assessments:marks')}</th>
              <th className="p-4 font-semibold text-gray-600 text-right">{t('assessments:action')}</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => {
              const isSubmitted = !!a.submitted;
              const isGraded = a.submission_status === 'graded';
              const isRequesting = requestingAssessment === a.assessment_id;

              // Also check database approval status for the green button
              const isDbApproved = a.approval_status === 'approved';
              const isApproved = (isRequesting && requestStatus === 'approved') || isDbApproved;

              return (
                <tr key={a.assessment_id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{a.title}</td>
                  <td className="p-4 text-sm text-gray-600">{a.end_date} <span className="text-gray-400">at</span> {a.end_time}</td>
                  <td className="p-4">
                    {isGraded ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">{t('assessments:graded')}</span>
                    : isSubmitted ? <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">{t('assessments:submitted')}</span>
                    : isRequesting && requestStatus === 'waiting' ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold uppercase">{t('assessments:awaiting_teacher')}</span>
                    : isApproved ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold uppercase">Approved</span>
                    : isRequesting && requestStatus === 'rejected' ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold uppercase">{t('assessments:rejected')}</span>
                    : <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold uppercase">{t('assessments:pending')}</span>}
                  </td>
                  <td className="p-4">{isGraded ? `${a.obtained_marks} / ${a.total_marks}` : `— / ${a.total_marks}`}</td>
                  <td className="p-4 text-right">
                    {isSubmitted ? (
                      <span className="text-sm text-gray-400">{t('assessments:already_submitted')}</span>
                    ) : isApproved ? (
                      <button
                        onClick={() => startAssessment(a)}
                        disabled={startingRef.current}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg animate-pulse"
                      >
                        <i className="fas fa-play"></i> Start Assessment
                      </button>
                    ) : isRequesting ? (
                      <div className={`inline-block px-4 py-2 rounded-lg text-sm font-bold text-center ${requestStatus === 'waiting' ? 'bg-yellow-100 text-yellow-800 border border-yellow-400' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                        {requestStatus === 'requesting' && <><i className="fas fa-spinner fa-spin mr-1"></i> Sending…</>}
                        {requestStatus === 'waiting' && <><i className="fas fa-hourglass-half mr-1 animate-pulse"></i> {t('assessments:awaiting_teacher')}</>}
                      </div>
                    ) : (
                      <button onClick={() => requestStart(a)} className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                        <i className="fas fa-hand-paper"></i> {t('assessments:request_to_start')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}