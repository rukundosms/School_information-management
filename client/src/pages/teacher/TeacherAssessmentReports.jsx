// src/pages/teacher/TeacherAssessmentReports.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { apiFetch } from '../../api/client';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function TeacherAssessmentReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('class') || '';
  const assessmentId = searchParams.get('assessment') || '';

  const [classes, setClasses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [report, setReport] = useState(null);
  const [performance, setPerformance] = useState([]);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  // Load classes on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/teacher/report-classes');
        setClasses(data.classes || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  // Load assessments when class changes
  useEffect(() => {
    if (!classId) {
      setAssessments([]);
      return;
    }
    (async () => {
      setLoadingAssessments(true);
      try {
        const data = await apiFetch(`/api/teacher/report-assessments/${classId}`);
        setAssessments(data.assessments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingAssessments(false);
      }
    })();
  }, [classId]);

  // Load report OR overall performance based on params
  useEffect(() => {
    if (!classId) {
      setReport(null);
      setPerformance([]);
      return;
    }
    if (assessmentId) {
      loadAssessmentReport(assessmentId);
    } else {
      loadClassPerformance(classId);
    }
  }, [classId, assessmentId]);

  const loadAssessmentReport = async (id) => {
    setLoadingReport(true);
    setError('');
    try {
      const data = await apiFetch(`/api/teacher/report-assessment/${id}`);
      setReport(data);
      setPerformance([]);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const loadClassPerformance = async (cid) => {
    setLoadingReport(true);
    setError('');
    try {
      const data = await apiFetch(`/api/teacher/report-class-performance/${cid}`);
      setPerformance(data.performance || []);
      setReport(null);
    } catch (err) {
      setError(err.message);
      setPerformance([]);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleClassChange = (value) => {
    const params = new URLSearchParams();
    if (value) params.set('class', value);
    setSearchParams(params);
  };

  const handleAssessmentChange = (value) => {
    const params = new URLSearchParams();
    if (classId) params.set('class', classId);
    if (value) params.set('assessment', value);
    setSearchParams(params);
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
            <i className="fas fa-chart-line"></i> Assessment Reports
          </h1>
          <p className="text-gray-600 mt-1">Analyze class and assessment performance</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
                disabled={loadingClasses}
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.cid} value={c.cid}>{c.class_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Assessment
              </label>
              <select
                value={assessmentId}
                onChange={(e) => handleAssessmentChange(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700"
                disabled={!classId || loadingAssessments}
              >
                <option value="">All Assessments</option>
                {assessments.map(a => (
                  <option key={a.assessment_id} value={a.assessment_id}>
                    {a.title} ({a.assessment_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={() => window.print()}
                className="w-full border-2 border-green-800 text-green-800 hover:bg-green-800 hover:text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <i className="fas fa-print mr-2"></i> Print Report
              </button>
            </div>
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

        {/* Loading */}
        {loadingReport && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading report…</p>
            </div>
          </div>
        )}

        {/* Detailed assessment report */}
        {!loadingReport && report && (
          <DetailedReport report={report} />
        )}

        {/* Overall class performance */}
        {!loadingReport && !report && classId && performance.length > 0 && (
          <ClassPerformance performance={performance} classId={classId} />
        )}

        {/* Empty states */}
        {!loadingReport && !report && classId && performance.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-chart-bar text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-600 mb-6">No assessments found for this class.</p>
            <Link to="/teacher/create-assessment" className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2">
              <i className="fas fa-plus"></i> Create Assessment
            </Link>
          </div>
        )}

        {!loadingReport && !classId && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <i className="fas fa-chart-line text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-600">Please select a class to view assessment reports.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function DetailedReport({ report }) {
  const { assessment, statistics, students, distribution } = report;

  const submissionChart = {
    labels: [
      `Graded (${statistics.graded_count})`,
      `Pending Grading (${statistics.pending_grading})`,
      `Not Submitted (${statistics.not_submitted})`,
    ],
    datasets: [{
      data: [
        statistics.graded_count,
        statistics.pending_grading,
        statistics.not_submitted,
      ],
      backgroundColor: ['#4caf50', '#ff9800', '#9e9e9e'],
      borderWidth: 0,
    }],
  };

  const distributionChart = {
    labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
    datasets: [{
      label: 'Number of Students',
      data: distribution,
      backgroundColor: 'rgb(8, 58, 8)',
      borderRadius: 5,
    }],
  };

  return (
    <>
      {/* Assessment header card */}
      <div className="bg-white rounded-xl shadow-md p-5 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h4 className="text-xl font-bold text-gray-800">{assessment.title}</h4>
            <p className="text-gray-600 text-sm mt-1 flex flex-wrap gap-3">
              <span><i className="fas fa-chalkboard mr-1"></i>{assessment.class_name}</span>
              <span><i className="fas fa-tag mr-1"></i>{assessment.assessment_type}</span>
              <span><i className="fas fa-star mr-1"></i>Total: {assessment.total_marks}</span>
              <span><i className="fas fa-check-circle mr-1"></i>Passing: {assessment.passing_marks}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="fa-users" color="green" number={statistics.total_students} label="Total Students" />
        <StatCard icon="fa-check-circle" color="teal" number={statistics.submitted_count} label="Submitted" />
        <StatCard icon="fa-chart-line" color="orange" number={statistics.average_marks} label="Average Marks" />
        <StatCard icon="fa-trophy" color="red" number={`${statistics.passing_rate}%`} label="Passing Rate" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-md p-5">
          <h6 className="font-bold text-gray-700 mb-3">Submission Status</h6>
          <div className="max-h-[300px]">
            <Doughnut data={submissionChart} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5">
          <h6 className="font-bold text-gray-700 mb-3">Score Distribution</h6>
          <div className="max-h-[300px]">
            <Bar
              data={distributionChart}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Student table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h5 className="font-bold text-gray-800">Student Performance Details</h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-900 text-white">
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Student Name</th>
                <th className="text-left px-3 py-2">Reg Number</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Marks</th>
                <th className="text-left px-3 py-2">Percentage</th>
                <th className="text-left px-3 py-2">Grade</th>
                <th className="text-left px-3 py-2">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const gradeColor = s.grade === 'A' ? 'text-green-700'
                  : s.grade === 'B' ? 'text-orange-600'
                  : s.grade ? 'text-red-700' : 'text-gray-400';
                return (
                  <tr key={s.sid} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{s.firstname} {s.lastname}</td>
                    <td className="px-3 py-2">{s.reg || '-'}</td>
                    <td className="px-3 py-2">
                      {s.status === 'graded' ? (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">Graded</span>
                      ) : s.submission_id ? (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">Submitted</span>
                      ) : (
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">Not Submitted</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {s.status === 'graded'
                        ? `${s.obtained_marks} / ${assessment.total_marks}`
                        : s.submission_id ? 'Pending Grading' : '-'}
                    </td>
                    <td className={`px-3 py-2 font-semibold ${gradeColor}`}>
                      {s.percentage !== null ? `${s.percentage}%` : '-'}
                    </td>
                    <td className={`px-3 py-2 font-bold ${gradeColor}`}>
                      {s.grade || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {s.feedback || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ClassPerformance({ performance, classId }) {
  return (
    <>
      <h4 className="text-xl font-bold text-green-900 border-b-2 border-green-900 pb-2 mb-4">
        <i className="fas fa-chart-bar mr-2"></i> Overall Class Performance
      </h4>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-900 text-white">
                <th className="text-left px-3 py-2">Assessment</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Total Marks</th>
                <th className="text-left px-3 py-2">Submissions</th>
                <th className="text-left px-3 py-2">Average</th>
                <th className="text-left px-3 py-2">Highest</th>
                <th className="text-left px-3 py-2">Lowest</th>
                <th className="text-left px-3 py-2">Passing Rate</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {performance.map(p => (
                <tr key={p.assessment_id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold">{p.title}</td>
                  <td className="px-3 py-2 capitalize">{p.assessment_type}</td>
                  <td className="px-3 py-2">{p.total_marks}</td>
                  <td className="px-3 py-2">{p.submissions}</td>
                  <td className="px-3 py-2">{p.avg_marks.toFixed(2)}</td>
                  <td className="px-3 py-2">{p.max_marks}</td>
                  <td className="px-3 py-2">{p.min_marks}</td>
                  <td className="px-3 py-2">
                    <div className="w-full bg-gray-200 rounded h-4 overflow-hidden">
                      <div
                        className="bg-green-600 h-full text-white text-xs flex items-center justify-center"
                        style={{ width: `${p.passing_rate}%` }}
                      >
                        {p.passing_rate}%
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/teacher/assessment-reports?class=${classId}&assessment=${p.assessment_id}`}
                      className="border border-green-800 text-green-800 hover:bg-green-800 hover:text-white px-3 py-1 rounded text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <i className="fas fa-chart-line"></i> View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, color, number, label }) {
  const colors = {
    green: 'text-green-800 bg-green-100',
    teal: 'text-teal-700 bg-teal-100',
    orange: 'text-orange-600 bg-orange-100',
    red: 'text-red-700 bg-red-100',
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-5 text-center">
      <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
      <div className="text-3xl font-bold text-green-900">{number}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}