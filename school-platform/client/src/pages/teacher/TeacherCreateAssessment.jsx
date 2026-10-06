// src/pages/teacher/TeacherCreateAssessment.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherCreateAssessment() {
  const navigate = useNavigate();
  const { assessmentId: paramAssessmentId } = useParams();

  // ============ WIZARD STATE ============
  // step: 1 = assessment details, 2 = add questions
  const [step, setStep] = useState(paramAssessmentId ? 2 : 1);
  const [assessmentId, setAssessmentId] = useState(paramAssessmentId ? parseInt(paramAssessmentId) : null);

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1 form
  const [form, setForm] = useState({
    cid: '',
    title: '',
    description: '',
    assessment_type: 'quiz',
    total_marks: '',
    passing_marks: '',
    duration: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '17:00',
    instructions: '',
    allow_late: false,
    show_results: true,
  });

  // Step 2 state
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(emptyQuestion());
  const [editingId, setEditingId] = useState(null);
  const [assessmentMeta, setAssessmentMeta] = useState(null);

  // Default dates
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm((f) => ({
      ...f,
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0],
    }));
  }, []);

  // Load classes (needed for step 1)
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/assessment-classes');
        setClasses(data.classes || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  // If we opened with an assessmentId URL param, load it
  useEffect(() => {
    if (!paramAssessmentId) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/teacher/assessments/${paramAssessmentId}`);
        setAssessmentMeta(data.assessment);
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [paramAssessmentId]);

  // ============ HELPERS ============
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  function emptyQuestion() {
    return {
      question_type: 'multiple_choice',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      marks: 1,
    };
  }

  const resetQuestion = () => {
    setCurrentQuestion(emptyQuestion());
    setEditingId(null);
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion((q) => ({ ...q, [field]: value }));
  };

  // ============ STEP 1: CREATE ASSESSMENT ============
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const startDt = new Date(`${form.start_date}T${form.start_time}`);
    const endDt = new Date(`${form.end_date}T${form.end_time}`);
    if (endDt <= startDt) {
      setError('End date and time must be after start date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch('/api/teacher/create-assessment', {
        method: 'POST',
        body: JSON.stringify({
          cid: form.cid,
          title: form.title,
          description: form.description,
          assessment_type: form.assessment_type,
          total_marks: form.total_marks,
          passing_marks: form.passing_marks,
          duration_minutes: form.duration || null,
          start_date: form.start_date,
          start_time: form.start_time,
          end_date: form.end_date,
          end_time: form.end_time,
          instructions: form.instructions,
          allow_late_submission: form.allow_late,
          show_results_immediately: form.show_results,
        }),
      });

      setAssessmentId(data.assessment_id);
      setAssessmentMeta({
        assessment_id: data.assessment_id,
        title: form.title,
        total_marks: form.total_marks,
        assessment_type: form.assessment_type,
      });
      setSuccess('Assessment created! Now add questions below.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ STEP 2: ADD QUESTION ============
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentQuestion.question_text.trim()) {
      setError('Question text is required');
      return;
    }
    if (!currentQuestion.marks || parseInt(currentQuestion.marks) < 1) {
      setError('Marks must be at least 1');
      return;
    }
    if (currentQuestion.question_type === 'multiple_choice') {
      if (!currentQuestion.option_a || !currentQuestion.option_b) {
        setError('Options A and B are required for multiple choice');
        return;
      }
      if (!currentQuestion.correct_answer) {
        setError('Correct answer is required');
        return;
      }
    }
    if (currentQuestion.question_type === 'true_false' && !currentQuestion.correct_answer) {
      setError('Correct answer (True/False) is required');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch(`/api/teacher/assessments/${assessmentId}/questions`, {
        method: 'POST',
        body: JSON.stringify(currentQuestion),
      });

      setQuestions((prev) => [
        ...prev,
        { ...currentQuestion, question_id: data.question_id },
      ]);
      setSuccess('Question added!');
      resetQuestion();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ STEP 2: DELETE QUESTION ============
  const handleDeleteQuestion = async (qid) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiFetch(`/api/teacher/assessment-questions/${qid}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q.question_id !== qid));
      setSuccess('Question deleted');
    } catch (err) {
      setError(err.message);
    }
  };

  // ============ STEP 2: EDIT QUESTION ============
  const handleEditQuestion = (q) => {
    setCurrentQuestion({
      question_type: q.question_type,
      question_text: q.question_text,
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || '',
      marks: q.marks || 1,
    });
    setEditingId(q.question_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============ STEP 2: PUBLISH ============
  const handlePublish = async () => {
    if (questions.length === 0) {
      setError('Add at least one question before publishing');
      return;
    }
    if (!confirm(`Publish this assessment with ${questions.length} question(s)? Students will be able to see it.`)) return;

    try {
      await apiFetch(`/api/teacher/assessments/${assessmentId}/publish`, { method: 'PUT' });
      setSuccess('Assessment published!');
      setTimeout(() => navigate('/teacher/manage-assessments'), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFinishLater = () => {
    navigate('/teacher/manage-assessments');
  };

  const totalQuestionMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0);

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
      <div className="max-w-4xl mx-auto">

        {/* Progress stepper */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StepDot num={1} label="Assessment Details" active={step === 1} done={step > 1} />
            <div className={`h-1 w-12 ${step > 1 ? 'bg-green-600' : 'bg-gray-200'} rounded`} />
            <StepDot num={2} label="Add Questions" active={step === 2} done={false} />
          </div>
          {step === 2 && (
            <button
              onClick={handleFinishLater}
              className="text-sm text-gray-600 hover:text-gray-900 font-semibold"
            >
              <i className="fas fa-save mr-1"></i> Save & Exit
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center gap-3">
            <i className="fas fa-exclamation-circle"></i>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold text-xl">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-3">
            <i className="fas fa-check-circle"></i>
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess('')} className="font-bold text-xl">×</button>
          </div>
        )}

        {/* ========== STEP 1: CREATE ASSESSMENT ========== */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-900 to-green-800 text-white px-8 py-6">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <i className="fas fa-plus-circle"></i> Create New Assessment
              </h2>
              <p className="text-green-100 mt-2">Step 1 of 2 — Set the rules & schedule</p>
            </div>

            <div className="p-8">
              {!loadingClasses && classes.length === 0 && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-6">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  No classes assigned. Contact administrator.
                </div>
              )}

              <form onSubmit={handleCreateAssessment} className="space-y-6">
                <FormGroup label="Select Class" required icon="fa-chalkboard">
                  <select
                    value={form.cid}
                    onChange={(e) => update('cid', e.target.value)}
                    required
                    disabled={classes.length === 0}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700 disabled:bg-gray-100"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.cid} value={c.cid}>
                        {c.class_name} (ID: {c.cid})
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="Assessment Title" required icon="fa-heading">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    required
                    placeholder="e.g., Mid-Term Examination 2024"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                  />
                </FormGroup>

                <FormGroup label="Description" icon="fa-align-left">
                  <textarea
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    rows={3}
                    placeholder="Describe what this assessment covers..."
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                  />
                </FormGroup>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Assessment Type" required icon="fa-tag">
                    <select
                      value={form.assessment_type}
                      onChange={(e) => update('assessment_type', e.target.value)}
                      required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    >
                      <option value="quiz">📝 Quiz</option>
                      <option value="assignment">📚 Assignment</option>
                      <option value="exam">📖 Exam</option>
                      <option value="project">🎯 Project</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Duration (minutes)" icon="fa-clock">
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => update('duration', e.target.value)}
                      min="0"
                      placeholder="Optional"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Total Marks" required icon="fa-star">
                    <input
                      type="number"
                      value={form.total_marks}
                      onChange={(e) => update('total_marks', e.target.value)}
                      required
                      min="1"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    />
                  </FormGroup>
                  <FormGroup label="Passing Marks" required icon="fa-check-circle">
                    <input
                      type="number"
                      value={form.passing_marks}
                      onChange={(e) => update('passing_marks', e.target.value)}
                      required
                      min="0"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="Start Date" required icon="fa-calendar">
                    <input type="date" value={form.start_date}
                      onChange={(e) => update('start_date', e.target.value)} required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <FormGroup label="Start Time" required icon="fa-clock">
                    <input type="time" value={form.start_time}
                      onChange={(e) => update('start_time', e.target.value)} required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup label="End Date" required icon="fa-calendar-check">
                    <input type="date" value={form.end_date}
                      onChange={(e) => update('end_date', e.target.value)} required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                  <FormGroup label="End Time" required icon="fa-clock">
                    <input type="time" value={form.end_time}
                      onChange={(e) => update('end_time', e.target.value)} required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700" />
                  </FormGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Allow Late Submission
                    </label>
                    <div className="flex items-center gap-3">
                      <Toggle checked={form.allow_late} onChange={(v) => update('allow_late', v)} />
                      <span>Yes, allow late submissions</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Show Results Immediately
                    </label>
                    <div className="flex items-center gap-3">
                      <Toggle checked={form.show_results} onChange={(v) => update('show_results', v)} />
                      <span>Show scores after submission</span>
                    </div>
                  </div>
                </div>

                <FormGroup label="Instructions" icon="fa-info-circle">
                  <textarea
                    value={form.instructions}
                    onChange={(e) => update('instructions', e.target.value)}
                    rows={4}
                    placeholder="Provide instructions for students..."
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                  />
                </FormGroup>

                <button
                  type="submit"
                  disabled={classes.length === 0 || submitting}
                  className="w-full bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white py-4 rounded-lg text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Creating...</>
                  ) : (
                    <><i className="fas fa-arrow-right"></i> Continue to Add Questions</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========== STEP 2: ADD QUESTIONS ========== */}
        {step === 2 && (
          <>
            {/* Assessment summary */}
            <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Creating assessment</p>
                  <h2 className="text-2xl font-bold text-green-900">
                    {assessmentMeta?.title || form.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {questions.length} question{questions.length !== 1 ? 's' : ''} ·{' '}
                    {totalQuestionMarks} / {assessmentMeta?.total_marks || form.total_marks || '—'} marks
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Type: <span className="font-semibold capitalize">{assessmentMeta?.assessment_type || form.assessment_type}</span></p>
                </div>
              </div>
            </div>

            {/* Question form */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-green-900 to-green-800 text-white px-8 py-5">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <i className={editingId ? 'fas fa-edit' : 'fas fa-plus-circle'}></i>
                  {editingId ? 'Edit Question' : 'Add New Question'}
                </h3>
                <p className="text-green-100 text-sm mt-1">Step 2 of 2 — Build your question bank</p>
              </div>

              <form onSubmit={handleAddQuestion} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormGroup label="Question Type" required icon="fa-list">
                    <select
                      value={currentQuestion.question_type}
                      onChange={(e) => {
                        handleQuestionChange('question_type', e.target.value);
                        handleQuestionChange('correct_answer', '');
                      }}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="essay">Essay</option>
                    </select>
                  </FormGroup>

                  <FormGroup label="Marks" required icon="fa-star">
                    <input
                      type="number"
                      value={currentQuestion.marks}
                      onChange={(e) => handleQuestionChange('marks', e.target.value)}
                      min="1"
                      required
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    />
                  </FormGroup>

                  <div className="flex items-end">
                    <span className="text-sm text-gray-500">
                      Running total: <strong>{totalQuestionMarks}</strong> marks
                    </span>
                  </div>
                </div>

                <FormGroup label="Question Text" required icon="fa-question-circle">
                  <textarea
                    value={currentQuestion.question_text}
                    onChange={(e) => handleQuestionChange('question_text', e.target.value)}
                    rows={3}
                    required
                    placeholder="Type your question here..."
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                  />
                </FormGroup>

                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-700">
                      Options (select the correct one)
                    </p>
                    {['a', 'b', 'c', 'd'].map((letter) => (
                      <div key={letter} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correct_answer"
                          value={letter.toUpperCase()}
                          checked={currentQuestion.correct_answer === letter.toUpperCase()}
                          onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                          className="w-5 h-5 text-green-700 focus:ring-green-500"
                        />
                        <span className="font-bold text-gray-700 w-6">{letter.toUpperCase()}.</span>
                        <input
                          type="text"
                          value={currentQuestion[`option_${letter}`]}
                          onChange={(e) => handleQuestionChange(`option_${letter}`, e.target.value)}
                          placeholder={`Option ${letter.toUpperCase()}`}
                          className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {currentQuestion.question_type === 'true_false' && (
                  <FormGroup label="Correct Answer" required icon="fa-check">
                    <div className="flex gap-4">
                      {['True', 'False'].map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tf_answer"
                            value={v}
                            checked={currentQuestion.correct_answer === v}
                            onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                            className="w-5 h-5 text-green-700"
                          />
                          <span className="font-semibold">{v}</span>
                        </label>
                      ))}
                    </div>
                  </FormGroup>
                )}

                {(currentQuestion.question_type === 'short_answer' ||
                  currentQuestion.question_type === 'essay') && (
                  <FormGroup label="Expected Answer / Keywords" icon="fa-key">
                    <textarea
                      value={currentQuestion.correct_answer}
                      onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                      rows={2}
                      placeholder="Optional — for reference when grading"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-700"
                    />
                  </FormGroup>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetQuestion}
                      className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                    ) : (
                      <><i className={editingId ? 'fas fa-save' : 'fas fa-plus'}></i> {editingId ? 'Update Question' : 'Add Question'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Questions list */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-list-ol"></i>
                  Questions ({questions.length})
                </h3>
              </div>

              {questions.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <i className="fas fa-inbox text-4xl mb-3 block"></i>
                  <p>No questions yet. Add your first question above.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {questions.map((q, idx) => (
                    <QuestionRow
                      key={q.question_id || idx}
                      q={q}
                      idx={idx}
                      onEdit={() => handleEditQuestion(q)}
                      onDelete={() => handleDeleteQuestion(q.question_id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Finish actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-wrap gap-3 justify-between items-center">
              <button
                onClick={handleFinishLater}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                <i className="fas fa-save mr-2"></i> Save as Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={questions.length === 0}
                className="bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-paper-plane"></i> Publish Assessment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

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

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-green-800' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StepDot({ num, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          done
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-green-800 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {done ? <i className="fas fa-check"></i> : num}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-green-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function QuestionRow({ q, idx, onEdit, onDelete }) {
  const typeLabel = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True / False',
    short_answer: 'Short Answer',
    essay: 'Essay',
  }[q.question_type] || q.question_type;

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded">
              Q{idx + 1}
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
              {typeLabel}
            </span>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
              {q.marks} mark{q.marks !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-gray-800 font-medium">{q.question_text}</p>

          {q.question_type === 'multiple_choice' && (
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-0.5">
              {['A', 'B', 'C', 'D'].map((letter) => {
                const opt = q[`option_${letter.toLowerCase()}`];
                if (!opt) return null;
                const isCorrect = q.correct_answer === letter;
                return (
                  <li key={letter} className={isCorrect ? 'font-bold text-green-700' : ''}>
                    {isCorrect ? '✓ ' : '· '}
                    {letter}. {opt}
                  </li>
                );
              })}
            </ul>
          )}

          {q.question_type === 'true_false' && (
            <p className="mt-2 text-sm text-gray-600">
              Correct answer: <strong className="text-green-700">{q.correct_answer}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center"
            title="Edit"
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center"
            title="Delete"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
}