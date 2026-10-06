import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export default function AdminStudentRoster() {
  const { cid } = useParams();
  const [students, setStudents] = useState([]);
  const [yearId, setYearId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [programId, setProgramId] = useState(null);

  // Form states for adding student
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    reg: '',
    district: '',
    secter: ''
  });

  // Edit form states
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    reg: '',
    district: '',
    secter: '',
    status: 'Active',
    decision: ''
  });

  // Upload states
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
    fetchClassInfo();
  }, [cid]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(`/api/admin/students-in-class?cid=${cid}`);
      console.log('Loaded students:', result);
      setStudents(result.students || []);
      setYearId(result.yearId);
    } catch (e) {
      console.error('Error loading students:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassInfo = async () => {
    try {
      const response = await apiFetch(`/api/admin/classes-admin`);
      const classFound = response.classes?.find(c => c.cid === parseInt(cid));
      setClassInfo(classFound);
      setProgramId(classFound?.program_id || 0);
    } catch (err) {
      console.error('Error fetching class info:', err);
    }
  };

  // Add single student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    if (!form.firstname.trim() || !form.lastname.trim()) {
      setError('First name and last name are required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let regValue = null;
      if (form.reg && form.reg !== '') {
        regValue = String(form.reg).trim();
      }
      
      let districtValue = null;
      if (form.district && form.district !== '') {
        districtValue = String(form.district).trim();
      }
      
      let secterValue = null;
      if (form.secter && form.secter !== '') {
        secterValue = String(form.secter).trim();
      }
      
      const payload = {
        firstname: String(form.firstname).trim(),
        lastname: String(form.lastname).trim(),
        reg: regValue,
        district: districtValue,
        secter: secterValue,
        classId: parseInt(cid),
        yearId: yearId,
        programId: programId
      };
      
      console.log('Adding student payload:', payload);
      
      await apiFetch(`/api/admin/students`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setSuccess(`Student "${form.firstname} ${form.lastname}" added successfully!`);
      setForm({ firstname: '', lastname: '', reg: '', district: '', secter: '' });
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      console.error('Add error:', err);
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Delete student
  const handleDelete = async (sid, studentName) => {
    if (!confirm(`Are you sure you want to delete "${studentName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/admin/students/${sid}`, { method: 'DELETE' });
      setSuccess(`Student "${studentName}" deleted successfully!`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit student - open modal
  const handleEdit = (student) => {
    console.log('Opening edit modal for student:', student);
    setEditMode(true);
    setEditStudent(student);
    setEditForm({
      firstname: student.firstname || '',
      lastname: student.lastname || '',
      reg: student.reg ? String(student.reg) : '',
      district: student.district || '',
      secter: student.secter || '',
      status: student.status || 'Active',
      decision: student.decision || ''
    });
    setError('');
    setShowAddForm(false);
  };

  // Update student - COMPLETE FIX
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    console.log('=== UPDATE SUBMITTED ===');
    console.log('Edit Form Data:', editForm);
    console.log('Student ID being updated:', editStudent?.sid);
    
    if (!editForm.firstname.trim() || !editForm.lastname.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (!editStudent || !editStudent.sid) {
      setError('No student selected for update');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let regValue = null;
      if (editForm.reg && editForm.reg !== '') {
        regValue = String(editForm.reg).trim();
      }
      
      let districtValue = null;
      if (editForm.district && editForm.district !== '') {
        districtValue = String(editForm.district).trim();
      }
      
      let secterValue = null;
      if (editForm.secter && editForm.secter !== '') {
        secterValue = String(editForm.secter).trim();
      }
      
      const updateData = {
        firstname: String(editForm.firstname).trim(),
        lastname: String(editForm.lastname).trim(),
        reg: regValue,
        district: districtValue,
        secter: secterValue,
        status: editForm.status,
        decision: editForm.decision
      };
      
      console.log('Sending update request to:', `/api/admin/students/${editStudent.sid}`);
      console.log('Update data:', updateData);
      
      const response = await apiFetch(`/api/admin/students/${editStudent.sid}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      console.log('Update response:', response);
      
      if (response.ok !== false) {
        setSuccess(`Student "${editForm.firstname} ${editForm.lastname}" updated successfully!`);
        setEditMode(false);
        setEditStudent(null);
        setEditForm({
          firstname: '', lastname: '', reg: '', district: '', secter: '', status: 'Active', decision: ''
        });
        await loadData();
      } else {
        setError(response.message || 'Failed to update student');
      }
    } catch (err) {
      console.error('Update error details:', err);
      setError(err.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  // Update status only (inline dropdown)
  const handleStatusChange = async (sid, newStatus) => {
    setLoading(true);
    try {
      await apiFetch(`/api/admin/students/${sid}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setSuccess('Status updated successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update decision only (inline dropdown)
  const handleDecisionChange = async (sid, newDecision) => {
    setLoading(true);
    try {
      await apiFetch(`/api/admin/students/${sid}/decision`, {
        method: 'PUT',
        body: JSON.stringify({ decision: newDecision })
      });
      setSuccess('Decision updated successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditStudent(null);
    setEditForm({
      firstname: '', lastname: '', reg: '', district: '', secter: '', status: 'Active', decision: ''
    });
    setError('');
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setForm({ firstname: '', lastname: '', reg: '', district: '', secter: '' });
    setError('');
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
      setError('Please upload CSV or Excel file only');
      return;
    }

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', cid);
    formData.append('yearId', yearId);
    formData.append('programId', programId);

    try {
      const response = await fetch('http://localhost:4000/api/admin/students/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`${result.added} students added successfully!`);
        await loadData();
        e.target.value = '';
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Download template CSV
  const downloadTemplate = () => {
    const csvContent = 'firstname,lastname,reg,district,secter\nJohn,Doe,REG001,City,Central\nJane,Smith,REG002,Town,North\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getClassDisplay = () => {
    if (!classInfo) return `Class ${cid}`;
    if (classInfo.level && classInfo.class_name) {
      return `${classInfo.level}${classInfo.class_name}`;
    }
    return classInfo.class_name || `Class ${cid}`;
  };

  if (loading && students.length === 0) {
    return (
      <div className="max-w-full mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-school mb-4"></i>
            <p className="text-gray-600">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto p-4">
      {/* Navigation */}
      <div className="mb-4">
        <Link to="/admin/students" className="text-sm font-semibold text-school hover:underline inline-flex items-center gap-1">
          <i className="fas fa-arrow-left"></i> Back to Classes
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-school">Student Roster</h1>
        <p className="text-gray-600 mt-1">{getClassDisplay()}</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditMode(false);
            setForm({ firstname: '', lastname: '', reg: '', district: '', secter: '' });
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
        >
          <i className="fas fa-plus"></i>
          Add Single Student
        </button>
        
        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition cursor-pointer">
          <i className="fas fa-upload"></i>
          Upload Excel/CSV
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        <button
          onClick={downloadTemplate}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
        >
          <i className="fas fa-download"></i>
          Download Template
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <i className="fas fa-check-circle text-green-500"></i>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-700 hover:text-green-900">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-circle text-red-500"></i>
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-700 hover:text-red-900">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Uploading and processing file...</span>
          </div>
        </div>
      )}

      {/* Add Student Form */}
      {showAddForm && (
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6" id="add-form">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <i className="fas fa-user-plus text-green-500"></i>
              Add New Student
            </h2>
            <button onClick={cancelAdd} className="text-gray-500 hover:text-gray-700 text-sm font-medium">
              Cancel
            </button>
          </div>
          
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstname}
                onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                required
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastname}
                onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                required
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={form.reg}
                onChange={(e) => setForm({ ...form, reg: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                placeholder="Enter district"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Sector
              </label>
              <input
                type="text"
                value={form.secter}
                onChange={(e) => setForm({ ...form, secter: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                placeholder="Enter sector"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition flex items-center gap-2"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                Add Student
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Student Modal */}
      {editMode && editStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <i className="fas fa-edit text-yellow-500"></i>
                Edit Student - ID: {editStudent.sid}
              </h2>
              <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.firstname}
                    onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.lastname}
                    onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={editForm.reg}
                    onChange={(e) => setEditForm({ ...editForm, reg: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={editForm.secter}
                    onChange={(e) => setEditForm({ ...editForm, secter: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Decision
                  </label>
                  <select
                    value={editForm.decision}
                    onChange={(e) => setEditForm({ ...editForm, decision: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-school"
                  >
                    <option value="">Select</option>
                    <option value="Promoted">Promoted</option>
                    <option value="Repeated">Repeated</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button type="button" onClick={cancelEdit} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-lg transition flex items-center gap-2"
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Student List</h2>
            <p className="text-sm text-gray-500">Total: {students.length} students</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">First Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Last Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">District</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sector</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Decision</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-500">
                    <i className="fas fa-user-graduate text-5xl mb-3 block"></i>
                    <p>No students found in this class</p>
                    <p className="text-sm mt-2">Click "Add Single Student" or "Upload Excel/CSV" to add students</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.sid} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500">{student.sid}</td>
                    <td className="px-4 py-3 text-gray-700">{student.firstname}</td>
                    <td className="px-4 py-3 text-gray-700">{student.lastname}</td>
                    <td className="px-4 py-3 text-gray-500">{student.district || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{student.secter || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={student.status || 'Active'}
                        onChange={(e) => handleStatusChange(student.sid, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-school"
                        disabled={loading}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={student.decision || ''}
                        onChange={(e) => handleDecisionChange(student.sid, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-school"
                        disabled={loading}
                      >
                        <option value="">Select</option>
                        <option value="Promoted">Promoted</option>
                        <option value="Repeated">Repeated</option>
                        <option value="Graduated">Graduated</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(student)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Edit Student"
                          disabled={loading}
                        >
                          <i className="fas fa-edit text-xs"></i> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.sid, `${student.firstname} ${student.lastname}`)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Delete Student"
                          disabled={loading}
                        >
                          <i className="fas fa-trash text-xs"></i> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {students.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Showing {students.length} student(s)</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}