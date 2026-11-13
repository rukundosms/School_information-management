import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ReportTerm = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasYearlyReport, setHasYearlyReport] = useState(false);
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
    const yearId = sessionStorage.getItem('report_year');
    
    if (!classId || !yearId) {
      navigate('/admin/report');
      return;
    }
    
    await fetchTerms();
  };

  const fetchTerms = async () => {
    try {
      const classId = sessionStorage.getItem('report_cl');
      const yearId = sessionStorage.getItem('report_year');
      
      const response = await apiFetch(`/api/admin/available-terms?classId=${classId}&yearId=${yearId}`);
      setTerms(response.terms || []);
      setHasYearlyReport(response.hasYearlyReport || false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching terms:', error);
      setLoading(false);
    }
  };

  const handleTermSelect = (term) => {
    sessionStorage.setItem('report_term', term);
    navigate('/admin/report-card');
  };

  const handleYearlyReport = () => {
    navigate('/admin/yearly-report');
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
      <div className="w-full max-w-2xl bg-white rounded-lg p-8 shadow-md">
        <h1 className="text-3xl mb-8 text-center text-gray-800">Choose Term</h1>
        <div className="flex flex-col gap-4">
          {terms.map((term) => (
            <button
              key={term}
              onClick={() => handleTermSelect(term)}
              className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-md cursor-pointer transition-all hover:bg-green-700 hover:-translate-y-1 hover:shadow-md"
            >
              Term {term}
            </button>
          ))}
          {hasYearlyReport && (
            <button
              onClick={handleYearlyReport}
              className="w-full p-5 bg-blue-600 text-white font-bold text-xl rounded-md cursor-pointer transition-all hover:bg-blue-700 hover:-translate-y-1 hover:shadow-md"
            >
              Yearly Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportTerm;