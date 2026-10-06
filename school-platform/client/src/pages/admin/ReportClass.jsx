import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ReportClass = () => {
  const [classes, setClasses] = useState([]);
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
    await fetchClasses();
  };

  const fetchClasses = async () => {
    try {
      const response = await apiFetch('/api/admin/grant-classes');
      setClasses(response.classes || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setLoading(false);
    }
  };

  const handleClassSelect = (classItem) => {
    sessionStorage.setItem('report_cl', classItem.cid);
    sessionStorage.setItem('report_class_level', classItem.level);
    sessionStorage.setItem('report_class_name', classItem.class_name);
    navigate('/admin/report-year');
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
      <div className="w-full max-w-6xl bg-white rounded-lg p-8 shadow-md text-center">
        <h1 className="text-3xl mb-8 text-gray-800">Choose Class</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {classes.map((classItem) => (
            <button
              key={classItem.cid}
              onClick={() => handleClassSelect(classItem)}
              className="p-4 bg-white text-gray-800 font-bold text-lg shadow-md rounded-md cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              {classItem.level} {classItem.class_name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportClass;