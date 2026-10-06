// src/pages/teacher/TeacherScheduleClass.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function TeacherScheduleClass() {
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Form state
  const [form, setForm] = useState({
    cid: '',
    title: '',
    description: '',
    meeting_link: '',
    meeting_id: '',
    meeting_password: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration: ''
  });

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadClasses();
  }, []);

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

  // Auto-calculate duration
  useEffect(() => {
    if (form.start_time && form.end_time) {
      const start = new Date(`2000-01-01 ${form.start_time}`);
      const end = new Date(`2000-01-01 ${form.end_time}`);
      const diffMinutes = Math.round((end - start) / 60000);
      
      if (diffMinutes > 0) {
        setForm((prev) => ({ ...prev, duration: diffMinutes.toString() }));
      } else {
        setForm((prev) => ({ ...prev, duration: '' }));
      }
    }
  }, [form.start_time, form.end_time]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.cid) errors.cid = 'Please select a class';
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.meeting_link.trim()) errors.meeting_link = 'Meeting link is required';
    
    // Validate URL format
    if (form.meeting_link && !/^https?:\/\/.+/.test(form.meeting_link)) {
      errors.meeting_link = 'Please enter a valid URL starting with http:// or https://';
    }
    
    if (!form.scheduled_date) errors.scheduled_date = 'Date is required';
    if (!form.start_time) errors.start_time = 'Start time is required';
    if (!form.end_time) errors.end_time = 'End time is required';
    
    // Validate date is not in past
    if (form.scheduled_date && form.scheduled_date < today) {
      errors.scheduled_date = 'Date cannot be in the past';
    }
    
    // Validate end time > start time
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      errors.end_time = 'End time must be after start time';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      const payload = {
        cid: parseInt(form.cid),
        title: form.title.trim(),
        description: form.description.trim(),
        meeting_link: form.meeting_link.trim(),
        meeting_id: form.meeting_id.trim() || null,
        meeting_password: form.meeting_password.trim() || null,
        scheduled_date: form.scheduled_date,
        start_time: form.start_time,
        end_time: form.end_time,
        duration_minutes: form.duration ? parseInt(form.duration) : null
      };

      const response = await apiFetch('/api/teacher/schedule-class', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok !== false) {
        setSuccess('Online class scheduled successfully!');
        // Reset form
        setForm({
          cid: '',
          title: '',
          description: '',
          meeting_link: '',
          meeting_id: '',
          meeting_password: '',
          scheduled_date: '',
          start_time: '',
          end_time: '',
          duration: ''
        });
        setFieldErrors({});
        
        // Redirect to manage classes after 2 seconds
        setTimeout(() => {
          navigate('/teacher/manage-online-classes');
        }, 2000);
      } else {
        setError(response.message || 'Failed to schedule class');
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      cid: '',
      title: '',
      description: '',
      meeting_link: '',
      meeting_id: '',
      meeting_password: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      duration: ''
    });
    setFieldErrors({});
    setError('');
    setSuccess('');
  };

  // Generate a Google Meet-style placeholder
  const generateMeetingPlaceholder = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randomStr = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${randomStr()}-${randomStr()}-${randomStr()}`;
  };

  const hasClasses = classes.length > 0;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
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
          <p className="text-gray-600 mt-1">Create a new online class session for your students</p>
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

        {/* Warning: No Classes */}
        {!loadingClasses && !hasClasses && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <i className="fas fa-exclamation-triangle text-lg mt-0.5"></i>
              <div>
                <p className="font-semibold">No classes assigned</p>
                <p className="text-sm mt-1">
                  You don't have any classes assigned. Please contact the administrator 
                  to assign you to classes before scheduling online sessions.
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Class Selection */}
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
                      {cls.class_name} ({cls.class_code}) - Level {cls.level}
                    </option>
                  ))}
                </select>
                {fieldErrors.cid && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.cid}</p>
                )}
              </div>

              {/* Class Title */}
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-2">
                  Class Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Mathematics Lesson 1: Algebra"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    fieldErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {fieldErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>
                )}
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
                  placeholder="Describe what will be covered in this class..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                ></textarea>
                <p className="text-xs text-gray-400 mt-1">
                  {form.description.length}/500 characters
                </p>
              </div>

              {/* Meeting Link */}
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
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleChange('meeting_link', generateMeetingPlaceholder())}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                    title="Generate sample Google Meet link"
                  >
                    <i className="fas fa-magic"></i>
                  </button>
                </div>
                {fieldErrors.meeting_link && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.meeting_link}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Supported: Google Meet, Zoom, Microsoft Teams, or any valid URL
                </p>
              </div>

              {/* Meeting ID and Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    value={form.meeting_id}
                    onChange={(e) => handleChange('meeting_id', e.target.value)}
                    placeholder="Optional: Meeting ID"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Meeting Password
                  </label>
                  <input
                    type="text"
                    value={form.meeting_password}
                    onChange={(e) => handleChange('meeting_password', e.target.value)}
                    placeholder="Optional: Password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-2">
                  Scheduled Date <span className="text-red-500">*</span>
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

              {/* Start and End Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Start Time <span className="text-red-500">*</span>
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
                    End Time <span className="text-red-500">*</span>
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

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="Auto-calculated from start and end times"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {form.duration && (
                  <p className="text-xs text-green-600 mt-1">
                    <i className="fas fa-clock mr-1"></i>
                    Class duration: {form.duration} minutes
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting || !hasClasses}
                  className={`flex-1 bg-green-800 hover:bg-green-900 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 ${
                    submitting || !hasClasses ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calendar-check"></i>
                      Schedule Class
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <i className="fas fa-redo"></i>
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tips Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <i className="fas fa-lightbulb"></i> Tips for Online Classes
          </h3>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Test your meeting link before sharing it with students</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Schedule classes at least 30 minutes in advance</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Include a clear title and description so students know what to expect</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fas fa-check-circle text-blue-600 mt-0.5"></i>
              <span>Use Google Meet, Zoom, or Microsoft Teams for the best experience</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}