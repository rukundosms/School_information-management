import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ProclamationTerm = () => {
  const [terms, setTerms] = useState([]);
  const [hasYearlyReport, setHasYearlyReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    
    // Get year from sessionStorage - check both possible keys
    let year = sessionStorage.getItem('year');
    if (!year) year = sessionStorage.getItem('proclamation_year');
    
    console.log('Retrieved year from session:', year);
    console.log('All session storage:', sessionStorage);
    
    if (!year) {
      console.log('No year found, redirecting to year selection');
      navigate('/admin/proclamation-year');
      return;
    }
    
    await fetchTerms(year);
  };

  const fetchTerms = async (year) => {
    try {
      console.log('Fetching terms for year:', year);
      const response = await apiFetch(`/api/admin/proclamation-terms?year=${encodeURIComponent(year)}`);
      console.log('Terms response:', response);
      setTerms(response.terms || []);
      setHasYearlyReport(response.hasYearlyReport || false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching terms:', error);
      setError(error.body?.error || 'Failed to fetch terms');
      setLoading(false);
    }
  };

  const handleTermSelect = (termNumber) => {
    // Store exactly as PHP would: $_SESSION['term'] = $termNumber;
    sessionStorage.setItem('term', termNumber);
    sessionStorage.setItem('proclamation_term', termNumber);
    console.log('Term saved to session:', sessionStorage.getItem('term'));
    navigate('/admin/proclamation');
  };

  const handleYearlyReport = () => {
    // Store exactly as PHP would: $_SESSION['term'] = "year";
    sessionStorage.setItem('term', 'year');
    sessionStorage.setItem('proclamation_term', 'year');
    console.log('Yearly term saved to session');
    navigate('/admin/proclamation');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading terms...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center max-w-md">
          <h1 className="text-2xl text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem('year');
              sessionStorage.removeItem('proclamation_year');
              sessionStorage.removeItem('term');
              sessionStorage.removeItem('proclamation_term');
              navigate('/admin/proclamation-year');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back to Year Selection
          </button>
        </div>
      </div>
    );
  }

  if (terms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <h1 className="text-2xl text-red-600 mb-4">No Terms Found</h1>
          <p className="text-gray-600 mb-4">
            No terms available for the selected year. Please check if marks have been entered for year {sessionStorage.getItem('year') || sessionStorage.getItem('proclamation_year')}.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('year');
              sessionStorage.removeItem('proclamation_year');
              sessionStorage.removeItem('term');
              sessionStorage.removeItem('proclamation_term');
              navigate('/admin/proclamation-year');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back to Year Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
      <div className="w-full max-w-5xl bg-white rounded-lg p-8 shadow-md text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-8">Select Term for Proclamation</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {terms.map((term) => (
            <button
              key={term}
              onClick={() => handleTermSelect(term)}
              className="flex flex-col items-center justify-center p-5 min-h-[120px] bg-white text-green-600 text-2xl font-semibold rounded-lg border-2 border-green-600 shadow-md transition-all hover:bg-green-600 hover:text-white hover:-translate-y-2 hover:shadow-lg"
            >
              <i className="fas fa-calendar-alt text-3xl mb-2"></i>
              Term {term}
            </button>
          ))}
          {hasYearlyReport && (
            <button
              onClick={handleYearlyReport}
              className="flex flex-col items-center justify-center p-5 min-h-[120px] bg-green-700 text-white text-2xl font-semibold rounded-lg border-2 border-green-700 shadow-md transition-all hover:bg-green-800 hover:-translate-y-2 hover:shadow-lg md:col-span-2 lg:col-span-3"
            >
              <i className="fas fa-calendar-check text-3xl mb-2"></i>
              Annual Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProclamationTerm;