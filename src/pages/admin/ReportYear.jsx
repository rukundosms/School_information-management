import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ReportYear = () => {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    
    const classId = sessionStorage.getItem('report_cl');
    if (!classId) {
      navigate('/admin/report');
      return;
    }
    
    await fetchYears();
  };

  const fetchYears = async () => {
    try {
      const response = await apiFetch('/api/admin/years-admin');
      setYears(response.years || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching years:', error);
      setLoading(false);
    }
  };

  const handleYearSelect = (yearItem) => {
    sessionStorage.setItem('report_year', yearItem.year_id);
    sessionStorage.setItem('report_year_label', yearItem.year);
    navigate('/admin/report-term');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
      <div className="w-full max-w-4xl bg-white rounded-lg p-8 shadow-md">
        <h1 className="text-3xl mb-8 text-center text-gray-800">Choose Year</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {years.map((yearItem) => (
            <button
              key={yearItem.year_id}
              onClick={() => handleYearSelect(yearItem)}
              className="p-5 bg-green-600 text-white text-lg rounded-md cursor-pointer transition-all hover:bg-green-700 hover:-translate-y-1 hover:shadow-md min-h-[80px] flex items-center justify-center relative"
            >
              {yearItem.year}
              {yearItem.status === 'active' && (
                <span className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-gray-800 px-2 py-1 rounded-full">
                  Current
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportYear;