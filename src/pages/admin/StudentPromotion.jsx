import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';

const StudentPromotion = () => {
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState({ active: [], inactive: [] });
  const [formData, setFormData] = useState({
    fromYear: '',
    toYear: '',
    promotedMarks: 50
  });
  const [result, setResult] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [promotionLog, setPromotionLog] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  // Fetch years on component mount
  useEffect(() => {
    fetchYears();
  }, []);

  // Fetch promotion log when showLog is true
  useEffect(() => {
    if (showLog) {
      fetchPromotionLog();
    }
  }, [showLog]);

  const fetchYears = async () => {
    setIsLoadingYears(true);
    setError('');
    try {
      console.log('Fetching years from API...');
      const response = await apiFetch('/api/admin/years');
      console.log('Years API response:', response);
      
      if (!response || !response.years) {
        throw new Error('Invalid response format from server');
      }
      
      const allYears = response.years || [];
      
      const activeYears = allYears.filter(y => y.status === 'active');
      const inactiveYears = allYears.filter(y => y.status !== 'active');
      
      console.log('Active years:', activeYears);
      console.log('Inactive years:', inactiveYears);
      
      setYears({ active: activeYears, inactive: inactiveYears });
      
      // Auto-select first active year if available
      if (activeYears.length > 0 && !formData.fromYear) {
        setFormData(prev => ({ ...prev, fromYear: activeYears[0].year_id.toString() }));
      }
      
      // Auto-select first inactive year if available
      if (inactiveYears.length > 0 && !formData.toYear) {
        setFormData(prev => ({ ...prev, toYear: inactiveYears[0].year_id.toString() }));
      }
    } catch (err) {
      console.error('Error fetching years:', err);
      setError(`Failed to load academic years: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoadingYears(false);
    }
  };

  const fetchPromotionLog = async () => {
    try {
      console.log('Fetching promotion log...');
      const response = await apiFetch('/api/admin/promotion-log');
      console.log('Promotion log response:', response);
      setPromotionLog(response.log || []);
    } catch (err) {
      console.error('Error fetching promotion log:', err);
      setError('Failed to load promotion log');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fromYear || !formData.toYear) {
      setError('Please select both From Year and To Year');
      return;
    }
    
    if (formData.fromYear === formData.toYear) {
      setError('From Year and To Year cannot be the same');
      return;
    }
    
    if (!confirm('Are you sure you want to run the promotion process? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setResult(null);
    
    try {
      console.log('Processing promotion with data:', {
        fromYear: formData.fromYear,
        toYear: formData.toYear,
        promotedMarks: formData.promotedMarks
      });
      
      const response = await apiFetch('/api/admin/process-promotion', {
        method: 'POST',
        body: JSON.stringify({
          fromYear: parseInt(formData.fromYear),
          toYear: parseInt(formData.toYear),
          promotedMarks: parseInt(formData.promotedMarks)
        })
      });
      
      console.log('Promotion response:', response);
      
      setResult(response);
      setSuccess(response.message || 'Promotion process completed successfully!');
      
      // Refresh years after promotion
      await fetchYears();
    } catch (err) {
      console.error('Error processing promotion:', err);
      setError(err.message || 'Failed to process promotion');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (action) => {
    switch(action) {
      case 'promoted': return 'bg-green-100 text-green-800 border-green-200';
      case 'repeated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'graduated': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'skipped': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getDecisionBadgeClass = (decision) => {
    switch(decision) {
      case 'Promoted': return 'bg-green-100 text-green-800';
      case 'Repeated': return 'bg-yellow-100 text-yellow-800';
      case 'Graduated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoadingYears) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic years...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <i className="fas fa-graduation-cap mr-3"></i>
                Student Promotion System
              </h1>
              <p className="text-purple-100">Promote students to the next academic year based on their performance</p>
            </div>
            {years.active[0] && (
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <i className="fas fa-calendar-check mr-2"></i>
                Current Year: {years.active[0].year}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
              <div>
                <h5 className="font-semibold text-red-800">Error</h5>
                <p className="text-red-700">{error}</p>
                <button 
                  onClick={() => fetchYears()} 
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Retry loading years
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <i className="fas fa-check-circle text-green-500 mr-3"></i>
              <div>
                <h5 className="font-semibold text-green-800">Success!</h5>
                <p className="text-green-700" dangerouslySetInnerHTML={{ __html: success }}></p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Promotion Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h5 className="text-white font-semibold text-lg">
                  <i className="fas fa-sliders-h mr-2"></i>
                  Promotion Settings
                </h5>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-arrow-left-circle mr-2 text-blue-500"></i>
                      From Year *
                    </label>
                    <select
                      name="fromYear"
                      value={formData.fromYear}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select current year...</option>
                      {years.active.map(year => (
                        <option key={year.year_id} value={year.year_id}>
                          {year.year} {year.status === 'active' ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                    {years.active.length === 0 && (
                      <p className="text-red-500 text-xs mt-1">No active years found. Please add an academic year first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-arrow-right-circle mr-2 text-green-500"></i>
                      To Year *
                    </label>
                    <select
                      name="toYear"
                      value={formData.toYear}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select next year...</option>
                      {years.inactive.map(year => (
                        <option key={year.year_id} value={year.year_id}>
                          {year.year}
                        </option>
                      ))}
                    </select>
                    {years.inactive.length === 0 && (
                      <p className="text-red-500 text-xs mt-1">No inactive years found. Please add a next academic year.</p>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <i className="fas fa-chart-line mr-2 text-purple-500"></i>
                    Promotion Marks Threshold *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="promotedMarks"
                      value={formData.promotedMarks}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter minimum marks required for promotion"
                      min="0"
                      max="100"
                      required
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">%</span>
                  </div>
                  <small className="text-gray-500 mt-1 block">
                    Students scoring equal or above this percentage will be promoted
                  </small>
                </div>

                <button
                  type="submit"
                  disabled={loading || years.active.length === 0 || years.inactive.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-rocket"></i>
                      Run Promotion Process
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Info Card */}
          <div>
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
              <div className="bg-blue-500 px-6 py-4">
                <h5 className="text-white font-semibold text-lg">
                  <i className="fas fa-info-circle mr-2"></i>
                  How It Works
                </h5>
              </div>
              <div className="p-6">
                <ol className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <span>Select the current year (From)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <span>Select the next academic year (To)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                    <span>Set minimum marks for promotion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                    <span>Click "Run Promotion Process"</span>
                  </li>
                </ol>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">System will:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Promote</span>
                      <span className="text-sm">if marks ≥ threshold & next class exists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">Repeat</span>
                      <span className="text-sm">if marks &lt; threshold</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">Graduate</span>
                      <span className="text-sm">if no next class exists</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {result && result.stats && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-green-600 px-6 py-4">
                  <h5 className="text-white font-semibold text-lg">
                    <i className="fas fa-chart-line mr-2"></i>
                    Quick Stats
                  </h5>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 text-center border-l-4 border-green-500">
                      <h3 className="text-2xl font-bold text-green-700">{result.stats.promoted || 0}</h3>
                      <small className="text-green-600">Promoted</small>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center border-l-4 border-yellow-500">
                      <h3 className="text-2xl font-bold text-yellow-700">{result.stats.repeated || 0}</h3>
                      <small className="text-yellow-600">Repeated</small>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center border-l-4 border-blue-500">
                      <h3 className="text-2xl font-bold text-blue-700">{result.stats.graduated || 0}</h3>
                      <small className="text-blue-600">Graduated</small>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center border-l-4 border-gray-500">
                      <h3 className="text-2xl font-bold text-gray-700">{result.stats.skipped || 0}</h3>
                      <small className="text-gray-600">Skipped</small>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-sm text-gray-600">
                      Total Processed: <strong>{result.stats.total || 0}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Processing Details */}
        {result && result.students && result.students.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gray-800 px-6 py-4">
              <h5 className="text-white font-semibold text-lg">
                <i className="fas fa-list-check mr-2"></i>
                Student Processing Details ({result.students.length} students)
              </h5>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {result.students.map((student, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionBadgeClass(student.action)}`}>
                        {student.action.charAt(0).toUpperCase() + student.action.slice(1)}
                      </span>
                      <strong className="text-gray-800">Student ID: {student.id}</strong>
                      {student.marks && (
                        <span className="text-gray-500 text-sm">(Marks: {student.marks}%)</span>
                      )}
                    </div>
                    <div>
                      <small className="text-gray-500">
                        {student.reason || (student.fromClass && student.toClass && `Class ${student.fromClass} → ${student.toClass}`)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => setShowLog(!showLog)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <i className="fas fa-journal-text"></i>
            {showLog ? 'Hide Promotion Log' : 'View Promotion Log'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        </div>

        {/* Promotion Log */}
        {showLog && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-yellow-500 px-6 py-4">
              <h5 className="text-white font-semibold text-lg">
                <i className="fas fa-history mr-2"></i>
                Promotion Log (Latest Records)
              </h5>
            </div>
            <div className="p-6 overflow-x-auto">
              {promotionLog.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Student ID</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Marks</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">From Class</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">To Class</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">From Year</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">To Year</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Decision</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotionLog.map((log, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">{log.sid}</td>
                        <td className="p-3">{log.total_marks}%</td>
                        <td className="p-3">{log.from_class}</td>
                        <td className="p-3">{log.to_class || 'N/A'}</td>
                        <td className="p-3">{log.from_year_name || log.from_year}</td>
                        <td className="p-3">{log.to_year_name || log.to_year}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getDecisionBadgeClass(log.decision)}`}>
                            {log.decision}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-inbox text-4xl mb-2"></i>
                  <p>No promotion records found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPromotion;