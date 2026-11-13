import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Assessment = () => {
    const [assessments, setAssessments] = useState([]);
    const [newAssessment, setNewAssessment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // API Base URL - change to your backend URL
    const API_URL = 'http://localhost/your-project/api';

    // Fetch all assessments on component mount
    useEffect(() => {
        fetchAssessments();
    }, []);

    // Fetch assessments from API
    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/assessments.php`);
            if (response.data.success) {
                setAssessments(response.data.data);
            } else {
                setError(response.data.message);
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            setError('Failed to fetch assessments');
            console.error(err);
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    // Add new assessment
    const handleAddAssessment = async (e) => {
        e.preventDefault();
        if (!newAssessment.trim()) {
            setError('Assessment name is required');
            setTimeout(() => setError(''), 3000);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/assessments.php`, {
                action: 'add',
                name: newAssessment
            });

            if (response.data.success) {
                setSuccess('Assessment added successfully');
                setNewAssessment('');
                fetchAssessments();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message);
                setTimeout(() => setError(''), 3000);
            }
        } catch (err) {
            setError('Failed to add assessment');
            console.error(err);
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    // Delete assessment
    const handleDeleteAssessment = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            setLoading(true);
            try {
                const response = await axios.post(`${API_URL}/assessments.php`, {
                    action: 'delete',
                    id: id
                });

                if (response.data.success) {
                    setSuccess('Assessment deleted successfully');
                    fetchAssessments();
                    setTimeout(() => setSuccess(''), 3000);
                } else {
                    setError(response.data.message);
                    setTimeout(() => setError(''), 3000);
                }
            } catch (err) {
                setError('Failed to delete assessment');
                console.error(err);
                setTimeout(() => setError(''), 3000);
            } finally {
                setLoading(false);
            }
        }
    };

    // Update assessment
    const handleUpdateAssessment = async (id, currentName) => {
        const newName = prompt('Enter new assessment name:', currentName);
        if (newName && newName.trim() !== currentName) {
            setLoading(true);
            try {
                const response = await axios.post(`${API_URL}/assessments.php`, {
                    action: 'update',
                    id: id,
                    name: newName
                });

                if (response.data.success) {
                    setSuccess('Assessment updated successfully');
                    fetchAssessments();
                    setTimeout(() => setSuccess(''), 3000);
                } else {
                    setError(response.data.message);
                    setTimeout(() => setError(''), 3000);
                }
            } catch (err) {
                setError('Failed to update assessment');
                console.error(err);
                setTimeout(() => setError(''), 3000);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-2xl">
                        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-700 font-medium">Processing...</p>
                    </div>
                </div>
            )}
            
            {/* Alert Messages */}
            {error && (
                <div className="fixed top-5 right-5 z-50 animate-slide-in">
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
                        <i className="fas fa-exclamation-circle text-red-500"></i>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                    </div>
                </div>
            )}
            
            {success && (
                <div className="fixed top-5 right-5 z-50 animate-slide-in">
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
                        <i className="fas fa-check-circle text-green-500"></i>
                        <span className="flex-1">{success}</span>
                        <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 font-bold text-xl">&times;</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col md:flex-row min-h-screen p-5 gap-5">
                {/* Left Panel - Assessment List */}
                <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <i className="fas fa-tasks"></i>
                            Assessments
                        </h1>
                    </div>
                    
                    <div className="p-5 overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                    <th className="text-left p-4 font-semibold text-gray-700">No.</th>
                                    <th className="text-left p-4 font-semibold text-gray-700">Assessment Name</th>
                                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assessments.length > 0 ? (
                                    assessments.map((assessment, index) => (
                                        <tr key={assessment.AssNo} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-600">{index + 1}</td>
                                            <td className="p-4 font-medium text-gray-800">{assessment.AssName}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdateAssessment(assessment.AssNo, assessment.AssName)}
                                                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                                                    >
                                                        <i className="fas fa-edit text-xs"></i>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAssessment(assessment.AssNo, assessment.AssName)}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:scale-105"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="text-center p-12 text-gray-400">
                                            <i className="fas fa-inbox text-5xl mb-3 block"></i>
                                            No assessments found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel - Add Assessment Form */}
                <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-5">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <i className="fas fa-plus-circle"></i>
                            Add Assessment
                        </h1>
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
                                placeholder="Enter assessment name"
                                disabled={loading}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-save"></i>
                            Add Assessment
                        </button>
                    </form>

                    {/* Info Card */}
                    <div className="mx-6 mb-6 p-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <i className="fas fa-info-circle"></i>
                            Information
                        </h3>
                        <p className="text-sm mb-2 leading-relaxed">
                            You can add up to 2 assessments max. Use the edit option to modify existing assessments.
                        </p>
                        <p className="text-xs italic opacity-90">
                            Note: Deleting an assessment will remove all associated data.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add animation keyframes */}
            <style jsx>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Assessment;