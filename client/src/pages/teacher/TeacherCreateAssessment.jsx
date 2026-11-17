// src/pages/teacher/TeacherCreateAssessment.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

// ============================================================
// UNIVERSAL QUESTION PARSER
// Handles: MCQs (A-E), True/False, Fill in the blanks, Essays.
// ============================================================
function parseUniversalQuestions(text) {
  if (!text) return [];

  let clean = text
    .replace(/^=+\s*Page\s+\d+\s*=+$/gim, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .trim();

  const questionStartRe = /^(?:Question\s+|Q\s*)?(\d+)\s*[\.\)](?:\s*(?:\d+|[a-z])\s*[\.\)])?\s+/gim;
  const matches = [...clean.matchAll(questionStartRe)];
  if (matches.length === 0) return [];

  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
    blocks.push(clean.slice(start, end).trim());
  }

  const questions = [];

  for (const block of blocks) {
    const body = block.replace(questionStartRe, '').trim();
    if (!body) continue;

    const marksMatch = body.match(/\((\d+)\s*marks?\)/i);
    const marks = marksMatch ? Math.max(1, parseInt(marksMatch[1], 10)) : 1;
    const withoutMarks = body.replace(/\(\d+\s*marks?\)/i, '').trim();

    // Preserve formatting but flatten lines for easier parsing
    const flat = withoutMarks.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    let type = 'short_answer';
    let questionText = '';
    let correctAnswer = '';
    let option_a = '', option_b = '', option_c = '', option_d = '', option_e = '';

    const hasOptions = /A[\.\)]\s/.test(flat) && /B[\.\)]\s/.test(flat);
    const hasAnswerLine = /Answer\s*:\s*/i.test(flat);

    if (hasOptions) {
      type = 'multiple_choice';
      
      // Extract options A to E
      const optA = flat.match(/A[\.\)]\s*(.*?)(?=\s*B[\.\)])/);
      const optB = flat.match(/B[\.\)]\s*(.*?)(?=\s*C[\.\)])/);
      const optC = flat.match(/C[\.\)]\s*(.*?)(?=\s*D[\.\)])/);
      const optD = flat.match(/D[\.\)]\s*(.*?)(?=\s*E[\.\)]|\s*Answer:)/);
      const optE = flat.match(/E[\.\)]\s*(.*?)(?=\s*Answer:)/);

      if (optA) option_a = optA[1].trim();
      if (optB) option_b = optB[1].trim();
      if (optC) option_c = optC[1].trim();
      if (optD) option_d = optD[1].trim();
      if (optE) option_e = optE[1].trim();

      const qTextMatch = flat.match(/(.*?)\s*A[\.\)]\s/);
      questionText = qTextMatch ? qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim() : flat.split(/A[\.\)]\s/)[0].trim();

      // Find answer
      const ansMatch = flat.match(/Answer\s*:\s*([A-E])(?:\.|\s|$)/i);
      if (ansMatch) {
        correctAnswer = ansMatch[1].toUpperCase();
      } else {
        const textMatch = flat.match(/Answer\s*:\s*(.*?)(?:\d+\.|$)/i);
        if (textMatch) {
          const val = textMatch[1].trim().toLowerCase();
          if (val === option_a.toLowerCase()) correctAnswer = 'A';
          else if (val === option_b.toLowerCase()) correctAnswer = 'B';
          else if (val === option_c.toLowerCase()) correctAnswer = 'C';
          else if (val === option_d.toLowerCase()) correctAnswer = 'D';
          else if (val === option_e.toLowerCase()) correctAnswer = 'E';
          else correctAnswer = 'A';
        }
      }

    } else if (/Answer\s*:\s*(TRUE|FALSE)/i.test(flat)) {
      type = 'true_false';
      const ansMatch = flat.match(/Answer\s*:\s*(TRUE|FALSE)/i);
      if (ansMatch) correctAnswer = ansMatch[1].toUpperCase();
      const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
      if (qTextMatch) questionText = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();

    } else if (flat.includes('____')) {
      // FIX: Automatically mark as fill_blank if underscores exist
      type = 'fill_blank';
      const ansMatch = flat.match(/Answer\s*:\s*(.*?)(?:\d+\.|$)/i);
      if (ansMatch) correctAnswer = ansMatch[1].trim();
      const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
      if (qTextMatch) questionText = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();
      else questionText = flat.replace(/\d+\s*marks?\.?/i, '').trim();

    } else {
      type = 'essay';
      if (hasAnswerLine) {
        const ansMatch = flat.match(/Answer\s*:\s*(.*?)(?:\d+\.|$)/i);
        if (ansMatch) correctAnswer = ansMatch[1].trim();
        const qTextMatch = flat.match(/(.*?)\s*Answer:/i);
        if (qTextMatch) questionText = qTextMatch[1].replace(/\d+\s*marks?\.?/i, '').trim();
      } else {
        questionText = flat.replace(/\d+\s*marks?\.?/i, '').trim();
      }
    }

    if (questionText.trim()) {
      questions.push({
        question_type: type,
        question_text: questionText.trim(),
        option_a, option_b, option_c, option_d, option_e,
        correct_answer: correctAnswer,
        marks,
      });
    }
  }

  return questions;
}

// ============================================================
// COMPONENT
// ============================================================
export default function TeacherCreateAssessment() {
  const navigate = useNavigate();
  const { assessmentId: paramAssessmentId } = useParams();
  const isEditMode = !!paramAssessmentId;

  const [step, setStep] = useState(1);
  const [assessmentId, setAssessmentId] = useState(paramAssessmentId ? parseInt(paramAssessmentId, 10) : null);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [assessmentStatus, setAssessmentStatus] = useState('draft');

  const [form, setForm] = useState({
    cid: '', title: '', description: '', assessment_type: 'quiz', total_marks: '', passing_marks: '',
    duration: '', start_date: '', start_time: '09:00', end_date: '', end_time: '17:00',
    instructions: '', allow_late: false, show_results: true,
  });

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(emptyQuestion());
  const [editingId, setEditingId] = useState(null);
  const [assessmentMeta, setAssessmentMeta] = useState(null);

  const [previewQuestions, setPreviewQuestions] = useState(null);
  const [previewSource, setPreviewSource] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEditMode) return;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm((f) => ({ ...f, start_date: today.toISOString().split('T')[0], end_date: tomorrow.toISOString().split('T')[0] }));
  }, [isEditMode]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/assessment-classes');
        setClasses(data.classes || []);
      } catch (err) { setError(err.message); } finally { setLoadingClasses(false); }
    })();
  }, []);

  useEffect(() => {
    if (!paramAssessmentId) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/teacher/assessments/${paramAssessmentId}`);
        const a = data.assessment;
        setAssessmentMeta(a);
        setAssessmentStatus(a.status || 'draft');
        setForm({
          cid: a.cid || '', title: a.title || '', description: a.description || '', assessment_type: a.assessment_type || 'quiz',
          total_marks: a.total_marks || '', passing_marks: a.passing_marks || '', duration: a.duration_minutes || '',
          start_date: a.start_date ? String(a.start_date).slice(0, 10) : '', start_time: a.start_time || '09:00',
          end_date: a.end_date ? String(a.end_date).slice(0, 10) : '', end_time: a.end_time || '17:00',
          instructions: a.instructions || '', allow_late: !!a.allow_late_submission, show_results: !!a.show_results_immediately,
        });
        setQuestions(data.questions || []);
        setStep(1);
      } catch (err) { setError(err.message); } finally { setLoadingExisting(false); }
    })();
  }, [paramAssessmentId]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  function emptyQuestion() {
    return {
      question_type: 'multiple_choice',
      question_text: '',
      option_a: '', option_b: '', option_c: '', option_d: '', option_e: '',
      correct_answer: '', marks: 1,
    };
  }

  const resetQuestion = () => { setCurrentQuestion(emptyQuestion()); setEditingId(null); };
  const handleQuestionChange = (field, value) => setCurrentQuestion((q) => ({ ...q, [field]: value }));

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const startDt = new Date(`${form.start_date}T${form.start_time}`);
    const endDt = new Date(`${form.end_date}T${form.end_time}`);
    if (endDt <= startDt) { setError('End date and time must be after start date and time.'); return; }
    if (parseInt(form.passing_marks, 10) > parseInt(form.total_marks, 10)) { setError('Passing marks cannot exceed total marks.'); return; }
    setSubmitting(true);

    try {
      if (isEditMode && assessmentId) {
        await apiFetch(`/api/teacher/assessments/${assessmentId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: form.title, description: form.description, total_marks: form.total_marks, passing_marks: form.passing_marks,
            duration_minutes: form.duration || null, start_date: form.start_date, start_time: form.start_time,
            end_date: form.end_date, end_time: form.end_time, instructions: form.instructions,
          }),
        });
        setSuccess('Assessment updated! You can now manage the questions below.');
        setStep(2);
      } else {
        const data = await apiFetch('/api/teacher/create-assessment', {
          method: 'POST',
          body: JSON.stringify({
            cid: form.cid, title: form.title, description: form.description, assessment_type: form.assessment_type,
            total_marks: form.total_marks, passing_marks: form.passing_marks, duration_minutes: form.duration || null,
            start_date: form.start_date, start_time: form.start_time, end_date: form.end_date, end_time: form.end_time,
            instructions: form.instructions, allow_late_submission: form.allow_late, show_results_immediately: form.show_results,
          }),
        });
        setAssessmentId(data.assessment_id);
        setAssessmentMeta({ assessment_id: data.assessment_id, title: form.title, total_marks: form.total_marks, assessment_type: form.assessment_type });
        setAssessmentStatus('draft');
        setSuccess('Assessment created! Now add questions below.');
        setStep(2);
      }
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!currentQuestion.question_text.trim()) { setError('Question text is required'); return; }
    if (!currentQuestion.marks || parseInt(currentQuestion.marks, 10) < 1) { setError('Marks must be at least 1'); return; }
    
    let finalType = currentQuestion.question_type;
    if (finalType === 'short_answer' && currentQuestion.question_text.includes('____')) {
      finalType = 'fill_blank';
    }

    if (finalType === 'multiple_choice') {
      if (!currentQuestion.option_a || !currentQuestion.option_b) { setError('Options A and B are required'); return; }
      if (!currentQuestion.correct_answer) { setError('Correct answer is required'); return; }
    }
    if (finalType === 'true_false' && !currentQuestion.correct_answer) { setError('Correct answer (True/False) is required'); return; }

    setSubmitting(true);
    try {
      const payload = { ...currentQuestion, question_type: finalType };
      if (editingId) {
        await apiFetch(`/api/teacher/assessment-questions/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setQuestions((prev) => prev.map((q) => q.question_id === editingId ? { ...payload, question_id: editingId } : q));
        setSuccess('Question updated!');
      } else {
        const data = await apiFetch(`/api/teacher/assessments/${assessmentId}/questions`, { method: 'POST', body: JSON.stringify(payload) });
        setQuestions((prev) => [...prev, { ...payload, question_id: data.question_id }]);
        setSuccess('Question added!');
      }
      resetQuestion();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(''); setSuccess(''); setPreviewQuestions(null); setPreviewSource(file.name); setUploading(true);

    try {
      const lower = file.name.toLowerCase();
      let text = '';
      if (lower.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value || '';
      } else if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv')) {
        text = await file.text();
      } else {
        await serverFallbackUpload(file); return;
      }

      const parsed = parseUniversalQuestions(text);
      if (parsed.length === 0) { setError('Could not auto-detect questions. Try a different format.'); return; }
      setPreviewQuestions(parsed);
    } catch (err) { setError(err.message || 'Upload failed'); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = null; }
  };

  const serverFallbackUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiFetch(`/api/teacher/assessments/${assessmentId}/upload-questions`, { method: 'POST', body: formData });
      setSuccess(`🎉 ${data.message}`);
      const updated = await apiFetch(`/api/teacher/assessments/${assessmentId}/questions`);
      setQuestions(updated.questions || []);
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  const confirmPreviewImport = async () => {
    if (!previewQuestions || previewQuestions.length === 0) return;
    setUploading(true); setError(''); setSuccess('');
    const created = [];
    try {
      for (const q of previewQuestions) {
        const data = await apiFetch(`/api/teacher/assessments/${assessmentId}/questions`, {
          method: 'POST',
          body: JSON.stringify({
            question_type: q.question_type, question_text: q.question_text, 
            option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, option_e: q.option_e, 
            correct_answer: q.correct_answer, marks: q.marks,
          }),
        });
        created.push({ ...q, question_id: data.question_id });
      }
      setQuestions((prev) => [...prev, ...created]);
      setSuccess(`🎉 Imported ${created.length} question(s) successfully!`);
      setPreviewQuestions(null); setPreviewSource('');
    } catch (err) {
      setError(`Import failed after ${created.length} question(s): ${err.message}`);
      if (created.length > 0) setQuestions((prev) => [...prev, ...created]);
    } finally { setUploading(false); }
  };

  const handleDeleteQuestion = async (qid) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiFetch(`/api/teacher/assessment-questions/${qid}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q.question_id !== qid));
      setSuccess('Question deleted');
    } catch (err) { setError(err.message); }
  };

  const handleEditQuestion = (q) => {
    setCurrentQuestion({
      question_type: q.question_type, question_text: q.question_text,
      option_a: q.option_a || '', option_b: q.option_b || '', option_c: q.option_c || '', option_d: q.option_d || '', option_e: q.option_e || '',
      correct_answer: q.correct_answer || '', marks: q.marks || 1,
    });
    setEditingId(q.question_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublish = async () => {
    if (questions.length === 0) { setError('Add at least one question before publishing'); return; }
    if (!confirm(`Publish this assessment with ${questions.length} question(s)?`)) return;
    try {
      await apiFetch(`/api/teacher/assessments/${assessmentId}/publish`, { method: 'PUT' });
      setAssessmentStatus('published');
      setSuccess('Assessment published! Students can now see and request to start it.');
      setTimeout(() => navigate('/teacher/manage-assessments'), 1500);
    } catch (err) { setError(err.message); }
  };

  const handleFinishLater = () => navigate('/teacher/manage-assessments');
  const totalQuestionMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 0), 0);

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-green-800 mb-3"></i>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center gap-3 text-white">
          <Link to="/teacher/manage-assessments" className="text-sm font-semibold hover:underline">
            <i className="fas fa-arrow-left mr-1"></i> Back to Assessments
          </Link>
          {isEditMode && (<><span className="text-white/50">/</span><span className="text-sm font-semibold text-white/90">Edit: {assessmentMeta?.title}</span></>)}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StepDot num={1} label={isEditMode ? 'Edit Details' : 'Assessment Details'} active={step === 1} done={step > 1} />
            <div className={`h-1 w-12 ${step > 1 ? 'bg-green-600' : 'bg-gray-200'} rounded`} />
            <StepDot num={2} label="Questions" active={step === 2} done={false} />
          </div>
          <div className="flex items-center gap-2">
            {assessmentStatus === 'published' && (
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full"><i className="fas fa-check-circle mr-1"></i> PUBLISHED</span>
            )}
            {assessmentStatus === 'draft' && step === 2 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full"><i className="fas fa-pencil-ruler mr-1"></i> DRAFT</span>
            )}
            {step === 2 && <button onClick={handleFinishLater} className="text-sm text-gray-600 hover:text-gray-900 font-semibold"><i className="fas fa-save mr-1"></i> Save & Exit</button>}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i><span className="flex-1">{error}</span><button onClick={() => setError('')} className="font-bold text-xl">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-3">
            <i className="fas fa-check-circle"></i><span className="flex-1">{success}</span><button onClick={() => setSuccess('')} className="font-bold text-xl">×</button>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-900 to-green-800 text-white px-8 py-6">
              <h2 className="text-3xl font-bold flex items-center gap-3"><i className={isEditMode ? 'fas fa-edit' : 'fas fa-plus-circle'}></i>{isEditMode ? 'Edit Assessment' : 'Create New Assessment'}</h2>
              <p className="text-green-100 mt-2">{isEditMode ? 'Update the rules & schedule below' : 'Step 1 of 2 — Set the rules & schedule'}</p>
            </div>
            <div className="p-8">
              <form onSubmit={handleCreateOrUpdate} className="space-y-6">
                <FormGroup label="Select Class" required icon="fa-chalkboard">
                  <select value={form.cid} onChange={(e) => update('cid', e.target.value)} required disabled={classes.length === 0 || isEditMode} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700 disabled:bg-gray-100">
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => <option key={c.cid} value={c.cid}>{c.class_name} (ID: {c.cid})</option>)}
                  </select>
                  {isEditMode && <p className="text-xs text-gray-500 mt-1">Class cannot be changed after creation.</p>}
                </FormGroup>

                <FormGroup label="Assessment Title" required icon="fa-heading">
                  <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                </FormGroup>

                <FormGroup label="Description" icon="fa-align-left">
                  <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                </FormGroup>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Assessment Type" required icon="fa-tag">
                    <select value={form.assessment_type} onChange={(e) => update('assessment_type', e.target.value)} required disabled={isEditMode} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700 disabled:bg-gray-100">
                      <option value="quiz">📝 Quiz</option><option value="assignment">📚 Formative Assessment</option><option value="exam">📖 Comprehensive Assessment</option><option value="project">🎯 Project</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Duration (minutes)" icon="fa-clock">
                    <input type="number" value={form.duration} onChange={(e) => update('duration', e.target.value)} min="0" className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Total Marks" required icon="fa-star">
                    <input type="number" value={form.total_marks} onChange={(e) => update('total_marks', e.target.value)} required min="1" className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <FormGroup label="Passing Marks" required icon="fa-check-circle">
                    <input type="number" value={form.passing_marks} onChange={(e) => update('passing_marks', e.target.value)} required min="0" className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Start Date" required icon="fa-calendar">
                    <input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <FormGroup label="Start Time" required icon="fa-clock">
                    <input type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="End Date" required icon="fa-calendar-check">
                    <input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <FormGroup label="End Time" required icon="fa-clock">
                    <input type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <FormGroup label="Instructions" icon="fa-info-circle">
                  <textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} rows={4} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                </FormGroup>

                {!isEditMode && (
                  <div className="flex gap-6 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" checked={form.allow_late} onChange={(e) => update('allow_late', e.target.checked)} className="w-4 h-4" /> Allow late submissions
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" checked={form.show_results} onChange={(e) => update('show_results', e.target.checked)} className="w-4 h-4" /> Show results immediately after grading
                    </label>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={handleFinishLater} className="px-6 py-4 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={classes.length === 0 || submitting} className="flex-1 bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white py-4 rounded-lg text-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-arrow-right"></i> {isEditMode ? 'Save & Continue to Questions' : 'Continue to Add Questions'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-green-900">{assessmentMeta?.title || form.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''} · {totalQuestionMarks} / {assessmentMeta?.total_marks || form.total_marks || '—'} marks</p>
              </div>
              <button onClick={() => setStep(1)} className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50"><i className="fas fa-edit mr-1"></i> Edit Details</button>
            </div>

            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-6 border-2 border-dashed border-green-400">
              <div className="p-8 text-center bg-green-50">
                <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-file-upload text-2xl"></i></div>
                <h3 className="text-xl font-bold text-green-900 mb-2">Auto-Generate from a Note</h3>
                <p className="text-gray-600 mb-4 max-w-lg mx-auto">Upload a <strong>.docx</strong>, <strong>.txt</strong>, or <strong>.csv</strong> file. Your questions will be parsed in the browser, previewed, then imported when you confirm.</p>
                <label className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition cursor-pointer ${uploading ? 'bg-gray-400' : 'bg-green-800 hover:bg-green-900'}`}>
                  {uploading ? <><i className="fas fa-spinner fa-spin"></i> Extracting...</> : <><i className="fas fa-cloud-upload-alt"></i> Select Document to Upload</>}
                  <input ref={fileInputRef} type="file" accept=".docx,.txt,.md,.csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-500 mt-3">For PDF/DOC, we fall back to the server-side parser.</p>
              </div>
            </div>

            <div className="text-center text-gray-400 my-4 font-bold tracking-widest text-sm">— OR ADD MANUALLY BELOW —</div>

            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-green-900 to-green-800 text-white px-8 py-5">
                <h3 className="text-xl font-bold flex items-center gap-2"><i className={editingId ? 'fas fa-edit' : 'fas fa-plus-circle'}></i>{editingId ? 'Edit Question' : 'Add New Question'}</h3>
              </div>
              <form onSubmit={handleAddQuestion} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormGroup label="Question Type" required icon="fa-list">
                    <select value={currentQuestion.question_type} onChange={(e) => { handleQuestionChange('question_type', e.target.value); handleQuestionChange('correct_answer', ''); }} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700">
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="fill_blank">Fill in the Blank</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="essay">Essay / Long Answer</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Marks" required icon="fa-star">
                    <input type="number" value={currentQuestion.marks} onChange={(e) => handleQuestionChange('marks', e.target.value)} min="1" required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <div className="flex items-end"><span className="text-sm text-gray-500">Running total: <strong>{totalQuestionMarks}</strong> marks</span></div>
                </div>

                <FormGroup label="Question Text" required icon="fa-question-circle">
                  <textarea value={currentQuestion.question_text} onChange={(e) => handleQuestionChange('question_text', e.target.value)} rows={3} required className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  {currentQuestion.question_type === 'fill_blank' && <p className="text-xs text-blue-600 mt-1"><i className="fas fa-info-circle"></i> Use underscores (____) to mark where the blank should be.</p>}
                </FormGroup>

                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-700">Options (select the correct one)</p>
                    {['a', 'b', 'c', 'd', 'e'].map((letter) => (
                      <div key={letter} className="flex items-center gap-3">
                        <input type="radio" name="correct_answer" value={letter.toUpperCase()} checked={currentQuestion.correct_answer === letter.toUpperCase()} onChange={(e) => handleQuestionChange('correct_answer', e.target.value)} className="w-5 h-5 text-green-700" />
                        <span className="font-bold text-gray-700 w-6">{letter.toUpperCase()}.</span>
                        <input type="text" value={currentQuestion[`option_${letter}`]} onChange={(e) => handleQuestionChange(`option_${letter}`, e.target.value)} className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700" placeholder={`Option ${letter.toUpperCase()} (optional if less than 5)`} />
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question_type === 'true_false' && (
                  <FormGroup label="Correct Answer" required icon="fa-check">
                    <div className="flex gap-4">
                      {['True', 'False'].map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tf_answer" value={v} checked={currentQuestion.correct_answer === v} onChange={(e) => handleQuestionChange('correct_answer', e.target.value)} className="w-5 h-5 text-green-700" />
                          <span className="font-semibold">{v}</span>
                        </label>
                      ))}
                    </div>
                  </FormGroup>
                )}

                {['fill_blank', 'short_answer', 'essay'].includes(currentQuestion.question_type) && (
                  <FormGroup label="Model Answer / Key" icon="fa-key">
                    <textarea value={currentQuestion.correct_answer} onChange={(e) => handleQuestionChange('correct_answer', e.target.value)} rows={3} placeholder="Model answer used for auto-grading..." className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  {editingId && <button type="button" onClick={resetQuestion} className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Cancel Edit</button>}
                  <button type="submit" disabled={submitting} className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
                    {submitting ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className={editingId ? 'fas fa-save' : 'fas fa-plus'}></i> {editingId ? 'Update Question' : 'Add Question'}</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-list-ol"></i> Questions ({questions.length})</h3></div>
              {questions.length === 0 ? (
                <div className="p-10 text-center text-gray-400"><i className="fas fa-inbox text-4xl mb-3 block"></i><p>No questions yet. Add some above or upload a document.</p></div>
              ) : (
                <div className="divide-y">
                  {questions.map((q, idx) => <QuestionRow key={q.question_id || idx} q={q} idx={idx} onEdit={() => handleEditQuestion(q)} onDelete={() => handleDeleteQuestion(q.question_id)} />)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-wrap gap-3 justify-between items-center">
              <button onClick={handleFinishLater} className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"><i className="fas fa-save mr-2"></i> Save as Draft</button>
              <div className="flex gap-3">
                {assessmentStatus === 'published' && <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-semibold flex items-center gap-2"><i className="fas fa-check-circle"></i> Already Published</div>}
                <button onClick={handlePublish} disabled={questions.length === 0} className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                  <i className="fas fa-paper-plane"></i> {assessmentStatus === 'published' ? 'Republish' : 'Publish Assessment'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {previewQuestions && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !uploading) { setPreviewQuestions(null); setPreviewSource(''); } }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-green-900 to-green-800 text-white rounded-t-xl">
              <div><h3 className="font-bold text-lg"><i className="fas fa-eye mr-2"></i> Preview Import</h3><p className="text-xs text-green-100 mt-1">Parsed from: {previewSource} · {previewQuestions.length} question(s)</p></div>
              <button onClick={() => { setPreviewQuestions(null); setPreviewSource(''); }} disabled={uploading} className="text-2xl font-bold disabled:opacity-50">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {previewQuestions.map((q, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">Q{idx + 1}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">{q.question_type.replace('_', ' ')}</span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{q.question_text}</p>
                  {q.question_type === 'multiple_choice' && (
                    <ul className="ml-4 text-xs text-gray-700 space-y-0.5">
                      {['A', 'B', 'C', 'D', 'E'].map((L) => {
                        const opt = q[`option_${L.toLowerCase()}`]; if (!opt) return null;
                        return <li key={L} className={q.correct_answer === L ? 'font-bold text-green-700' : ''}>{q.correct_answer === L ? '✓ ' : '· '}{L}. {opt}</li>;
                      })}
                    </ul>
                  )}
                  {q.question_type === 'true_false' && <p className="text-xs text-gray-700"><strong>Answer:</strong> <span className="font-mono">{q.correct_answer}</span></p>}
                  {q.question_type === 'fill_blank' && q.correct_answer && <p className="text-xs text-gray-700 whitespace-pre-wrap"><strong>Answer key:</strong> {q.correct_answer}</p>}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => { setPreviewQuestions(null); setPreviewSource(''); }} disabled={uploading} className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50">Cancel</button>
              <button onClick={confirmPreviewImport} disabled={uploading} className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                {uploading ? <><i className="fas fa-spinner fa-spin"></i> Importing...</> : <><i className="fas fa-file-import"></i> Import {previewQuestions.length} Question(s)</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormGroup({ label, required, icon, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {icon && <i className={`fas ${icon} mr-2 text-green-800`}></i>}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function StepDot({ num, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${done ? 'bg-green-600 text-white' : active ? 'bg-green-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
        {done ? <i className="fas fa-check"></i> : num}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-green-900' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}

function QuestionRow({ q, idx, onEdit, onDelete }) {
  const typeLabel = { multiple_choice: 'Multiple Choice', true_false: 'True / False', fill_blank: 'Fill in the Blank', short_answer: 'Short Answer', essay: 'Essay', matching: 'Matching' }[q.question_type] || q.question_type;

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">Q{idx + 1}</span>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">{typeLabel}</span>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
          </div>
          <pre className="text-gray-800 font-medium text-sm bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap font-mono">{q.question_text}</pre>
          {q.question_type === 'multiple_choice' && (
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-0.5">
              {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                const opt = q[`option_${letter.toLowerCase()}`]; if (!opt) return null;
                return <li key={letter} className={q.correct_answer === letter ? 'font-bold text-green-700' : ''}>{q.correct_answer === letter ? '✓ ' : '· '}{letter}. {opt}</li>;
              })}
            </ul>
          )}
          {['short_answer', 'true_false', 'fill_blank', 'essay', 'matching'].includes(q.question_type) && (
            <div className="mt-2 ml-4 text-sm bg-green-50 p-3 rounded border border-green-200 whitespace-pre-wrap">
              <span className="font-semibold text-green-800">Answer/Key:</span> <span className="text-gray-700 font-mono">{q.correct_answer || '—'}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center" title="Edit question"><i className="fas fa-edit"></i></button>
          <button onClick={onDelete} className="w-9 h-9 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center" title="Delete question"><i className="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  );
}