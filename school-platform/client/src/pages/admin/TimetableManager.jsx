import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const TimetableManager = () => {
  const [viewMode, setViewMode] = useState('teacher');
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [lunch, setLunch] = useState(null);
  const [teacherWorkload, setTeacherWorkload] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('periods');
  const [assignmentData, setAssignmentData] = useState({
    teacherId: '', classId: '', moduleId: '', day: '', period: '', room: ''
  });
  const [tempPeriods, setTempPeriods] = useState([]);
  const [tempBreaks, setTempBreaks] = useState([]);
  const [tempLunch, setTempLunch] = useState({ start: '12:10', end: '13:10' });
  
  const [teacherWorkloadList, setTeacherWorkloadList] = useState([]);
  const [newWorkload, setNewWorkload] = useState({ teacherId: '', classId: '', moduleId: '', periodsPerWeek: 0, periodsPerDay: 0 });
  const [selectedTeacherForSummary, setSelectedTeacherForSummary] = useState(null);
  const [teacherSummary, setTeacherSummary] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);

  // Week Number State
  const [weekNumber, setWeekNumber] = useState(1);

  // Reservations State
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationForm, setReservationForm] = useState({
    day_of_week: 'Monday',
    period_number: 1,
    teacher_id: '',
    class_id: '',
    module_id: '',
    reservation_type: 'SPECIAL',
    description: '',
    is_active: true
  });

  // Weeks State
  const [showWeeksModal, setShowWeeksModal] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    term: 'Term 1',
    trimester_number: 1,
    start_date: '',
    end_date: '',
    is_active: false,
    description: ''
  });
  const [activeWeek, setActiveWeek] = useState(null);

  const navigate = useNavigate();
  const printRef = useRef();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => { checkAuthAndFetchData(); }, []);

  const checkAuthAndFetchData = async () => {
    if (!isAdmin()) { navigate('/login/admin'); return; }
    await fetchAllData();
  };

  const fetchAllData = async () => {
    try {
      const [teachersRes, classesRes, modulesRes, settingsRes, workloadRes] = await Promise.all([
        apiFetch('/api/admin/timetable-teachers'),
        apiFetch('/api/admin/timetable-classes'),
        apiFetch('/api/admin/modules-admin'),
        apiFetch('/api/admin/timetable-settings'),
        apiFetch('/api/admin/teacher-workload')
      ]);
      setTeachers(teachersRes.teachers || []);
      setClasses(classesRes.classes || []);
      setModules(modulesRes.modules || []);
      setTeacherWorkload(workloadRes.workload || []);
      setTeacherWorkloadList(workloadRes.workload || []);
      
      if (settingsRes.periods && settingsRes.periods.length > 0) { setPeriods(settingsRes.periods); setTempPeriods(settingsRes.periods); }
      else { const defaultPeriods = getDefaultPeriods(); setPeriods(defaultPeriods); setTempPeriods(defaultPeriods); }
      if (settingsRes.breaks && settingsRes.breaks.length > 0) { setBreaks(settingsRes.breaks); setTempBreaks(settingsRes.breaks); }
      if (settingsRes.lunch) { setLunch(settingsRes.lunch); setTempLunch(settingsRes.lunch); }
      
      await loadWeeks();
      
      const urlParams = new URLSearchParams(window.location.search);
      const teacherId = urlParams.get('teacher'); const classId = urlParams.get('class');
      if (teacherId) { setSelectedTeacher(parseInt(teacherId)); await loadTeacherTimetable(parseInt(teacherId)); }
      else if (classId) { setSelectedClass(parseInt(classId)); await loadClassTimetable(parseInt(classId)); }
      setLoading(false);
    } catch (error) { console.error('Error fetching data:', error); setError('Failed to load data: ' + error.message); setLoading(false); }
  };

  const getDefaultPeriods = () => {
    return [
      { number: 1, start: '08:00', end: '08:50', label: 'Period 1', type: 'academic' },
      { number: 2, start: '08:50', end: '09:40', label: 'Period 2', type: 'academic' },
      { number: 3, start: '09:40', end: '10:30', label: 'Period 3', type: 'academic' },
      { number: 4, start: '10:10', end: '11:00', label: 'Period 4', type: 'academic' },
      { number: 5, start: '11:00', end: '11:50', label: 'Period 5', type: 'academic' },
      { number: 6, start: '11:50', end: '12:40', label: 'Period 6', type: 'academic' },
      { number: 7, start: '13:10', end: '14:00', label: 'Period 7', type: 'academic' },
      { number: 8, start: '14:00', end: '14:50', label: 'Period 8', type: 'academic' },
      { number: 9, start: '14:50', end: '15:40', label: 'Period 9', type: 'academic' },
      { number: 10, start: '15:20', end: '16:10', label: 'Period 10', type: 'academic' },
      { number: 11, start: '16:10', end: '17:00', label: 'Period 11', type: 'academic' },
      { number: 12, start: '17:00', end: '17:50', label: 'Period 12', type: 'academic' },
      { number: 13, start: '17:50', end: '18:40', label: 'Period 13 (CPD)', type: 'academic' },
      { number: 14, start: '18:40', end: '19:30', label: 'Period 14 (CPD)', type: 'academic' }
    ];
  };

  const loadTeacherTimetable = async (teacherId) => {
    try {
      const response = await apiFetch(`/api/admin/teacher-timetable/${teacherId}`);
      if (response && response.teacher) {
        setTimetableData({ ...response, type: 'teacher' }); setViewMode('teacher'); setSelectedTeacher(teacherId); setSelectedClass(null);
        await checkConflicts(teacherId);
      } else setError('No timetable data found for this teacher');
    } catch (error) { console.error('Error loading teacher timetable:', error); setError('Failed to load teacher timetable: ' + error.message); }
  };

  const loadClassTimetable = async (classId) => {
    try {
      const response = await apiFetch(`/api/admin/class-timetable/${classId}`);
      if (response && response.classInfo) {
        setTimetableData({ ...response, type: 'class' }); setViewMode('class'); setSelectedClass(classId); setSelectedTeacher(null); setConflicts([]); setShowConflicts(false);
      } else setError('No timetable data found for this class');
    } catch (error) { console.error('Error loading class timetable:', error); setError('Failed to load class timetable: ' + error.message); }
  };

  const handleTeacherSelect = async (teacherId) => { setLoading(true); setError(null); await loadTeacherTimetable(teacherId); setLoading(false); };
  const handleClassSelect = async (classId) => { setLoading(true); setError(null); await loadClassTimetable(classId); setLoading(false); };

  const checkConflicts = async (teacherId) => {
    if (!teacherId) return;
    try {
      const response = await apiFetch(`/api/admin/teacher-conflicts/${teacherId}?term=Term 1&academic_year=2026-2027`);
      setConflicts(response.conflicts || []);
      if (response.conflicts && response.conflicts.length > 0) setShowConflicts(true);
    } catch (error) { console.error('Error checking conflicts:', error); }
  };

  // ============ WEEKS FUNCTIONS ============
  
  const loadWeeks = async () => {
    try {
      const response = await apiFetch('/api/admin/timetable-weeks?academic_year=2026-2027');
      setWeeks(response.weeks || []);
      const activeRes = await apiFetch('/api/admin/timetable-weeks/active?academic_year=2026-2027');
      if (activeRes.activeWeek) {
        setActiveWeek(activeRes.activeWeek);
        setWeekNumber(activeRes.activeWeek.week_number);
      }
    } catch (error) {
      console.error('Error loading weeks:', error);
    }
  };

  const handleSaveWeek = async () => {
    try {
      await apiFetch('/api/admin/timetable-weeks', {
        method: 'POST',
        body: JSON.stringify(weekForm)
      });
      await loadWeeks();
      setShowWeeksModal(false);
      alert('Week saved successfully!');
    } catch (error) {
      console.error('Error saving week:', error);
      alert('Failed to save week');
    }
  };

  const handleGenerateDefaultWeeks = async () => {
    if (!window.confirm('This will generate all weeks for the academic year. Continue?')) return;
    try {
      const response = await apiFetch('/api/admin/timetable-weeks/generate-default', {
        method: 'POST',
        body: JSON.stringify({ academic_year: '2026-2027' })
      });
      if (response.success) {
        await loadWeeks();
        alert(`✅ ${response.total} weeks generated successfully!`);
      }
    } catch (error) {
      console.error('Error generating weeks:', error);
      alert('Failed to generate weeks');
    }
  };

  // ============ RESERVATIONS FUNCTIONS ============
  
  const loadReservations = async () => {
    try {
      const response = await apiFetch('/api/admin/timetable-reservations?term=Term 1&academic_year=2026-2027');
      setReservations(response.reservations || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const handleSaveReservation = async () => {
    // Validate OFF reservation
    if (reservationForm.reservation_type === 'OFF' && !reservationForm.teacher_id) {
      alert('Please select a teacher for OFF reservation');
      return;
    }
    
    // Validate CPD reservation
    if (reservationForm.reservation_type === 'CPD') {
      if (reservationForm.day_of_week !== 'Friday') {
        alert('CPD reservations are only allowed on Friday');
        return;
      }
      if (reservationForm.period_number !== 13 && reservationForm.period_number !== 14) {
        alert('CPD reservations are only for periods 13 and 14');
        return;
      }
    }
    
    try {
      await apiFetch('/api/admin/timetable-reservations', {
        method: 'POST',
        body: JSON.stringify(reservationForm)
      });
      await loadReservations();
      setShowReservationsModal(false);
      // Reset form
      setReservationForm({
        day_of_week: 'Monday',
        period_number: 1,
        teacher_id: '',
        class_id: '',
        module_id: '',
        reservation_type: 'SPECIAL',
        description: '',
        is_active: true
      });
      alert('Reservation saved successfully!');
      // Reload timetable if teacher view
      if (viewMode === 'teacher' && selectedTeacher) {
        await loadTeacherTimetable(selectedTeacher);
      }
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert('Failed to save reservation: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteReservation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;
    try {
      await apiFetch(`/api/admin/timetable-reservations/${id}`, { method: 'DELETE' });
      await loadReservations();
      alert('Reservation deleted successfully');
      // Reload timetable if teacher view
      if (viewMode === 'teacher' && selectedTeacher) {
        await loadTeacherTimetable(selectedTeacher);
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      alert('Failed to delete reservation');
    }
  };

  const handleAutoGenerate = async () => {
    if (!window.confirm('This will clear existing timetable and generate a new one based on workload settings. Continue?')) return;
    setGenerating(true);
    try {
      const response = await apiFetch('/api/admin/auto-generate-timetable', { method: 'POST', body: JSON.stringify({ academic_year: '2026-2027', term: 'Term 1' }) });
      if (response.success) {
        alert(`✅ Timetable generated successfully!\n\n${response.stats.totalAssigned} periods assigned\n${response.stats.teachersProcessed} teachers processed\n${response.stats.activeWeek || 'No active week'}`);
        if (viewMode === 'teacher' && selectedTeacher) await loadTeacherTimetable(selectedTeacher);
        else if (viewMode === 'class' && selectedClass) await loadClassTimetable(selectedClass);
        await loadWeeks();
      } else alert('❌ ' + response.message);
    } catch (error) { console.error('Error generating timetable:', error); alert('Failed to generate timetable: ' + error.message); }
    finally { setGenerating(false); }
  };

  const handleCellClick = (day, period) => {
    // Check if this is an OFF period
    const entry = timetableData?.timetable?.[day]?.[period];
    if (entry && entry.isOff === true) {
      alert('This period is marked as OFF for this teacher and cannot be edited.');
      return;
    }

    // CPD is on Friday periods 13 and 14
    if (day === 'Friday' && (period === 13 || period === 14)) {
      alert('Periods 13 and 14 on Friday are reserved for CPD activities and cannot be edited.');
      return;
    }
    
    if (viewMode === 'teacher' && selectedTeacher) {
      const workload = teacherWorkload.find(w => w.teacher_id === selectedTeacher);
      const periodCount = timetableData?.entries?.filter(e => e.teacher_id === selectedTeacher).length || 0;
      if (workload && periodCount >= workload.periods_per_week) { alert(`This teacher has reached the maximum weekly workload (${workload.periods_per_week} periods)`); return; }
    }
    if (viewMode === 'teacher' && selectedTeacher) {
      setEditingCell({ day, period });
      const existingEntry = timetableData?.timetable[day]?.[period];
      setAssignmentData({ teacherId: selectedTeacher, classId: existingEntry?.classId || '', moduleId: existingEntry?.moduleId || '', day, period, room: existingEntry?.room || '', assignmentId: existingEntry?.id || null });
      setShowAssignmentModal(true);
    } else if (viewMode === 'class' && selectedClass) {
      setEditingCell({ day, period });
      const existingEntry = timetableData?.timetable[day]?.[period];
      setAssignmentData({ teacherId: existingEntry?.teacherId || '', classId: selectedClass, moduleId: existingEntry?.moduleId || '', day, period, room: existingEntry?.room || '', assignmentId: existingEntry?.id || null });
      setShowAssignmentModal(true);
    }
  };

  const handleAssignmentSave = async () => {
    try {
      const { teacherId, classId, moduleId, day, period, room, assignmentId } = assignmentData;
      if (!teacherId || !classId || !moduleId) { alert('Please select teacher, class, and module'); return; }
      
      // Check if this is a CPD period
      if (day === 'Friday' && (period === 13 || period === 14)) {
        alert('Periods 13 and 14 on Friday are reserved for CPD activities.');
        return;
      }
      
      // Check if this teacher has an OFF reservation at this time
      try {
        const checkResponse = await apiFetch(`/api/admin/check-teacher-availability/${teacherId}?day=${day}&period=${period}&term=Term 1&academic_year=2026-2027`);
        if (checkResponse.available === false) {
          alert(`This teacher is not available at this time: ${checkResponse.reason || 'Unknown reason'}`);
          return;
        }
      } catch (error) {
        console.error('Error checking availability:', error);
      }
      
      const payload = { teacher_id: parseInt(teacherId), class_id: parseInt(classId), module_id: parseInt(moduleId), day_of_week: day, period: parseInt(period), room: room || '', term: 'Term 1', academic_year: '2026-2027' };
      const url = assignmentId ? `/api/admin/timetable-assignment/${assignmentId}` : '/api/admin/timetable-assignment';
      const method = assignmentId ? 'PUT' : 'POST';
      await apiFetch(url, { method, body: JSON.stringify(payload) });
      setShowAssignmentModal(false); setEditingCell(null);
      if (viewMode === 'teacher' && selectedTeacher) await loadTeacherTimetable(selectedTeacher);
      else if (viewMode === 'class' && selectedClass) await loadClassTimetable(selectedClass);
    } catch (error) { console.error('Error saving assignment:', error); alert('Failed to save assignment: ' + error.message); }
  };

  const handleAssignmentDelete = async () => {
    if (!assignmentData.assignmentId) return;
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await apiFetch(`/api/admin/timetable-assignment/${assignmentData.assignmentId}`, { method: 'DELETE' });
      setShowAssignmentModal(false); setEditingCell(null);
      if (viewMode === 'teacher' && selectedTeacher) await loadTeacherTimetable(selectedTeacher);
      else if (viewMode === 'class' && selectedClass) await loadClassTimetable(selectedClass);
    } catch (error) { console.error('Error deleting assignment:', error); alert('Failed to delete assignment'); }
  };

  const handleAddWorkload = async () => {
    const { teacherId, classId, moduleId, periodsPerWeek, periodsPerDay } = newWorkload;
    if (!teacherId || !classId || !moduleId || periodsPerWeek <= 0) { alert('Please fill in all required fields (Teacher, Class, Module, Periods/Week)'); return; }
    try {
      const response = await apiFetch('/api/admin/teacher-workload', { method: 'POST', body: JSON.stringify({ teacher_id: parseInt(teacherId), class_id: parseInt(classId), module_id: parseInt(moduleId), periods_per_week: periodsPerWeek, periods_per_day: periodsPerDay || 0, is_active: 1 }) });
      if (response.success) { const workloadRes = await apiFetch('/api/admin/teacher-workload'); setTeacherWorkload(workloadRes.workload || []); setTeacherWorkloadList(workloadRes.workload || []); setNewWorkload({ teacherId: '', classId: '', moduleId: '', periodsPerWeek: 0, periodsPerDay: 0 }); alert('Workload added successfully'); }
    } catch (error) { console.error('Error adding workload:', error); alert('Failed to add workload: ' + error.message); }
  };

  const handleDeleteWorkload = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workload assignment?')) return;
    try {
      await apiFetch(`/api/admin/teacher-workload/${id}`, { method: 'DELETE' });
      const workloadRes = await apiFetch('/api/admin/teacher-workload'); setTeacherWorkload(workloadRes.workload || []); setTeacherWorkloadList(workloadRes.workload || []); alert('Workload deleted successfully');
    } catch (error) { console.error('Error deleting workload:', error); alert('Failed to delete workload'); }
  };

  const handleTeacherSummary = async (teacherId) => {
    if (!teacherId) { setSelectedTeacherForSummary(null); setTeacherSummary(null); return; }
    try {
      const response = await apiFetch(`/api/admin/teacher-workload-summary/${teacherId}`); setTeacherSummary(response.summary); const teacher = teachers.find(t => t.tid === teacherId); setSelectedTeacherForSummary(teacher);
    } catch (error) { console.error('Error fetching teacher summary:', error); alert('Failed to fetch teacher summary'); }
  };

  const saveSettings = async () => {
    try {
      await apiFetch('/api/admin/timetable-periods', { method: 'POST', body: JSON.stringify({ periods: tempPeriods }) });
      await apiFetch('/api/admin/timetable-breaks', { method: 'POST', body: JSON.stringify({ breaks: tempBreaks }) });
      await apiFetch('/api/admin/timetable-lunch', { method: 'POST', body: JSON.stringify(tempLunch) });
      const settingsRes = await apiFetch('/api/admin/timetable-settings');
      if (settingsRes.periods && settingsRes.periods.length > 0) { setPeriods(settingsRes.periods); setTempPeriods(settingsRes.periods); }
      setBreaks(tempBreaks); setLunch(tempLunch); setShowSettingsModal(false); alert('Settings saved successfully!');
    } catch (error) { console.error('Error saving settings:', error); alert('Failed to save settings: ' + error.message); }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  // ============ RENDER FUNCTIONS ============

  const renderTimetableGrid = () => {
    if (!timetableData) return <div className="text-center py-8 text-gray-500">No timetable data available.</div>;
    const sortedPeriods = [...periods].sort((a, b) => a.number - b.number);
    if (sortedPeriods.length === 0) return <div className="text-center py-8 text-gray-500">No periods configured.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100 text-left sticky left-0 z-10" style={{ minWidth: '100px' }}>
                <div>Period</div>
                <div className="text-xs text-gray-500">Start - End</div>
              </th>
              {days.map((day) => <th key={day} className="border border-gray-300 p-2 text-center font-bold" style={{ minWidth: '180px' }}>
                <div>{day}</div>
                {day === 'Friday' && <div className="text-xs text-yellow-600">(CPD: Periods 13-14)</div>}
              </th>)}
            </tr>
          </thead>
          <tbody>
            {sortedPeriods.map((period) => {
              const isBreak = breaks.some(b => {
                if (!b.start || !b.end) return false;
                const bStart = parseInt(b.start.replace(':', ''));
                const bEnd = parseInt(b.end.replace(':', ''));
                const pStart = parseInt(period.start.replace(':', ''));
                return pStart >= bStart && pStart < bEnd;
              });
              
              const isLunch = lunch && (() => {
                if (!lunch.start || !lunch.end) return false;
                const lStart = parseInt(lunch.start.replace(':', ''));
                const lEnd = parseInt(lunch.end.replace(':', ''));
                const pStart = parseInt(period.start.replace(':', ''));
                return pStart >= lStart && pStart < lEnd;
              })();

              const hasConflict = conflicts.some(c => c.day_of_week === days[period.number - 1] && c.period === period.number);

              return (
                <tr key={period.number} className={isBreak ? 'bg-yellow-50' : isLunch ? 'bg-orange-50' : ''}>
                  <td className="border border-gray-300 p-2 text-sm font-medium whitespace-nowrap sticky left-0 z-10 bg-white">
                    <div className="font-bold">{period.number}</div>
                    <div className="text-xs text-gray-500">{period.label || `Period ${period.number}`}</div>
                    <div className="text-xs text-gray-500">{period.start} - {period.end}</div>
                    {isBreak && <div className="text-xs text-yellow-600 font-bold">⏸ Break</div>}
                    {isLunch && <div className="text-xs text-orange-600 font-bold">🍽 Lunch</div>}
                    {hasConflict && <div className="text-xs text-red-600 font-bold">⚠️ Conflict</div>}
                  </td>
                  {days.map((day) => {
                    const entry = timetableData.timetable?.[day]?.[period.number];
                    // CPD is on Friday periods 13 and 14
                    const isCPD = day === 'Friday' && (period.number === 13 || period.number === 14);
                    // Check if this is an OFF reservation
                    const isOff = entry && entry.isOff === true;

                    if (isBreak || isLunch) {
                      return (
                        <td key={`${day}-${period.number}`} className="border border-gray-300 p-1 text-center bg-gray-100 opacity-80">
                          <div className="text-gray-500 text-sm font-medium p-2">{isLunch ? '🍽 Lunch' : '⏸ Break'}</div>
                        </td>
                      );
                    }

                    if (isCPD) {
                      return (
                        <td key={`${day}-${period.number}`} className="border border-gray-300 p-1 text-center bg-yellow-50">
                          <div className="text-yellow-700 font-bold text-sm p-2">📚 CPD</div>
                          <div className="text-xs text-gray-500">Staff Development</div>
                        </td>
                      );
                    }

                    if (isOff) {
                      return (
                        <td key={`${day}-${period.number}`} className="border border-gray-300 p-1 text-center bg-red-50 cursor-not-allowed">
                          <div className="text-red-600 font-bold text-sm p-2">🚫 OFF</div>
                          <div className="text-xs text-gray-500">{entry.description || 'Teacher Off'}</div>
                        </td>
                      );
                    }

                    return (
                      <td key={`${day}-${period.number}`} 
                        className={`border border-gray-300 p-1 text-center cursor-pointer hover:shadow-lg transition-all ${entry ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}`}
                        onClick={() => handleCellClick(day, period.number)}
                      >
                        {entry ? (
                          <div className="p-1">
                            <div className="font-bold text-sm text-blue-600">{entry.moduleCode}</div>
                            <div className="text-xs text-gray-600 truncate">{entry.moduleName}</div>
                            {viewMode === 'teacher' ? (<div className="text-xs font-medium text-green-600">{entry.level}{entry.className}</div>) : (<div className="text-xs font-medium text-green-600">{entry.teacherName}{entry.teacherCode && ` (${entry.teacherCode})`}</div>)}
                            {entry.room && <div className="text-xs text-gray-500">Room: {entry.room}</div>}
                          </div>
                        ) : (
                          <div className="text-gray-300 text-sm p-2">+ Add</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ============ CONFLICT MODAL ============
  const renderConflictModal = () => {
    if (!showConflicts || conflicts.length === 0) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-red-600">⚠️ Schedule Conflicts Detected</h3><button onClick={() => setShowConflicts(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button></div>
          <div className="space-y-3">{conflicts.map((conflict, idx) => (<div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="font-semibold text-red-700">{conflict.day_of_week} - Period {conflict.period}</p><p className="text-sm text-gray-600">Conflict between: <span className="font-medium">{conflict.module1_name}</span> (Class {conflict.class1_name}) and <span className="font-medium">{conflict.module2_name}</span> (Class {conflict.class2_name})</p></div>))}</div>
          <div className="mt-4 flex justify-end"><button onClick={() => setShowConflicts(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button></div>
        </div>
      </div>
    );
  };

  // ============ SETTINGS MODAL ============
  const renderSettingsModal = () => {
    if (!showSettingsModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-800">Timetable Settings</h3><button onClick={() => setShowSettingsModal(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button></div>
          <div className="flex gap-2 mb-4 border-b pb-2">{['periods', 'breaks', 'lunch', 'workload'].map((tab) => <button key={tab} onClick={() => setSettingsTab(tab)} className={`px-4 py-2 rounded-lg capitalize ${settingsTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{tab}</button>)}</div>

          {settingsTab === 'periods' && (<div><h4 className="font-semibold mb-3">Configure Periods</h4><div className="space-y-2 max-h-96 overflow-y-auto">{tempPeriods.map((period, index) => (<div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"><input type="number" value={period.number} onChange={(e) => { const updated = [...tempPeriods]; updated[index].number = parseInt(e.target.value); setTempPeriods(updated); }} className="w-16 border border-gray-300 rounded px-2 py-1" min="1" /><input type="text" value={period.label || ''} onChange={(e) => { const updated = [...tempPeriods]; updated[index].label = e.target.value; setTempPeriods(updated); }} placeholder="Label" className="flex-1 border border-gray-300 rounded px-2 py-1" /><input type="time" value={period.start} onChange={(e) => { const updated = [...tempPeriods]; updated[index].start = e.target.value; setTempPeriods(updated); }} className="w-32 border border-gray-300 rounded px-2 py-1" /><input type="time" value={period.end} onChange={(e) => { const updated = [...tempPeriods]; updated[index].end = e.target.value; setTempPeriods(updated); }} className="w-32 border border-gray-300 rounded px-2 py-1" /><select value={period.type || 'academic'} onChange={(e) => { const updated = [...tempPeriods]; updated[index].type = e.target.value; setTempPeriods(updated); }} className="border border-gray-300 rounded px-2 py-1"><option value="academic">Academic</option><option value="break">Break</option><option value="lunch">Lunch</option></select><button onClick={() => setTempPeriods(tempPeriods.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800"><i className="fas fa-trash"></i></button></div>))}</div><button onClick={() => { const maxNumber = tempPeriods.reduce((max, p) => Math.max(max, p.number), 0); setTempPeriods([...tempPeriods, { number: maxNumber + 1, start: '08:00', end: '08:40', label: `Period ${maxNumber + 1}`, type: 'academic' }]); }} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Period</button></div>)}

          {settingsTab === 'breaks' && (<div><h4 className="font-semibold mb-3">Configure Breaks</h4><div className="space-y-2 max-h-96 overflow-y-auto">{tempBreaks.map((breakItem, index) => (<div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"><input type="text" value={breakItem.name} onChange={(e) => { const updated = [...tempBreaks]; updated[index].name = e.target.value; setTempBreaks(updated); }} placeholder="Break Name" className="flex-1 border border-gray-300 rounded px-2 py-1" /><input type="time" value={breakItem.start} onChange={(e) => { const updated = [...tempBreaks]; updated[index].start = e.target.value; setTempBreaks(updated); }} className="w-32 border border-gray-300 rounded px-2 py-1" /><input type="time" value={breakItem.end} onChange={(e) => { const updated = [...tempBreaks]; updated[index].end = e.target.value; setTempBreaks(updated); }} className="w-32 border border-gray-300 rounded px-2 py-1" /><select value={breakItem.day || 'All'} onChange={(e) => { const updated = [...tempBreaks]; updated[index].day = e.target.value; setTempBreaks(updated); }} className="border border-gray-300 rounded px-2 py-1"><option value="All">All Days</option>{days.map(d => <option key={d} value={d}>{d}</option>)}</select><button onClick={() => setTempBreaks(tempBreaks.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800"><i className="fas fa-trash"></i></button></div>))}</div><button onClick={() => setTempBreaks([...tempBreaks, { name: 'Morning Break', start: '10:00', end: '10:10', day: 'All' }])} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Break</button></div>)}

          {settingsTab === 'lunch' && (<div><h4 className="font-semibold mb-3">Configure Lunch Time</h4><div className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"><span className="font-medium">Start:</span><input type="time" value={tempLunch.start} onChange={(e) => setTempLunch({ ...tempLunch, start: e.target.value })} className="border border-gray-300 rounded px-2 py-1" /><span className="font-medium">End:</span><input type="time" value={tempLunch.end} onChange={(e) => setTempLunch({ ...tempLunch, end: e.target.value })} className="border border-gray-300 rounded px-2 py-1" /></div></div>)}

          {settingsTab === 'workload' && (<div><h4 className="font-semibold mb-3">Teacher Workload Configuration</h4><div className="bg-blue-50 p-4 rounded-lg mb-4"><h5 className="font-medium text-blue-800 mb-3">Add New Workload Assignment</h5><div className="grid grid-cols-1 md:grid-cols-5 gap-3"><select value={newWorkload.teacherId} onChange={(e) => setNewWorkload({ ...newWorkload, teacherId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Teacher</option>{teachers.map((teacher) => <option key={teacher.tid} value={teacher.tid}>{teacher.fname} {teacher.lname}</option>)}</select><select value={newWorkload.classId} onChange={(e) => setNewWorkload({ ...newWorkload, classId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Class</option>{classes.map((cls) => <option key={cls.cid} value={cls.cid}>{cls.level} {cls.class_name}</option>)}</select><select value={newWorkload.moduleId} onChange={(e) => setNewWorkload({ ...newWorkload, moduleId: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Module</option>{modules.filter(m => m.class == newWorkload.classId).map((module) => <option key={module.moid} value={module.moid}>{module.mcode} - {module.mname}</option>)}</select><input type="number" value={newWorkload.periodsPerWeek} onChange={(e) => setNewWorkload({ ...newWorkload, periodsPerWeek: parseInt(e.target.value) || 0 })} placeholder="Periods/Week" className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" /><button onClick={handleAddWorkload} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">+ Add</button></div></div><div className="space-y-2 max-h-96 overflow-y-auto">{teacherWorkloadList.length === 0 ? (<div className="text-center py-8 text-gray-500">No workload assignments configured yet.</div>) : (teacherWorkloadList.map((item) => (<div key={item.id} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"><span className="font-medium w-32">{item.fname} {item.lname}</span><span className="text-sm w-24">{item.level}{item.class_name}</span><span className="text-sm w-32">{item.mcode}</span><span className="text-sm w-20">{item.periods_per_week} hrs/wk</span><span className="text-sm w-20">{item.periods_per_day || 0} hrs/day</span><span className={`text-sm w-16 ${item.is_active ? 'text-green-600' : 'text-red-600'}`}>{item.is_active ? 'Active' : 'Inactive'}</span><button onClick={() => handleDeleteWorkload(item.id)} className="text-red-600 hover:text-red-800 ml-auto"><i className="fas fa-trash"></i></button></div>)))}</div></div>)}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t"><button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancel</button><button onClick={saveSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save All Settings</button></div>
        </div>
      </div>
    );
  };

  // ============ ASSIGNMENT MODAL ============
  const renderAssignmentModal = () => {
    if (!showAssignmentModal) return null;
    const filteredModules = modules.filter(m => m.class == assignmentData.classId);
    // CPD is on Friday periods 13 and 14
    const isCPD = assignmentData.day === 'Friday' && (parseInt(assignmentData.period) === 13 || parseInt(assignmentData.period) === 14);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{assignmentData.assignmentId ? 'Edit Assignment' : 'New Assignment'}</h3>
          {isCPD && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 font-medium">📚 This is a CPD reserved period</p>
              <p className="text-sm text-yellow-700">Periods 13 and 14 on Friday are reserved for Staff Development.</p>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-4">{assignmentData.day}, Period {assignmentData.period}{periods.find(p => p.number === parseInt(assignmentData.period)) && (<span className="text-xs text-gray-500 block">{periods.find(p => p.number === parseInt(assignmentData.period))?.label || ''} ({periods.find(p => p.number === parseInt(assignmentData.period))?.start} - {periods.find(p => p.number === parseInt(assignmentData.period))?.end})</span>)}</p>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label><select value={assignmentData.teacherId} onChange={(e) => setAssignmentData({ ...assignmentData, teacherId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Teacher</option>{teachers.map((teacher) => <option key={teacher.tid} value={teacher.tid}>{teacher.fname} {teacher.lname} ({teacher.tcode})</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Class</label><select value={assignmentData.classId} onChange={(e) => setAssignmentData({ ...assignmentData, classId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Class</option>{classes.map((cls) => <option key={cls.cid} value={cls.cid}>{cls.level} {cls.class_name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Module</label><select value={assignmentData.moduleId} onChange={(e) => setAssignmentData({ ...assignmentData, moduleId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Module</option>{filteredModules.map((module) => <option key={module.moid} value={module.moid}>{module.mcode} - {module.mname}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Room</label><input type="text" value={assignmentData.room} onChange={(e) => setAssignmentData({ ...assignmentData, room: e.target.value })} placeholder="Enter room number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex justify-between mt-6">
            <div>{assignmentData.assignmentId && <button onClick={handleAssignmentDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all">Delete</button>}</div>
            <div className="flex gap-2"><button onClick={() => { setShowAssignmentModal(false); setEditingCell(null); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all">Cancel</button><button onClick={handleAssignmentSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">Save</button></div>
          </div>
        </div>
      </div>
    );
  };

  // ============ RESERVATIONS MODAL ============
  const renderReservationsModal = () => {
    if (!showReservationsModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">📅 Timetable Reservations</h3>
            <button onClick={() => setShowReservationsModal(false)} className="text-gray-500 hover:text-gray-700">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          {/* CPD Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
              <span>⏰</span> CPD (Last two periods on Friday)
            </h4>
            <p className="text-sm text-yellow-700">Periods 13 and 14 on Friday are automatically reserved for CPD activities.</p>
          </div>

          {/* OFF Info Box */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-red-800 flex items-center gap-2">
              <span>🚫</span> Teacher OFF Periods
            </h4>
            <p className="text-sm text-red-700">Mark specific periods when a teacher is OFF duty. These periods will appear as "OFF" in the timetable.</p>
          </div>
          
          {/* Add New Reservation */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-3">Add/Edit Reservation</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={reservationForm.day_of_week} onChange={(e) => setReservationForm({...reservationForm, day_of_week: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2">
                {days.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
              <input type="number" value={reservationForm.period_number} onChange={(e) => setReservationForm({...reservationForm, period_number: parseInt(e.target.value)})} placeholder="Period" className="border border-gray-300 rounded-lg px-3 py-2" min="1" max="14" />
              <select value={reservationForm.reservation_type} onChange={(e) => setReservationForm({...reservationForm, reservation_type: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2">
                <option value="SPECIAL">Special Activity</option>
                <option value="CPD">CPD</option>
                <option value="OFF">Teacher Off</option>
              </select>
              <select value={reservationForm.teacher_id} onChange={(e) => setReservationForm({...reservationForm, teacher_id: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Select Teacher (for OFF)</option>
                {teachers.map(t => <option key={t.tid} value={t.tid}>{t.fname} {t.lname}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <select value={reservationForm.class_id} onChange={(e) => setReservationForm({...reservationForm, class_id: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Select Class (optional)</option>
                {classes.map(c => <option key={c.cid} value={c.cid}>{c.level} {c.class_name}</option>)}
              </select>
              <input type="text" value={reservationForm.description} onChange={(e) => setReservationForm({...reservationForm, description: e.target.value})} placeholder="Description (e.g., Personal leave, Training)" className="border border-gray-300 rounded-lg px-3 py-2" />
              <button onClick={handleSaveReservation} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                Save Reservation
              </button>
            </div>
          </div>
          
          {/* Existing Reservations List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {reservations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No reservations configured</div>
            ) : (
              reservations.map((reservation) => (
                <div key={reservation.id} className={`flex gap-3 items-center p-3 rounded-lg hover:bg-gray-100 transition-all ${
                  reservation.reservation_type === 'OFF' ? 'bg-red-50 border border-red-200' : 
                  reservation.reservation_type === 'CPD' ? 'bg-yellow-50 border border-yellow-200' : 
                  'bg-gray-50'
                }`}>
                  <span className="font-medium w-24">{reservation.day_of_week}</span>
                  <span className="w-16 text-center">Period {reservation.period_number}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold w-20 text-center ${
                    reservation.reservation_type === 'CPD' ? 'bg-yellow-200 text-yellow-800' :
                    reservation.reservation_type === 'OFF' ? 'bg-red-200 text-red-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {reservation.reservation_type}
                  </span>
                  <span className="flex-1 text-sm">
                    {reservation.teacher_fname && `${reservation.teacher_fname} ${reservation.teacher_lname}`}
                    {reservation.class_level && ` - ${reservation.class_level}${reservation.class_name}`}
                    {reservation.description && ` (${reservation.description})`}
                  </span>
                  <span className={`text-sm ${reservation.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {reservation.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleDeleteReservation(reservation.id)} className="text-red-600 hover:text-red-800 ml-auto">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={() => setShowReservationsModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ============ WEEKS MODAL ============
  const renderWeeksModal = () => {
    if (!showWeeksModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">📆 Term Weeks Management</h3>
            <button onClick={() => setShowWeeksModal(false)} className="text-gray-500 hover:text-gray-700">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-800">📊 Academic Year Structure</h4>
            <p className="text-sm text-blue-700">
              <span className="font-medium">Term 1:</span> 15 weeks &nbsp;|&nbsp; 
              <span className="font-medium">Term 2:</span> 13 weeks &nbsp;|&nbsp; 
              <span className="font-medium">Term 3:</span> 11 weeks
            </p>
            <p className="text-sm text-blue-700 mt-1">Each trimester starts with a new timetable. Active week: <span className="font-bold">{activeWeek ? `Week ${activeWeek.week_number} - ${activeWeek.term}` : 'None set'}</span></p>
          </div>
          
          <div className="flex gap-3 mb-4">
            <button onClick={handleGenerateDefaultWeeks} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">
              🔄 Generate All Weeks
            </button>
          </div>
          
          {/* Add New Week */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-3">Add/Edit Week</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="number" value={weekForm.week_number} onChange={(e) => setWeekForm({...weekForm, week_number: parseInt(e.target.value)})} placeholder="Week #" className="border border-gray-300 rounded-lg px-3 py-2" />
              <select value={weekForm.term} onChange={(e) => setWeekForm({...weekForm, term: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
              <input type="number" value={weekForm.trimester_number} onChange={(e) => setWeekForm({...weekForm, trimester_number: parseInt(e.target.value)})} placeholder="Trimester #" className="border border-gray-300 rounded-lg px-3 py-2" min="1" max="3" />
              <input type="date" value={weekForm.start_date} onChange={(e) => setWeekForm({...weekForm, start_date: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <input type="date" value={weekForm.end_date} onChange={(e) => setWeekForm({...weekForm, end_date: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={weekForm.is_active} onChange={(e) => setWeekForm({...weekForm, is_active: e.target.checked})} className="w-4 h-4" />
                Active
              </label>
              <input type="text" value={weekForm.description} onChange={(e) => setWeekForm({...weekForm, description: e.target.value})} placeholder="Description" className="border border-gray-300 rounded-lg px-3 py-2 col-span-2" />
            </div>
            <button onClick={handleSaveWeek} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              Save Week
            </button>
          </div>
          
          {/* Existing Weeks List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {weeks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No weeks configured. Click "Generate All Weeks" to create them.</div>
            ) : (
              weeks.map((week) => (
                <div key={week.id} className={`flex gap-3 items-center p-3 rounded-lg transition-all ${week.is_active ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <span className={`font-bold w-20 ${week.is_active ? 'text-green-700' : ''}`}>
                    Week {week.week_number}
                  </span>
                  <span className="w-24 text-sm">{week.term}</span>
                  <span className="w-16 text-sm">T{week.trimester_number}</span>
                  <span className="text-sm flex-1">{week.start_date} → {week.end_date}</span>
                  <span className={`text-sm font-medium ${week.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                    {week.is_active ? '✅ Active' : 'Inactive'}
                  </span>
                  <button onClick={() => setWeekForm({...week})} className="text-blue-600 hover:text-blue-800">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button onClick={async () => {
                    if (window.confirm('Delete this week?')) {
                      try {
                        await apiFetch(`/api/admin/timetable-weeks/${week.id}`, { method: 'DELETE' });
                        await loadWeeks();
                      } catch (error) {
                        console.error('Error deleting week:', error);
                        alert('Failed to delete week');
                      }
                    }
                  }} className="text-red-600 hover:text-red-800">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={() => setShowWeeksModal(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Close</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (<div className="flex justify-center items-center h-screen"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><div className="text-xl text-gray-600">Loading timetable...</div></div></div>);
  if (error) return (<div className="min-h-screen bg-gray-100 flex justify-center items-center p-5"><div className="bg-white rounded-lg p-8 shadow-md text-center max-w-md"><h1 className="text-2xl text-red-600 font-bold mb-4">Error</h1><p className="text-gray-600 mb-4">{error}</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button></div></div>);

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div ref={printRef}>
        <div className="max-w-7xl mx-auto">
          
          {/* Header - Hidden when printing */}
          <div className="print-hidden bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-bold">Timetable Management System</h1>
                <p className="text-blue-100 mt-1">Academic Year 2026-2027 {activeWeek && `| Week ${activeWeek.week_number} - ${activeWeek.term}`}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleAutoGenerate} disabled={generating} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50">
                  {generating ? '⏳ Generating...' : '⚡ Auto Generate'}
                </button>
                <button onClick={() => { setShowReservationsModal(true); loadReservations(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
                  📅 Reservations
                </button>
                <button onClick={() => { setShowWeeksModal(true); loadWeeks(); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all">
                  📆 Weeks
                </button>
                <button onClick={() => setShowSettingsModal(true)} className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all">
                  ⚙️ Settings
                </button>
                <button onClick={handlePrint} disabled={isPrinting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">
                  {isPrinting ? 'Preparing...' : '🖨️ Print'}
                </button>
              </div>
            </div>
            {conflicts.length > 0 && (<div className="mt-3 bg-red-500/20 text-white p-2 rounded-lg text-sm flex items-center gap-2"><span className="text-yellow-300">⚠️</span><span>{conflicts.length} conflict(s) detected. Click on the conflict indicator for details.</span><button onClick={() => setShowConflicts(true)} className="ml-auto bg-white text-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100">View</button></div>)}
          </div>

          {/* View Mode Toggle - Hidden when printing */}
          <div className="print-hidden flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setViewMode('teacher')} className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>👨‍🏫 Teacher View</button>
            <button onClick={() => setViewMode('class')} className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'class' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>🏫 Class View</button>
          </div>

          {/* Selection - Hidden when printing */}
          <div className="print-hidden">
            {viewMode === 'teacher' ? (
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Teacher</h3>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {teachers.map((teacher) => {
                    const workload = teacherWorkload.find(w => w.teacher_id === teacher.tid);
                    const periodCount = timetableData?.entries?.filter(e => e.teacher_id === teacher.tid).length || 0;
                    const maxPeriods = workload?.periods_per_week || 0;
                    return (
                      <button key={teacher.tid} onClick={() => handleTeacherSelect(teacher.tid)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedTeacher === teacher.tid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {teacher.fname} {teacher.lname}
                        {maxPeriods > 0 && (<span className="ml-1 text-xs opacity-75">({periodCount}/{maxPeriods})</span>)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Class</h3>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {classes.map((cls) => (
                    <button key={cls.cid} onClick={() => handleClassSelect(cls.cid)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedClass === cls.cid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                      {cls.level} {cls.class_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timetable Display - ONLY THIS PRINTS */}
          {timetableData ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden print-timetable">
              <div className={`p-4 text-center text-white ${viewMode === 'teacher' ? 'bg-blue-600' : 'bg-green-600'}`}>
                <h2 className="text-xl font-bold">
                  {viewMode === 'teacher' ? `${timetableData.teacher?.fname} ${timetableData.teacher?.lname} - Weekly Schedule` : `${timetableData.classInfo?.level} ${timetableData.classInfo?.class_name} - Class Schedule`}
                </h2>
                <p className="text-sm opacity-90">Academic Year: 2026-2027 &nbsp;|&nbsp; Week: {weekNumber} {activeWeek && `(${activeWeek.term})`}</p>
                {viewMode === 'class' && (<p className="text-sm opacity-90">{timetableData.classInfo?.class_code}</p>)}
              </div>
              <div className="p-4">
                {renderTimetableGrid()}
              </div>
              <div className="print-hidden bg-gray-100 p-3 text-center text-sm text-gray-500">
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span className="text-yellow-600">⏸</span> Break <span className="text-orange-600">🍽</span> Lunch <span className="text-red-600">⚠️</span> Conflict <span className="text-yellow-700">📚</span> CPD <span className="text-red-600">🚫</span> OFF <span className="text-blue-600">📘</span> Click on any cell to assign or edit a module.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">Select a teacher or class to view timetable</p>
            </div>
          )}
        </div>
      </div>

      {renderConflictModal()}
      {renderSettingsModal()}
      {renderAssignmentModal()}
      {renderReservationsModal()}
      {renderWeeksModal()}

      <style jsx global>{`
        @media print {
          .navbar, .admin-header, .admin-layout-header, header, .breadcrumb, .breadcrumbs, aside, nav, footer, .print-hidden {
            display: none !important;
          }

          @page {
            size: A4 landscape;
            margin: 0 !important;
          }

          body, html {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-timetable, .print-timetable * {
            visibility: visible !important;
          }

          .print-timetable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            zoom: 0.72;
          }

          .print-timetable table {
            font-size: 11px !important;
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }

          .print-timetable th, .print-timetable td {
            padding: 1px 3px !important;
            line-height: 1.1 !important;
            border: 1px solid #000 !important;
            word-wrap: break-word !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-timetable .bg-yellow-50 { background: #fefce8 !important; }
          .print-timetable .bg-orange-50 { background: #fff7ed !important; }
          .print-timetable .bg-red-50 { background: #fef2f2 !important; }

          .print-timetable h2 {
            font-size: 13px !important;
            margin: 0 !important;
            padding: 2px 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-timetable p {
            font-size: 10px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TimetableManager;