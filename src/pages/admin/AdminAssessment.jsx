import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use the correct API URL based on your backend setup
const API_BASE_URL = 'http://localhost:4000/api/admin';

const AdminAssessment = () => {
    const [assessments, setAssessments] = useState([]);
    const [newAssessment, setNewAssessment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Get auth token from wherever it's stored
    const getAuthToken = () => {
        // Try multiple possible storage locations
        const token = localStorage.getItem('token') || 
                      localStorage.getItem('adminToken') || 
                      sessionStorage.getItem('token') ||
                      localStorage.getItem('authToken');
        return token;
    };

    // Get headers with auth if token exists
    const getHeaders = () => {
        const token = getAuthToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    useEffect(() => {
        // First test if backend is reachable
        testBackendConnection();
        fetchAssessments();
    }, []);

    // Test backend connection
    const testBackendConnection = async () => {
        try {
            const response = await axios.get('http://localhost:4000/api/health', {
                timeout: 5000
            });
            console.log('Backend connection successful:', response.data);
        } catch (err) {
            console.error('Backend connection failed:', err);
            setError('Cannot connect to server. Make sure backend is running on port 4000');
        }
    };

    const fetchAssessments = async () => {
        setLoading(true);
        setError('');
        try {
            console.log('Fetching from:', `${API_BASE_URL}/assessments`);
            console.log('Using headers:', getHeaders());
            
            const response = await axios.get(`${API_BASE_URL}/assessments`, {
                headers: getHeaders(),
                timeout: 10000,
                withCredentials: true // Include cookies if using session auth
            });
            
            console.log('Response:', response.data);
            
            if (response.data.success) {
                setAssessments(response.data.data || []);
            } else {
                setError(response.data.message || 'Failed to fetch assessments');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            console.error('Fetch error details:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please login again.');
                // Optional: redirect to login
                // setTimeout(() => window.location.href = '/login/admin', 2000);
            } else if (err.code === 'ECONNABORTED') {
                setError('Request timeout - server not responding');
            } else if (err.response) {
                setError(`Server error: ${err.response.status}`);
            } else if (err.request) {
                setError('Cannot connect to server. Make sure backend is running on port 4000');
            } else {
                setError(err.message || 'Failed to fetch assessments');
            }
            setTimeout(() => setError(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssessment = async (e) => {
        e.preventDefault();
        if (!newAssessment.trim()) {
            setError('Assessment name is required');
            setTimeout(() => setError(''), 3000);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`${API_BASE_URL}/assessments`, {
                name: newAssessment.trim()
            }, {
                headers: getHeaders(),
                withCredentials: true
            });

            if (response.data.success) {
                setSuccess('Assessment added successfully');
                setNewAssessment('');
                await fetchAssessments();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to add assessment');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            console.error('Add error:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please login again.');
            } else if (err.response?.status === 400) {
                setError(err.response.data.message || 'Maximum 2 assessments allowed');
            } else {
                setError('Failed to add assessment. Please try again.');
            }
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAssessment = async (id, currentName) => {
        const newName = prompt('Enter new assessment name:', currentName);
        if (!newName || newName.trim() === currentName) return;
        
        if (!newName.trim()) {
            setError('Assessment name cannot be empty');
            setTimeout(() => setError(''), 3000);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.put(`${API_BASE_URL}/assessments/${id}`, {
                name: newName.trim()
            }, {
                headers: getHeaders(),
                withCredentials: true
            });

            if (response.data.success) {
                setSuccess('Assessment updated successfully');
                await fetchAssessments();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to update assessment');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            console.error('Update error:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please login again.');
            } else {
                setError('Failed to update assessment');
            }
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAssessment = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.delete(`${API_BASE_URL}/assessments/${id}`, {
                headers: getHeaders(),
                withCredentials: true
            });

            if (response.data.success) {
                setSuccess('Assessment deleted successfully');
                await fetchAssessments();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to delete assessment');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            console.error('Delete error:', err);
            if (err.response?.status === 401) {
                setError('Authentication failed. Please login again.');
            } else {
                setError('Failed to delete assessment');
            }
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 shadow-2xl">
                        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-700 font-medium">Processing...</p>
                    </div>
                </div>
            )}
            
            {/* Error Alert */}
            {error && (
                <div className="fixed top-5 right-5 z-50 transition-all duration-300 ease-out">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md">
                        <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
                        <span className="flex-1 text-sm">{error}</span>
                        <button 
                            onClick={() => setError('')} 
                            className="text-red-500 hover:text-red-700 font-bold text-xl ml-2"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            
            {/* Success Alert */}
            {success && (
                <div className="fixed top-5 right-5 z-50 transition-all duration-300 ease-out">
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md">
                        <i className="fas fa-check-circle text-green-500 text-xl"></i>
                        <span className="flex-1 text-sm">{success}</span>
                        <button 
                            onClick={() => setSuccess('')} 
                            className="text-green-500 hover:text-green-700 font-bold text-xl ml-2"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <i className="fas fa-clipboard-list text-green-600"></i>
                        Assessment Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage your school assessments (Maximum 2 assessments allowed)</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Panel - Assessment List */}
                    <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <i className="fas fa-tasks"></i>
                                Assessments List
                                <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                                    {assessments.length} / 2
                                </span>
                            </h2>
                        </div>
                        
                        <div className="overflow-x-auto p-6">
                            {assessments.length === 0 && !loading ? (
                                <div className="text-center py-12 text-gray-400">
                                    <i className="fas fa-inbox text-5xl mb-3 block"></i>
                                    <p>No assessments found</p>
                                    <p className="text-sm mt-2">Click "Add Assessment" to create one</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600">Assessment Name</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assessments.map((assessment, index) => (
                                            <tr key={assessment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                                                <td className="py-3 px-4 font-medium text-gray-800">
                                                    {assessment.name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateAssessment(assessment.id, assessment.name)}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all hover:scale-105"
                                                        >
                                                            <i className="fas fa-edit text-xs"></i>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAssessment(assessment.id, assessment.name)}
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all hover:scale-105"
                                                        >
                                                            <i className="fas fa-trash text-xs"></i>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Add Assessment Form */}
                    <div className="w-full lg:w-96 bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <i className="fas fa-plus-circle"></i>
                                Add New Assessment
                            </h2>
                        </div>
                        
                        <form onSubmit={handleAddAssessment} className="p-6">
                            <div className="mb-5">
                                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                                    Assessment Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newAssessment}
                                    onChange={(e) => setNewAssessment(e.target.value)}
                                    placeholder="e.g., Mid-term Exam, Final Exam"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    maxLength="100"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Maximum 100 characters
                                </p>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading || assessments.length >= 2}
                                className={`w-full font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                                    assessments.length >= 2
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-[1.02] text-white'
                                }`}
                            >
                                <i className="fas fa-save"></i>
                                {assessments.length >= 2 ? 'Maximum Assessments Reached' : 'Add Assessment'}
                            </button>
                        </form>

                        {/* Info Card */}
                        <div className="mx-6 mb-6 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <i className="fas fa-info-circle"></i>
                                Important Information
                            </h3>
                            <ul className="text-sm space-y-2">
                                <li className="flex items-start gap-2">
                                    <i className="fas fa-check-circle text-green-300 mt-0.5"></i>
                                    <span>Maximum of <strong>2 assessments</strong> allowed at a time</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <i className="fas fa-edit text-yellow-300 mt-0.5"></i>
                                    <span>Use <strong>Edit</strong> to modify existing assessment names</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <i className="fas fa-trash text-red-300 mt-0.5"></i>
                                    <span>Use <strong>Delete</strong> to remove an assessment (cannot be undone)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAssessment;