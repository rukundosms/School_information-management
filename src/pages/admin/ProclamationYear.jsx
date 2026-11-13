import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ProclamationYear = () => {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing session data when entering year selection (matching PHP behavior)
    sessionStorage.removeItem('year');
    sessionStorage.removeItem('proclamation_year');
    sessionStorage.removeItem('term');
    sessionStorage.removeItem('proclamation_term');
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    await fetchYears();
  };

  const fetchYears = async () => {
    try {
      const response = await apiFetch('/api/admin/proclamation-years');
      console.log('Years response:', response);
      setYears(response.years || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching years:', error);
      setError(error.body?.error || 'Failed to fetch years');
      setLoading(false);
    }
  };

  const handleYearSelect = (year) => {
    // Store exactly as PHP would: $_SESSION['year'] = $year;
    sessionStorage.setItem('year', year);
    sessionStorage.setItem('proclamation_year', year);
    console.log('Year saved to session:', sessionStorage.getItem('year'));
    console.log('All session storage:', sessionStorage);
    navigate('/admin/proclamation-term');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading years...</div>
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
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
      <div className="w-full max-w-4xl bg-white rounded-lg p-8 shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Choose Year</h1>
        {years.length === 0 ? (
          <p className="text-red-500 text-lg">No marks entered in system</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {years.map((year, index) => (
              <button
                key={index}
                onClick={() => handleYearSelect(year)}
                className="flex-1 min-w-[200px] max-w-[250px] py-5 bg-blue-500 text-white text-xl font-bold rounded-lg shadow-md transition-all hover:bg-blue-600 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProclamationYear;