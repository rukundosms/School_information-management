// src/pages/teacher/TeacherScheduleClass.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Generate a Google-Meet-style room code: "abc-defg-hij"
function generateRoomCode() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

// Detect the provider of an external link
function detectProvider(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('meet.google.com')) return { name: 'Google Meet', color: 'text-green-600', icon: 'fa-video' };
  if (u.includes('zoom.us')) return { name: 'Zoom', color: 'text-blue-600', icon: 'fa-video' };
  if (u.includes('teams.microsoft.com')) return { name: 'Microsoft Teams', color: 'text-purple-600', icon: 'fa-users' };
  if (u.includes('whereby.com')) return { name: 'Whereby', color: 'text-orange-600', icon: 'fa-video' };
  if (u.includes('jitsi')) return { name: 'Jitsi', color: 'text-gray-700', icon: 'fa-video' };
  return { name: 'External link', color: 'text-gray-700', icon: 'fa-link' };
}

// Format a time string "HH:MM" into "h:MM AM/PM"
function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// Format a date string "YYYY-MM-DD" into "Mon, Nov 5, 2026"
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format minutes to "1h 30m"
function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// Compute recurrence dates from start date + pattern + count
function computeRecurrenceDates(startDate, pattern, count) {
  if (!startDate || !pattern || pattern === 'none' || !count) return [];
  const dates = [];
  const start = new Date(startDate + 'T00:00:00');
  let cursor = new Date(start);

  for (let i = 0; i < count; i++) {
    dates.push(cursor.toISOString().slice(0, 10));
    if (pattern === 'daily') {
      cursor.setDate(cursor.getDate() + 1);
    } else if (pattern === 'weekly') {
      cursor.setDate(cursor.getDate() + 7);
    } else if (pattern === 'mwf') {
      // Advance to next Mon/Wed/Fri
      do { cursor.setDate(cursor.getDate() + 1); } while (![1, 3, 5].includes(cursor.getDay()));
    } else if (pattern === 'tth') {
      // Advance to next Tue/Thu
      do { cursor.setDate(cursor.getDate() + 1); } while (![2, 4].includes(cursor.getDay()));
    }
  }
  return dates;
}

// Generate .ics for calendar import
function generateICS({ title, description, date, startTime, endTime, location, organizer }) {
  const pad = (n) => String(n).padStart(2, '0');
  const toICSDate = (d, t) => {
    const [hh, mm] = t.split(':');
    return `${d.replace(/-/g, '')}T${pad(hh)}${pad(mm)}00`;
  };
  const start = toICSDate(date, startTime);
  const end = toICSDate(date, endTime);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const uid = `class-${Date.now()}@school`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School//OnlineClass//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${location || ''}`,
    `ORGANIZER:${organizer || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherScheduleClass() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [existingSessions, setExistingSessions] = useState([]); // for conflict detection
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ── Meeting type toggle ──
  const [meetingType, setMeetingType] = useState('builtin'); // 'builtin' | 'external'

  // ── Form state ──
  const [form, setForm] = useState({
    cid: '',
    title: '',
    description: '',
    meeting_link: '',
    meeting_id: '',
    meeting_password: '',
    room_code: generateRoomCode(), // for built-in rooms
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration: '',
    // Recurrence
    recurrence: 'none', // none | daily | weekly | mwf | tth
    recurrence_count: 1,
    // Meeting options
    waiting_room: true,
    auto_admit: false,
    mute_on_entry: true,
    allow_screen_share: true,
    allow_student_camera: true,
    // Reminders
    reminder_minutes: 15,
    // Attachments
    material_ids: [],
    // Buffer for over-runs
    buffer_minutes: 5,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // ── Load classes + materials ──
  useEffect(() => {
    loadClasses();
    loadMaterials();
  }, []);

  // ── Load existing sessions for conflict detection when class changes ──
  useEffect(() => {
    if (!form.cid) { setExistingSessions([]); return; }
    apiFetch(`/api/teacher/online-classes?cid=${form.cid}`)
      .then((d) => setExistingSessions(d.classes || []))
      .catch(() => setExistingSessions([]));
  }, [form.cid]);

  // ── Auto-clear messages ──
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 6000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // ── Auto-calculate duration when start/end change ──
  useEffect(() => {
    if (form.start_time && form.end_time) {
      const start = new Date(`2000-01-01 ${form.start_time}`);
      const end = new Date(`2000-01-01 ${form.end_time}`);
      const diffMinutes = Math.round((end - start) / 60000);
      if (diffMinutes > 0 && diffMinutes <= 480) {
        setForm((prev) => ({ ...prev, duration: diffMinutes.toString() }));
      } else if (diffMinutes > 480) {
        setForm((prev) => ({ ...prev, duration: '' }));
        setFieldErrors((prev) => ({ ...prev, end_time: 'Class cannot exceed 8 hours (Google Meet limit)' }));
      } else {
        setForm((prev) => ({ ...prev, duration: '' }));
      }
    }
  }, [form.start_time, form.end_time]);

  // ── Detected provider ──
  const provider = useMemo(() => detectProvider(form.meeting_link), [form.meeting_link]);

  // ── Recurrence preview ──
  const recurrenceDates = useMemo(
    () => computeRecurrenceDates(form.scheduled_date, form.recurrence, form.recurrence_count),
    [form.scheduled_date, form.recurrence, form.recurrence_count]
  );

  // ── Conflict detection ──
  const conflict = useMemo(() => {
    if (!form.scheduled_date || !form.start_time || !form.end_time) return null;
    const newStart = new Date(`${form.scheduled_date}T${form.start_time}`);
    const newEnd = new Date(`${form.scheduled_date}T${form.end_time}`);
    for (const s of existingSessions) {
      if (s.status === 'cancelled' || s.status === 'completed') continue;
      if (s.scheduled_date !== form.scheduled_date) continue;
      const sStart = new Date(`${s.scheduled_date}T${s.start_time}`);
      const sEnd = new Date(`${s.scheduled_date}T${s.end_time}`);
      if (newStart < sEnd && newEnd > sStart) {
        return s;
      }
    }
    return null;
  }, [form.scheduled_date, form.start_time, form.end_time, existingSessions]);

  // ── Loaders ──
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const data = await apiFetch('/api/teacher/my-classes');
      setClasses(data.classes || []);
    } catch (err) {
      setError('Failed to load your classes: ' + err.message);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const d = await apiFetch('/api/teacher/materials');
      setMaterials(d.materials || []);
    } catch {
      setMaterials([]);
    }
  };

  // ── Field change ──
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // ── Meeting type switch ──
  const handleMeetingTypeChange = (type) => {
    setMeetingType(type);
    if (type === 'builtin') {
      // Built-in: auto-generate room code, no external link needed
      setForm((prev) => ({
        ...prev,
        room_code: prev.room_code || generateRoomCode(),
        meeting_link: '',
        meeting_id: '',
        meeting_password: '',
      }));
    } else {
      // External: clear room code
      setForm((prev) => ({ ...prev, room_code: '' }));
    }
  };

  // ── Validation ──
  const validateForm = () => {
    const errors = {};

    if (!form.cid) errors.cid = 'Please select a class';
    if (!form.title.trim()) errors.title = 'Title is required';

    if (meetingType === 'external') {
      if (!form.meeting_link.trim()) {
        errors.meeting_link = 'Meeting link is required for external meetings';
      } else if (!/^https?:\/\/.+/.test(form.meeting_link)) {
        errors.meeting_link = 'Please enter a valid URL starting with http:// or https://';
      }
    }

    if (!form.scheduled_date) errors.scheduled_date = 'Date is required';
    if (form.scheduled_date && form.scheduled_date < today) {
      errors.scheduled_date = 'Date cannot be in the past';
    }
    if (!form.start_time) errors.start_time = 'Start time is required';
    if (!form.end_time) errors.end_time = 'End time is required';
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      errors.end_time = 'End time must be after start time';
    }

    // Duration cap
    if (form.duration && parseInt(form.duration, 10) > 480) {
      errors.duration = 'Maximum class duration is 8 hours';
    }

    // Recurrence count cap
    if (form.recurrence !== 'none' && (form.recurrence_count < 2 || form.recurrence_count > 52)) {
      errors.recurrence_count = 'Recurrence count must be between 2 and 52';
    }

    // Conflict warning (soft — blocks submit but is overridable)
    if (conflict) {
      errors.conflict = `Conflicts with "${conflict.title}" (${formatTime12(conflict.start_time)} – ${formatTime12(conflict.end_time)})`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Build payload ──
  const buildPayload = (override = {}) => {
    const dates = recurrenceDates.length > 0 ? recurrenceDates : [form.scheduled_date];
    const base = {
      cid: parseInt(form.cid, 10),
      title: form.title.trim(),
      description: form.description.trim() || null,
      meeting_link: meetingType === 'builtin'
        ? `builtin://${form.room_code}` // sentinel — backend treats as built-in
        : form.meeting_link.trim(),
      meeting_id: meetingType === 'external' ? (form.meeting_id.trim() || null) : null,
      meeting_password: meetingType === 'external' ? (form.meeting_password.trim() || null) : null,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: form.duration ? parseInt(form.duration, 10) : null,
      // Google Meet parity flags
      meeting_type: meetingType,
      room_code: meetingType === 'builtin' ? form.room_code : null,
      waiting_room: form.waiting_room,
      auto_admit: form.auto_admit,
      mute_on_entry: form.mute_on_entry,
      allow_screen_share: form.allow_screen_share,
      allow_student_camera: form.allow_student_camera,
      reminder_minutes: form.reminder_minutes,
      material_ids: form.material_ids,
      buffer_minutes: form.buffer_minutes,
      recurrence: form.recurrence,
      recurrence_count: form.recurrence === 'none' ? 1 : form.recurrence_count,
      dates,
      ...override,
    };
    return base;
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = buildPayload();
      const response = await apiFetch('/api/teacher/schedule-class', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Backward-compat: some backends return { ok: true, classId }
      const created = response.classId
        ? 1
        : (payload.dates?.length || 1);

      setSuccess(
        `✅ ${created > 1 ? `${created} classes` : 'Class'} scheduled successfully!` +
        (meetingType === 'builtin' ? ' Students can join the built-in classroom.' : ` External link: ${provider?.name}.`)
      );

      // Reset form (keep meeting type + recurring count preference)
      setForm((prev) => ({
        ...prev,
        cid: '',
        title: '',
        description: '',
        meeting_link: '',
        meeting_id: '',
        meeting_password: '',
        room_code: generateRoomCode(),
        scheduled_date: '',
        start_time: '',
        end_time: '',
        duration: '',
        recurrence: 'none',
        recurrence_count: 1,
        material_ids: [],
      }));
      setFieldErrors({});

      setTimeout(() => navigate('/teacher/manage-online-classes'), 2200);
    } catch (err) {
      setError(err.message || 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Save as draft ──
  const handleSaveDraft = async () => {
    if (!form.cid || !form.title.trim()) {
      setError('Class and title are required to save a draft');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/teacher/schedule-class', {
        method: 'POST',
        body: JSON.stringify(buildPayload({ status: 'draft', dates: [form.scheduled_date || today] })),
      });
      setSuccess('Draft saved. You can edit it from Manage Online Classes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Download .ics ──
  const handleDownloadICS = () => {
    if (!form.title || !form.scheduled_date || !form.start_time || !form.end_time) {
      setError('Fill in title, date and times first');
      return;
    }
    const location = meetingType === 'builtin'
      ? `Built-in classroom: ${window.location.origin}/student/online-classes`
      : form.meeting_link;
    const ics = generateICS({
      title: form.title,
      description: form.description,
      date: form.scheduled_date,
      startTime: form.start_time,
      endTime: form.end_time,
      location,
      organizer: 'Teacher',
    });
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Reset ──
  const handleReset = () => {
    setForm({
      cid: '',
      title: '',
      description: '',
      meeting_link: '',
      meeting_id: '',
      meeting_password: '',
      room_code: generateRoomCode(),
      scheduled_date: '',
      start_time: '',
      end_time: '',
      duration: '',
      recurrence: 'none',
      recurrence_count: 1,
      waiting_room: true,
      auto_admit: false,
      mute_on_entry: true,
      allow_screen_share: true,
      allow_student_camera: true,
      reminder_minutes: 15,
      material_ids: [],
      buffer_minutes: 5,
    });
    setFieldErrors({});
    setError('');
    setSuccess('');
  };

  // ── Toggle material ──
  const toggleMaterial = (id) => {
    setForm((prev) => {
      const has = prev.material_ids.includes(id);
      return {
        ...prev,
        material_ids: has
          ? prev.material_ids.filter((x) => x !== id)
          : [...prev.material_ids, id],
      };
    });
  };

  const hasClasses = classes.length > 0;
  const classMaterials = materials.filter((m) => String(m.cid) === String(form.cid));

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/teacher/dashboard"
            className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3"
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
            <i className="fas fa-video"></i>
            Schedule Online Class
          </h1>
          <p className="text-gray-600 mt-1">
            Create a live classroom — mic, camera, screen share, chat and whiteboard work out of the box.
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6 flex items-center gap-3">
            <i className="fas fa-check-circle text-lg"></i>
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess('')} className="font-bold text-xl hover:opacity-70">×</button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
            <i className="fas fa-exclamation-circle text-lg"></i>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold text-xl hover:opacity-70">×</button>
          </div>
        )}

        {/* No classes warning */}
        {!loadingClasses && !hasClasses && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <i className="fas fa-exclamation-triangle text-lg mt-0.5"></i>
              <div>
                <p className="font-semibold">No classes assigned</p>
                <p className="text-sm mt-1">
                  Ask the administrator to assign you to classes before scheduling online sessions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
          {loadingClasses ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your classes...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ───── STEP 1: CLASS + TITLE ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">1</span>
                  Basic Information
                </h2>

                <div className="space-y-4">
                  {/* Class */}
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Select Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.cid}
                      onChange={(e) => handleChange('cid', e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        fieldErrors.cid ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.cid} value={cls.cid}>
                          {cls.class_name} ({cls.class_code}) — Level {cls.level}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.cid && <p className="text-red-500 text-xs mt-1">{fieldErrors.cid}</p>}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Class Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g., Mathematics Lesson 1: Algebra"
                      maxLength={200}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        fieldErrors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows="3"
                      maxLength={500}
                      placeholder="What will students learn in this session?"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">{form.description.length}/500 characters</p>
                  </div>
                </div>
              </section>

              {/* ───── STEP 2: MEETING TYPE ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">2</span>
                  Meeting Type
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => handleMeetingTypeChange('builtin')}
                    className={`text-left p-4 rounded-xl border-2 transition ${
                      meetingType === 'builtin'
                        ? 'border-green-600 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        meetingType === 'builtin' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <i className="fas fa-video"></i>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          Built-in Classroom
                          <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">RECOMMENDED</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Full mic, camera, screen share, chat and whiteboard — all inside the app. No external link needed.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMeetingTypeChange('external')}
                    className={`text-left p-4 rounded-xl border-2 transition ${
                      meetingType === 'external'
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        meetingType === 'external' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <i className="fas fa-link"></i>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">External Link</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Paste a Google Meet, Zoom, Teams or Jitsi link. Opens in a new tab.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Built-in room details */}
                {meetingType === 'builtin' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Room Code</p>
                        <p className="text-lg font-bold text-gray-900 tracking-wider font-mono">
                          {form.room_code}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange('room_code', generateRoomCode())}
                        className="text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <i className="fas fa-redo"></i> New code
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Students click "Join Live Class" — no link to share. Works exactly like Google Meet.
                    </p>
                  </div>
                )}

                {/* External link */}
                {meetingType === 'external' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-2">
                        Meeting Link <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={form.meeting_link}
                          onChange={(e) => handleChange('meeting_link', e.target.value)}
                          placeholder="https://meet.google.com/xxx-xxxx-xxx"
                          className={`flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            fieldErrors.meeting_link ? 'border-red-500' : 'border-gray-300'
                          }`}
                          required={meetingType === 'external'}
                        />
                        <button
                          type="button"
                          onClick={() => handleChange('meeting_link', `https://meet.google.com/${generateRoomCode()}`)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                          title="Generate sample Google Meet link"
                        >
                          <i className="fas fa-magic"></i>
                        </button>
                      </div>
                      {fieldErrors.meeting_link && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.meeting_link}</p>
                      )}
                      {provider && !fieldErrors.meeting_link && (
                        <p className={`text-xs mt-1 ${provider.color} flex items-center gap-1`}>
                          <i className={`fas ${provider.icon}`}></i>
                          Detected: {provider.name}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-green-900 mb-2">Meeting ID</label>
                        <input
                          type="text"
                          value={form.meeting_id}
                          onChange={(e) => handleChange('meeting_id', e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-green-900 mb-2">Password</label>
                        <input
                          type="text"
                          value={form.meeting_password}
                          onChange={(e) => handleChange('meeting_password', e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* ───── STEP 3: DATE & TIME ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">3</span>
                  Date & Time
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.scheduled_date}
                      onChange={(e) => handleChange('scheduled_date', e.target.value)}
                      min={today}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        fieldErrors.scheduled_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {fieldErrors.scheduled_date && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.scheduled_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => handleChange('start_time', e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        fieldErrors.start_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {fieldErrors.start_time && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.start_time}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      End <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        fieldErrors.end_time ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {fieldErrors.end_time && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.end_time}</p>
                    )}
                  </div>
                </div>

                {/* Duration display */}
                {form.duration && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    <i className="fas fa-clock"></i>
                    Duration: <strong>{formatDuration(parseInt(form.duration, 10))}</strong>
                    {parseInt(form.duration, 10) > 480 && (
                      <span className="text-red-600 ml-2">— exceeds 8h Google Meet limit</span>
                    )}
                  </p>
                )}

                {/* Conflict warning */}
                {conflict && (
                  <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-lg text-sm">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Overlaps with <strong>"{conflict.title}"</strong> ({formatTime12(conflict.start_time)} – {formatTime12(conflict.end_time)}). Pick a different time.
                  </div>
                )}
              </section>

              {/* ───── STEP 4: RECURRENCE ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">4</span>
                  Recurrence
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">Repeat</label>
                    <select
                      value={form.recurrence}
                      onChange={(e) => handleChange('recurrence', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="none">Does not repeat</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="mwf">Mon / Wed / Fri</option>
                      <option value="tth">Tue / Thu</option>
                    </select>
                  </div>
                  {form.recurrence !== 'none' && (
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-2">Number of sessions</label>
                      <input
                        type="number"
                        min="2"
                        max="52"
                        value={form.recurrence_count}
                        onChange={(e) => handleChange('recurrence_count', parseInt(e.target.value, 10) || 1)}
                        className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          fieldErrors.recurrence_count ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {fieldErrors.recurrence_count && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.recurrence_count}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview dates */}
                {recurrenceDates.length > 1 && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">
                      <i className="fas fa-calendar-alt mr-1"></i>
                      {recurrenceDates.length} sessions will be created:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recurrenceDates.slice(0, 8).map((d) => (
                        <span key={d} className="text-[11px] bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded">
                          {formatDate(d)}
                        </span>
                      ))}
                      {recurrenceDates.length > 8 && (
                        <span className="text-[11px] text-blue-600 px-2 py-0.5">
                          +{recurrenceDates.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* ───── STEP 5: CLASSROOM OPTIONS ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">5</span>
                  Classroom Options
                </h2>

                <div className="space-y-2">
                  <ToggleRow
                    label="Waiting room"
                    hint="Students must be admitted by you before joining"
                    value={form.waiting_room}
                    onChange={(v) => handleChange('waiting_room', v)}
                  />
                  <ToggleRow
                    label="Auto-admit students"
                    hint="Skip the waiting room — students join instantly"
                    value={form.auto_admit}
                    onChange={(v) => {
                      handleChange('auto_admit', v);
                      if (v) handleChange('waiting_room', false);
                    }}
                  />
                  <ToggleRow
                    label="Mute students on entry"
                    hint="Students join muted (like Google Meet default)"
                    value={form.mute_on_entry}
                    onChange={(v) => handleChange('mute_on_entry', v)}
                  />
                  <ToggleRow
                    label="Allow screen sharing"
                    hint="Students can share their screen"
                    value={form.allow_screen_share}
                    onChange={(v) => handleChange('allow_screen_share', v)}
                  />
                  <ToggleRow
                    label="Allow student cameras"
                    hint="Students can turn their camera on"
                    value={form.allow_student_camera}
                    onChange={(v) => handleChange('allow_student_camera', v)}
                  />
                </div>
              </section>

              {/* ───── STEP 6: REMINDERS + MATERIALS ───── */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-800 text-white flex items-center justify-center text-xs">6</span>
                  Reminders & Materials
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Remind students
                    </label>
                    <select
                      value={form.reminder_minutes}
                      onChange={(e) => handleChange('reminder_minutes', parseInt(e.target.value, 10))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={0}>No reminder</option>
                      <option value={5}>5 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={1440}>1 day before</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Overtime buffer
                    </label>
                    <select
                      value={form.buffer_minutes}
                      onChange={(e) => handleChange('buffer_minutes', parseInt(e.target.value, 10))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={0}>No buffer</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                    </select>
                  </div>
                </div>

                {/* Attach materials */}
                {form.cid && (
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      Attach class materials (optional)
                    </label>
                    {classMaterials.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        No materials uploaded for this class yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {classMaterials.map((m) => (
                          <label key={m.material_id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.material_ids.includes(m.material_id)}
                              onChange={() => toggleMaterial(m.material_id)}
                              className="accent-green-700"
                            />
                            <i className="fas fa-file-alt text-gray-400 text-xs"></i>
                            <span className="text-sm text-gray-800 flex-1 truncate">{m.title}</span>
                            <span className="text-[10px] text-gray-400">{m.material_type}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ───── Preview toggle ───── */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-sm font-semibold text-green-800 hover:underline flex items-center gap-1"
                >
                  <i className={`fas ${showPreview ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showPreview ? 'Hide' : 'Show'} student preview
                </button>
              </div>

              {showPreview && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">What students will see</p>
                  <div className={`bg-white rounded-lg p-4 border-l-4 ${meetingType === 'builtin' ? 'border-green-500' : 'border-blue-500'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{form.title || 'Untitled class'}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{form.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          <i className="far fa-calendar mr-1"></i>
                          {form.scheduled_date ? formatDate(form.scheduled_date) : 'No date'} ·{' '}
                          {form.start_time ? formatTime12(form.start_time) : '--'} – {form.end_time ? formatTime12(form.end_time) : '--'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {meetingType === 'builtin' && (
                            <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                              <i className="fas fa-video mr-1"></i>Built-in classroom
                            </span>
                          )}
                          {form.waiting_room && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                              Waiting room
                            </span>
                          )}
                          {form.mute_on_entry && (
                            <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              Muted on entry
                            </span>
                          )}
                          {form.recurrence !== 'none' && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Repeats {recurrenceDates.length}×
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ───── Actions ───── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting || !hasClasses}
                  className={`flex-1 bg-green-800 hover:bg-green-900 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 ${
                    submitting || !hasClasses ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Scheduling...</>
                  ) : (
                    <><i className="fas fa-calendar-check"></i> Schedule Class{recurrenceDates.length > 1 ? ` ×${recurrenceDates.length}` : ''}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting || !hasClasses}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="fas fa-save"></i> Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleDownloadICS}
                  disabled={submitting}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                  title="Download .ics file for Google Calendar / Outlook"
                >
                  <i className="fas fa-calendar-plus"></i> .ics
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <i className="fas fa-redo"></i> Reset
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <i className="fas fa-lightbulb"></i> Tips for great online classes
          </h3>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Use the <strong>Built-in Classroom</strong> for the most reliable mic + camera — no external link to share.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Enable the waiting room to control who joins your live session.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Mute students on entry, then unmute them when it's time for questions.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Download the <strong>.ics</strong> file and import it into Google Calendar so you don't miss the class.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ToggleRow({ label, hint, value, onChange }) {
  return (
    <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`mt-0.5 shrink-0 w-10 h-6 rounded-full relative transition ${
          value ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {hint && <div className="text-xs text-gray-600 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}