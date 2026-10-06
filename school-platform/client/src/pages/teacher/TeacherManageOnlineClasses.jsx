// src/pages/teacher/TeacherManageOnlineClasses.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherManageOnlineClasses() {
  const navigate = useNavigate();

  // ============ STATE ============
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editModal, setEditModal] = useState({ open: false, class: null });
  const [detailsModal, setDetailsModal] = useState({ open: false, class: null });
  const [attendanceModal, setAttendanceModal] = useState({ open: false, class: null, students: [] });
  const [chatModal, setChatModal] = useState({ open: false, class: null, messages: [] });
  const [waitingRoomModal, setWaitingRoomModal] = useState({ open: false, class: null, students: [] });
  const [assessmentModal, setAssessmentModal] = useState({ open: false, class: null, assessments: [] });

  // Chat
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  // Real-time polling
  const [polling, setPolling] = useState(true);

  // ============ LOAD DATA ============
  useEffect(() => {
    loadClasses();
  }, []);

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(() => {
      loadClasses(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [polling]);

  // Filter classes
  useEffect(() => {
    let filtered = [...classes];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.class_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }

    setFilteredClasses(filtered);
  }, [classes, statusFilter, searchQuery]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatModal.messages]);

  // Auto clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Refresh chat every 3 seconds when open
  useEffect(() => {
    if (!chatModal.open || !chatModal.class) return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/teacher/online-classes/${chatModal.class.class_id}/chat`);
        setChatModal((prev) => ({ ...prev, messages: data.messages || [] }));
      } catch (err) {
        // Silent fail
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [chatModal.open, chatModal.class?.class_id]);

  // Refresh waiting room every 5 seconds when open
  useEffect(() => {
    if (!waitingRoomModal.open || !waitingRoomModal.class) return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/teacher/online-classes/${waitingRoomModal.class.class_id}/waiting-room`);
        setWaitingRoomModal((prev) => ({ ...prev, students: data.students || [] }));
      } catch (err) {
        // Silent fail
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [waitingRoomModal.open, waitingRoomModal.class?.class_id]);

  const loadClasses = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch('/api/teacher/online-classes');
      console.log('🔍 Backend returned classes:', data.classes);
      if (data.classes && data.classes.length > 0) {
        console.log('🔍 First class keys:', Object.keys(data.classes[0]));
      }
      setClasses(data.classes || []);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ============ ACTIONS ============
  const handleStartClass = async (cls) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/start`, { method: 'PUT' });
      setSuccess(`Class "${cls.title}" is now LIVE!`);
      loadClasses();
      // Open the meeting link in a new tab
      if (cls.meeting_link) window.open(cls.meeting_link, '_blank');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEndClass = async (cls) => {
    if (!confirm(`End class "${cls.title}"? Students will no longer be able to join.`)) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}/end`, { method: 'PUT' });
      setSuccess('Class ended successfully');
      loadClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelClass = async (cls) => {
    if (!confirm(`Cancel class "${cls.title}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}`, { method: 'DELETE' });
      setSuccess('Class cancelled');
      loadClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    const cls = editModal.class;
    if (!cls || !cls.class_id) return;

    try {
      await apiFetch(`/api/teacher/online-classes/${cls.class_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: cls.title,
          description: cls.description,
          meeting_link: cls.meeting_link,
          meeting_id: cls.meeting_id,
          meeting_password: cls.meeting_password,
          scheduled_date: cls.scheduled_date,
          start_time: cls.start_time,
          end_time: cls.end_time,
          duration_minutes: cls.duration_minutes
        })
      });
      setSuccess('Class updated successfully');
      setEditModal({ open: false, class: null });
      loadClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenAttendance = async (cls) => {
    try {
      const data = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/attendance`);
      setAttendanceModal({ open: true, class: cls, students: data.attendance || [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenWaitingRoom = async (cls) => {
    try {
      const data = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/waiting-room`);
      setWaitingRoomModal({ open: true, class: cls, students: data.students || [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveStudent = async (student) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${waitingRoomModal.class.class_id}/approve-student`, {
        method: 'POST',
        body: JSON.stringify({ sid: student.sid })
      });
      setSuccess(`${student.firstname} approved to join`);
      setWaitingRoomModal({
        ...waitingRoomModal,
        students: waitingRoomModal.students.filter((s) => s.sid !== student.sid)
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectStudent = async (student) => {
    try {
      await apiFetch(`/api/teacher/online-classes/${waitingRoomModal.class.class_id}/reject-student`, {
        method: 'POST',
        body: JSON.stringify({ sid: student.sid })
      });
      setSuccess(`${student.firstname} rejected`);
      setWaitingRoomModal({
        ...waitingRoomModal,
        students: waitingRoomModal.students.filter((s) => s.sid !== student.sid)
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenChat = async (cls) => {
    try {
      const data = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/chat`);
      setChatModal({ open: true, class: cls, messages: data.messages || [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatModal.class) return;

    try {
      await apiFetch(`/api/teacher/online-classes/${chatModal.class.class_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() })
      });
      setNewMessage('');
      // Refresh messages
      const data = await apiFetch(`/api/teacher/online-classes/${chatModal.class.class_id}/chat`);
      setChatModal({ ...chatModal, messages: data.messages || [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenAssessments = async (cls) => {
    try {
      const data = await apiFetch(`/api/teacher/online-classes/${cls.class_id}/assessments`);
      setAssessmentModal({ open: true, class: cls, assessments: data.assessments || [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendAssessment = async (assessment) => {
    if (!confirm(`Send assessment "${assessment.title}" to all students in this class?`)) return;
    try {
      await apiFetch(`/api/teacher/online-classes/${assessmentModal.class.class_id}/send-assessment`, {
        method: 'POST',
        body: JSON.stringify({ assessment_id: assessment.assessment_id })
      });
      setSuccess('Assessment sent to all students');
    } catch (err) {
      setError(err.message);
    }
  };

  // ============ HELPERS ============
  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-green-100 text-green-800 border border-green-300',
      live: 'bg-orange-100 text-orange-800 border border-orange-300 animate-pulse',
      ongoing: 'bg-orange-100 text-orange-800 border border-orange-300 animate-pulse',
      completed: 'bg-blue-100 text-blue-800 border border-blue-300',
      cancelled: 'bg-red-100 text-red-800 border border-red-300'
    };
    const labels = {
      scheduled: 'Scheduled',
      live: '🔴 LIVE',
      ongoing: '🔴 LIVE',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const isUpcoming = (cls) => {
    if (!cls.scheduled_date || !cls.start_time) return false;
    const classDateTime = new Date(`${cls.scheduled_date}T${cls.start_time}`);
    const now = new Date();
    const diffHours = (classDateTime - now) / (1000 * 60 * 60);
    return diffHours > -1 && diffHours < 24;
  };

  const getStats = () => ({
    total: classes.length,
    scheduled: classes.filter((c) => c.status === 'scheduled').length,
    live: classes.filter((c) => c.status === 'live' || c.status === 'ongoing').length,
    completed: classes.filter((c) => c.status === 'completed').length,
    cancelled: classes.filter((c) => c.status === 'cancelled').length,
    today: classes.filter((c) => c.scheduled_date === new Date().toISOString().split('T')[0]).length
  });

  const stats = getStats();

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-60px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
        <div>
          <Link to="/teacher/dashboard" className="text-sm font-semibold text-green-700 hover:underline inline-flex items-center gap-1 mb-3">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-green-900 flex items-center gap-3">
            <i className="fas fa-calendar-alt"></i>
            Manage Online Classes
          </h1>
          <p className="text-gray-600 mt-1">Interactive face-to-face class management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPolling(!polling)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              polling ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            title={polling ? 'Live updates ON' : 'Live updates OFF'}
          >
            <i className={`fas fa-${polling ? 'sync fa-spin' : 'pause'} mr-2`}></i>
            {polling ? 'Live' : 'Paused'}
          </button>
          <Link
            to="/teacher/schedule-class"
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <i className="fas fa-plus"></i> New Class
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-3">
          <i className="fas fa-check-circle"></i>
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="font-bold text-xl">×</button>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-4 flex items-center gap-3">
          <i className="fas fa-exclamation-circle"></i>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="font-bold text-xl">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} icon="fa-list" color="blue" />
        <StatCard label="Today" value={stats.today} icon="fa-calendar-day" color="purple" />
        <StatCard label="Scheduled" value={stats.scheduled} icon="fa-clock" color="green" />
        <StatCard label="Live Now" value={stats.live} icon="fa-broadcast-tower" color="orange" pulse />
        <StatCard label="Completed" value={stats.completed} icon="fa-check-circle" color="teal" />
        <StatCard label="Cancelled" value={stats.cancelled} icon="fa-times-circle" color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'scheduled', 'ongoing', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                statusFilter === s
                  ? 'bg-green-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'ongoing' ? '🔴 Live' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Classes List */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <i className="fas fa-calendar-alt text-5xl text-gray-300 mb-4 block"></i>
          <p className="text-gray-600 text-lg mb-2">
            {classes.length === 0 ? 'No online classes scheduled yet' : 'No classes match your filter'}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {classes.length === 0 ? 'Schedule your first online class to get started' : 'Try adjusting your filters'}
          </p>
          {classes.length === 0 && (
            <Link to="/teacher/schedule-class" className="bg-green-800 hover:bg-green-900 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2">
              <i className="fas fa-plus"></i> Schedule a Class
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClasses.map((cls) => (
            <ClassCard
              key={cls.class_id}
              cls={cls}
              isUpcoming={isUpcoming(cls)}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              formatTime={formatTime}
              onStart={() => handleStartClass(cls)}
              onEnd={() => handleEndClass(cls)}
              onCancel={() => handleCancelClass(cls)}
              onEdit={() => setEditModal({ open: true, class: { ...cls } })}
              onDetails={() => setDetailsModal({ open: true, class: cls })}
              onAttendance={() => handleOpenAttendance(cls)}
              onWaitingRoom={() => handleOpenWaitingRoom(cls)}
              onChat={() => handleOpenChat(cls)}
              onAssessments={() => handleOpenAssessments(cls)}
            />
          ))}
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Edit Modal */}
      {editModal.open && editModal.class && (
        <Modal title="Edit Class" onClose={() => setEditModal({ open: false, class: null })}>
          <form onSubmit={handleUpdateClass} className="space-y-4">
            <Input
              label="Title"
              value={editModal.class.title}
              onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, title: v } })}
              required
            />
            <TextArea
              label="Description"
              value={editModal.class.description}
              onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, description: v } })}
            />
            <Input
              label="Meeting Link"
              value={editModal.class.meeting_link}
              onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, meeting_link: v } })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={editModal.class.scheduled_date}
                onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, scheduled_date: v } })}
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={editModal.class.duration_minutes}
                onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, duration_minutes: v } })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                value={editModal.class.start_time}
                onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, start_time: v } })}
                required
              />
              <Input
                label="End Time"
                type="time"
                value={editModal.class.end_time}
                onChange={(v) => setEditModal({ ...editModal, class: { ...editModal.class, end_time: v } })}
                required
              />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button type="button" onClick={() => setEditModal({ open: false, class: null })} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="bg-green-800 hover:bg-green-900 text-white px-6 py-2 rounded-lg font-semibold">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {detailsModal.open && detailsModal.class && (
        <Modal title="Class Details" onClose={() => setDetailsModal({ open: false, class: null })}>
          <div className="space-y-3">
            <DetailRow label="Title" value={detailsModal.class.title} />
            <DetailRow label="Class" value={detailsModal.class.class_name} />
            <DetailRow label="Description" value={detailsModal.class.description || 'N/A'} />
            <DetailRow label="Date" value={formatDate(detailsModal.class.scheduled_date)} />
            <DetailRow label="Time" value={`${formatTime(detailsModal.class.start_time)} - ${formatTime(detailsModal.class.end_time)}`} />
            <DetailRow label="Duration" value={detailsModal.class.duration_minutes ? `${detailsModal.class.duration_minutes} min` : 'N/A'} />
            <DetailRow label="Status" value={detailsModal.class.status} />
            <DetailRow label="Meeting ID" value={detailsModal.class.meeting_id || 'N/A'} />
            <DetailRow label="Password" value={detailsModal.class.meeting_password || 'N/A'} />
            <div className="pt-3 border-t">
              <a
                href={detailsModal.class.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-green-800 hover:bg-green-900 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <i className="fas fa-external-link-alt"></i> Open Meeting Link
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Attendance Modal */}
      {attendanceModal.open && (
        <Modal title={`Attendance - ${attendanceModal.class.title}`} onClose={() => setAttendanceModal({ open: false, class: null, students: [] })}>
          {attendanceModal.students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-user-clock text-4xl mb-3 block"></i>
              <p>No attendance recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-2 font-semibold">Student</th>
                    <th className="text-left p-2 font-semibold">Joined</th>
                    <th className="text-left p-2 font-semibold">Left</th>
                    <th className="text-left p-2 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceModal.students.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{s.firstname} {s.lastname}</td>
                      <td className="p-2">{s.joined_at ? new Date(s.joined_at).toLocaleTimeString() : '-'}</td>
                      <td className="p-2">{s.left_at ? new Date(s.left_at).toLocaleTimeString() : 'Still in class'}</td>
                      <td className="p-2">{s.duration_minutes ? `${s.duration_minutes} min` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Waiting Room Modal */}
      {waitingRoomModal.open && (
        <Modal title={`Waiting Room - ${waitingRoomModal.class.title}`} onClose={() => setWaitingRoomModal({ open: false, class: null, students: [] })}>
          <p className="text-sm text-gray-600 mb-4">
            <i className="fas fa-info-circle text-blue-500 mr-1"></i>
            Approve students to allow them to join the class
          </p>
          {waitingRoomModal.students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-users text-4xl mb-3 block"></i>
              <p>No students waiting</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingRoomModal.students.map((s) => (
                <div key={s.sid} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{s.firstname} {s.lastname}</p>
                    <p className="text-xs text-gray-500">Reg: {s.reg || 'N/A'} · Waiting {s.minutes_waiting || 0} min</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveStudent(s)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1"
                    >
                      <i className="fas fa-check"></i> Approve
                    </button>
                    <button
                      onClick={() => handleRejectStudent(s)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1"
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Chat Modal */}
      {chatModal.open && (
        <Modal title={`Live Chat - ${chatModal.class.title}`} onClose={() => setChatModal({ open: false, class: null, messages: [] })}>
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-3 bg-gray-50 rounded-lg p-3 mb-3">
              {chatModal.messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <i className="fas fa-comments text-3xl mb-2 block"></i>
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatModal.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.is_teacher ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-2 ${
                      msg.is_teacher ? 'bg-green-600 text-white' : 'bg-white border'
                    }`}>
                      <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-[10px] mt-1 opacity-75">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg font-semibold"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Assessment Modal */}
      {assessmentModal.open && (
        <Modal title={`Send Assessment - ${assessmentModal.class.title}`} onClose={() => setAssessmentModal({ open: false, class: null, assessments: [] })}>
          {assessmentModal.assessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-tasks text-4xl mb-3 block"></i>
              <p>No assessments available</p>
              <Link to="/teacher/create-assessment" className="text-green-700 hover:underline text-sm mt-2 inline-block">
                Create one now →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assessmentModal.assessments.map((a) => (
                <div key={a.assessment_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {a.questions_count || 0} questions · {a.duration_minutes || 0} min · {a.total_marks || 0} marks
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendAssessment(a)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                  >
                    <i className="fas fa-paper-plane mr-1"></i> Send
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function StatCard({ label, value, icon, color, pulse }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100',
    teal: 'text-teal-600 bg-teal-100',
  };
  return (
    <div className={`bg-white rounded-xl shadow-md p-4 ${pulse && value > 0 ? 'ring-2 ring-orange-400' : ''}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ClassCard({ cls, isUpcoming, getStatusBadge, formatDate, formatTime, onStart, onEnd, onCancel, onEdit, onDetails, onAttendance, onWaitingRoom, onChat, onAssessments }) {
  const isLive = cls.status === 'live' || cls.status === 'ongoing';
  const isScheduled = cls.status === 'scheduled';
  const isCompleted = cls.status === 'completed';
  const isCancelled = cls.status === 'cancelled';

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden ${
      isLive ? 'ring-2 ring-orange-500' : ''
    } ${isUpcoming && isScheduled ? 'border-l-4 border-yellow-500' : ''}`}>
      {/* Live Banner */}
      {isLive && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
            CLASS IS LIVE NOW
          </span>
          <button onClick={onEnd} className="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-100">
            End Class
          </button>
        </div>
      )}

      <div className="p-5">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          {/* Left: Title and Info */}
          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-xl font-bold text-gray-800">{cls.title}</h3>
              {getStatusBadge(cls.status)}
              {isUpcoming && isScheduled && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                  <i className="fas fa-bell mr-1"></i> Soon
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <i className="fas fa-chalkboard text-green-700 mr-1"></i>
              {cls.class_name} {cls.class_code && `(${cls.class_code})`}
            </p>
            {cls.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{cls.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span><i className="far fa-calendar text-green-700 mr-1"></i> {formatDate(cls.scheduled_date)}</span>
              <span><i className="far fa-clock text-green-700 mr-1"></i> {formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
              {cls.duration_minutes && (
                <span><i className="fas fa-hourglass-half text-green-700 mr-1"></i> {cls.duration_minutes} min</span>
              )}
            </div>
          </div>

          {/* Right: Main Action Buttons */}
          <div className="flex flex-col gap-2 min-w-[140px]">
            {isScheduled && (
              <>
                <button onClick={onStart} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <i className="fas fa-play"></i> Start Class
                </button>
                <button onClick={onCancel} className="border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm">
                  <i className="fas fa-times"></i> Cancel
                </button>
              </>
            )}
            {isLive && (
              <a href={cls.meeting_link} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2">
                <i className="fas fa-door-open"></i> Rejoin
              </a>
            )}
            {(isCompleted || isCancelled) && (
              <button onClick={onDetails} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm">
                <i className="fas fa-eye"></i> View Details
              </button>
            )}
          </div>
        </div>

        {/* Bottom: Management Toolbar */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <ToolbarButton icon="fa-users" label="Waiting Room" color="blue" onClick={onWaitingRoom} disabled={!isLive && !isScheduled} />
          <ToolbarButton icon="fa-user-check" label="Attendance" color="purple" onClick={onAttendance} />
          <ToolbarButton icon="fa-comments" label="Chat" color="green" onClick={onChat} disabled={!isLive} />
          <ToolbarButton icon="fa-tasks" label="Assessments" color="orange" onClick={onAssessments} disabled={!isLive} />
          <ToolbarButton icon="fa-edit" label="Edit" color="gray" onClick={onEdit} disabled={!isScheduled} />
          <ToolbarButton icon="fa-info-circle" label="Details" color="gray" onClick={onDetails} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, label, color, onClick, disabled }) {
  const colors = {
    blue: 'text-blue-700 hover:bg-blue-50 border-blue-200',
    green: 'text-green-700 hover:bg-green-50 border-green-200',
    orange: 'text-orange-700 hover:bg-orange-50 border-orange-200',
    purple: 'text-purple-700 hover:bg-purple-50 border-purple-200',
    gray: 'text-gray-700 hover:bg-gray-50 border-gray-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
        disabled ? 'opacity-40 cursor-not-allowed' : colors[color]
      }`}
    >
      <i className={`fas ${icon}`}></i> {label}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-2xl">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows="3"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}