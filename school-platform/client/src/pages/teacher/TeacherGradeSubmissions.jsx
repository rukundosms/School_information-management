// src/pages/teacher/TeacherGradeSubmissions.jsx
import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherGradeSubmissions() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Picker list (when no assessmentId in URL)
  const [gradeableAssessments, setGradeableAssessments] = useState([]);

  // Per-submission expand/collapse state
  const [expanded, setExpanded] = useState({});

  // Per-submission marks & feedback
  const [marksState, setMarksState] = useState({});
  const [feedbackState, setFeedbackState] = useState({});
  const [savingId, setSavingId] = useState(null);

  // ============ LOAD ============
  useEffect(() => {
    if (assessmentId) {
      loadData();
    } else {
      loadAssessmentList();
    }
  }, [assessmentId]);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const loadAssessmentList = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/teacher/manage-assessments');
      setGradeableAssessments(data.assessments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/teacher/assessments/${assessmentId}/grade`);
      setAssessment(data.assessment);
      setQuestions(data.questions || []);
      setSubmissions(data.submissions || []);

      const marks = {};
      const feedback = {};
      (data.submissions || []).forEach(sub => {
        marks[sub.submission_id] = {};
        (sub.answers || []).forEach(a => {
          const q = (data.questions || []).find(q => q.question_id === a.qid);
          if (!q) return;
          const existing = a.obtained !== undefined && a.obtained !== null
            ? a.obtained
            : (a.is_correct ? q.marks : 0);
          marks[sub.submission_id][a.qid] = existing;
        });
        feedback[sub.submission_id] = sub.feedback || '';
      });
      setMarksState(marks);
      setFeedbackState(feedback);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ HELPERS ============
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const getTotal = (submissionId) => {
    const row = marksState[submissionId] || {};
    return Object.values(row).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  };

  const handleMarkChange = (submissionId, qid, value, maxMarks) => {
    let v = parseFloat(value);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > maxMarks) v = maxMarks;
    setMarksState(prev => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], [qid]: v },
    }));
  };

  const handleFeedbackChange = (submissionId, value) => {
    setFeedbackState(prev => ({ ...prev, [submissionId]: value }));
  };

  const handleSaveGrades = async (sub) => {
    setSavingId(sub.submission_id);
    try {
      const data = await apiFetch(`/api/teacher/submissions/${sub.submission_id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          marks: marksState[sub.submission_id] || {},
          feedback: feedbackState[sub.submission_id] || '',
        }),
      });
      setSuccess(`Grades saved for ${sub.firstname} ${sub.lastname} — ${data.obtained_marks}/${assessment.total_marks}`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  // ============ RENDER ============

  // Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  // ============ PICKER MODE (no assessmentId) ============
  if (!assessmentId) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Link
              to="/teacher/dashboard"
              className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2"
            >
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
              <i className="fas fa-graduation-cap"></i> Grade Submissions
            </h1>
            <p className="text-gray-600 mt-1">Pick an assessment to grade its submissions</p>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center gap-3">
              <i className="fas fa-exclamation-circle"></i>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="font-bold text-xl">×</button>
            </div>
          )}

          {gradeableAssessments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <i className="fas fa-inbox text-5xl text-gray-300 mb-4 block"></i>
              <p className="text-gray-600 text-lg mb-2">No assessments available to grade.</p>
              <p className="text-gray-400 text-sm mb-6">
                Create an assessment first, then students can submit.
              </p>
              <Link
                to="/teacher/create-assessment"
                className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
              >
                <i className="fas fa-plus"></i> Create Assessment
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gradeableAssessments.map(a => (
                <Link
                  key={a.assessment_id}
                  to={`/teacher/grade-submissions/${a.assessment_id}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 border-l-4 border-green-700"
                >
                  <h3 className="text-lg font-bold text-gray-800">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <i className="fas fa-chalkboard mr-1"></i>{a.class_name}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-500">Total: {a.total_marks} marks</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      a.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      <i className="fas fa-file-alt mr-1"></i>
                      {a.submission_count ?? 0} submission{a.submission_count === 1 ? '' : 's'}
                    </span>
                    <span className="text-green-700 font-semibold text-sm">
                      Grade now <i className="fas fa-arrow-right ml-1"></i>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ NOT FOUND (with assessmentId, but no assessment) ============
  if (!assessment) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center bg-gray-50 min-h-screen">
        <i className="fas fa-exclamation-triangle text-5xl text-yellow-500 mb-4 block"></i>
        <p className="text-red-600 text-lg mb-4">Assessment not found.</p>
        {error && <p className="text-gray-600 text-sm mb-4">{error}</p>}
        <Link
          to="/teacher/grade-submissions"
          className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i> Back to Assessment List
        </Link>
      </div>
    );
  }

  // ============ GRADING MODE ============
  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <Link
              to="/teacher/grade-submissions"
              className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2"
            >
              <i className="fas fa-arrow-left"></i> All Assessments
            </Link>
            <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
              <i className="fas fa-graduation-cap"></i> Grade Submissions
            </h1>
            <p className="text-gray-600 mt-1">
              <strong>{assessment.title}</strong> · {assessment.class_name} · Total Marks: {assessment.total_marks}
            </p>
          </div>
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

        {/* Empty */}
        {submissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-inbox text-5xl text-gray-300 mb-4 block"></i>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Submissions Yet</h4>
            <p className="text-gray-500 mb-6">No students have submitted this assessment.</p>
            <Link
              to="/teacher/grade-submissions"
              className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i> Back to Assessments
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {submissions.map(sub => {
              const isOpen = !!expanded[sub.submission_id];
              const score = sub.obtained_marks !== null && sub.obtained_marks !== undefined
                ? Number(sub.obtained_marks)
                : sub.auto_score;
              const percent = assessment.total_marks > 0
                ? (score / assessment.total_marks) * 100
                : 0;
              const isGraded = sub.status === 'graded';

              return (
                <div key={sub.submission_id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => toggle(sub.submission_id)}
                    className="w-full bg-gradient-to-r from-green-900 to-green-800 hover:from-green-800 hover:to-green-700 text-white text-left px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-user-graduate"></i>
                        <div>
                          <strong className="text-base">{sub.firstname} {sub.lastname}</strong>
                          <span className="ml-2 text-green-100 text-sm">({sub.reg || 'N/A'})</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className={`px-3 py-1 rounded-full font-semibold ${
                          isGraded ? 'bg-green-200 text-green-900' : 'bg-yellow-200 text-yellow-900'
                        }`}>
                          <i className={`fas ${isGraded ? 'fa-check-circle' : 'fa-clock'} mr-1`}></i>
                          {isGraded ? 'Graded' : 'Pending'}
                        </span>
                        <span className="font-semibold">Score: {score}/{assessment.total_marks}</span>
                        <span className="text-xs">
                          <span className="bg-green-100 text-green-900 px-2 py-0.5 rounded mr-1">
                            ✓ {sub.correct_count} Correct
                          </span>
                          <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded mr-1">
                            ✗ {sub.wrong_count} Wrong
                          </span>
                          {sub.unanswered_count > 0 && (
                            <span className="bg-yellow-100 text-yellow-900 px-2 py-0.5 rounded">
                              ⚬ {sub.unanswered_count} Unanswered
                            </span>
                          )}
                        </span>
                        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-green-950 rounded overflow-hidden">
                      <div className="h-full bg-green-300" style={{ width: `${percent}%` }}></div>
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div className="p-6">
                      <div className="flex flex-wrap justify-between gap-3 mb-4 text-sm text-gray-600">
                        <span>
                          <i className="fas fa-calendar-alt mr-1"></i>
                          Submitted: {new Date(sub.submission_date).toLocaleString()}
                        </span>
                        <span>
                          <i className="fas fa-robot mr-1"></i>
                          Auto-graded Score: <strong>{sub.auto_score}/{assessment.total_marks}</strong>
                        </span>
                      </div>

                      <h5 className="font-bold text-gray-800 mb-3">
                        <i className="fas fa-list-ol mr-1"></i> Student Answers
                      </h5>

                      <div className="space-y-4">
                        {sub.answers.map((answer, idx) => {
                          const q = questions.find(x => x.question_id === answer.qid);
                          if (!q) return null;

                          const studentAnswer = answer.user_answer ?? answer.answer ?? '';
                          const isCorrect = !!answer.is_correct;
                          const hasAnswer = studentAnswer !== '' && studentAnswer !== null;
                          const isAuto = q.question_type === 'multiple_choice' || q.question_type === 'true_false';
                          const currentMark = marksState[sub.submission_id]?.[q.question_id] ?? 0;

                          return (
                            <div key={q.question_id} className="bg-gray-50 border-l-4 border-green-800 rounded-lg p-4">
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <strong>Question {idx + 1} ({q.marks} marks)</strong>
                                {isAuto && (
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    isCorrect
                                      ? 'bg-green-100 text-green-800'
                                      : hasAnswer
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {isCorrect ? '✓ CORRECT' : hasAnswer ? '✗ WRONG' : '⚬ NO ANSWER'}
                                  </span>
                                )}
                              </div>

                              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{q.question_text}</p>

                              {q.question_type === 'multiple_choice' && (
                                <div className="mb-3 text-sm text-gray-700">
                                  {['a', 'b', 'c', 'd'].map(l => q[`option_${l}`] ? (
                                    <div key={l}>{l.toUpperCase()}. {q[`option_${l}`]}</div>
                                  ) : null)}
                                </div>
                              )}

                              <div className="bg-white border rounded p-3 mb-3">
                                <div className="text-xs text-gray-500 mb-1">
                                  <i className="fas fa-user-edit mr-1"></i> Student's Answer:
                                </div>
                                {hasAnswer ? (
                                  <span className={`inline-block px-2 py-0.5 rounded text-sm ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isCorrect ? '✓' : '✗'} {studentAnswer}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-sm bg-red-100 text-red-800">
                                    <i className="fas fa-question-circle mr-1"></i> No answer provided
                                  </span>
                                )}
                              </div>

                              <div className="bg-green-50 border-l-4 border-green-500 rounded p-3 mb-3">
                                <div className="text-xs font-semibold text-green-900 mb-1">
                                  <i className="fas fa-check-double mr-1"></i> Correct Answer:
                                </div>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {q.question_type === 'multiple_choice'
                                    ? `Answer: ${q.correct_answer}`
                                    : q.question_type === 'true_false'
                                    ? `Answer: ${q.correct_answer}`
                                    : q.correct_answer}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <label className="font-semibold text-sm">
                                  <i className="fas fa-star mr-1 text-green-800"></i>
                                  Marks (max {q.marks}):
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={q.marks}
                                  value={currentMark}
                                  onChange={(e) =>
                                    handleMarkChange(sub.submission_id, q.question_id, e.target.value, q.marks)
                                  }
                                  className="w-24 border-2 border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-700"
                                />
                                {isAuto && hasAnswer && (
                                  <span className="text-xs text-gray-500">
                                    Auto-graded: {answer.obtained ?? 0} marks
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-5">
                        <div className="font-bold text-green-900">
                          <i className="fas fa-chart-line mr-2"></i>
                          Total Marks: <span className="text-xl">{getTotal(sub.submission_id).toFixed(1)}</span> / {assessment.total_marks}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          <span className="text-green-700 font-semibold">✓ Correct: {sub.correct_count}</span> ·
                          <span className="text-red-700 font-semibold ml-1">✗ Wrong: {sub.wrong_count}</span>
                          {sub.unanswered_count > 0 && (
                            <span className="text-yellow-700 font-semibold ml-1">
                              · ⚬ Unanswered: {sub.unanswered_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Passing Marks: {assessment.passing_marks} · Status:{' '}
                          {getTotal(sub.submission_id) >= assessment.passing_marks ? (
                            <span className="text-green-700 font-bold">✓ PASS</span>
                          ) : (
                            <span className="text-red-700 font-bold">✗ FAIL</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block font-semibold text-sm text-gray-700 mb-1">
                          <i className="fas fa-comment-dots mr-1"></i> Feedback to Student:
                        </label>
                        <textarea
                          rows="3"
                          value={feedbackState[sub.submission_id] || ''}
                          onChange={(e) => handleFeedbackChange(sub.submission_id, e.target.value)}
                          placeholder="Provide feedback on the student's performance..."
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
                        />
                      </div>

                      <button
                        onClick={() => handleSaveGrades(sub)}
                        disabled={savingId === sub.submission_id}
                        className="mt-4 bg-green-800 hover:bg-green-900 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingId === sub.submission_id ? (
                          <><i className="fas fa-spinner fa-spin"></i> Saving…</>
                        ) : (
                          <><i className="fas fa-save"></i> Save Grades & Submit Feedback</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}