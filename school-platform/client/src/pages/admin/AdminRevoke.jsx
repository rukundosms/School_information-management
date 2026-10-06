import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrantTeachers, isAdmin } from '../../api/client';

const AdminRevoke = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    console.log('AdminRevoke - Checking auth');
    if (!isAdmin()) {
      console.log('Not admin, redirecting to login');
      navigate('/login/admin');
      return;
    }
    await fetchTeachers();
  };

  const fetchTeachers = async () => {
    try {
      console.log('Fetching teachers for revoke');
      const response = await getGrantTeachers();
      console.log('Teachers response:', response);
      setTeachers(response.teachers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleRevokePermission = (teacherId) => {
    console.log('Navigating to remove with teacherId:', teacherId);
    navigate(`/admin/remove?id=${teacherId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen flex-col">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <center>
        <div className="w-full">
          <h1 className="text-2xl font-bold my-5">Choose teacher To Revoke Grant</h1>
          {teachers.length === 0 ? (
            <p>No teachers found</p>
          ) : (
            teachers.map((teacher, index) => (
              <div key={teacher.tid} className="flex w-2/5 h-fit p-2.5 mt-0.5 bg-teal-50 rounded-lg mb-2 mx-auto">
                <p className="text-sm mt-1 h-fit w-fit font-light">
                  {index + 1}. {teacher.fname.toUpperCase()} {teacher.lname}
                </p>
                <button
                  onClick={() => handleRevokePermission(teacher.tid)}
                  className="bg-red-600 text-white text-xs uppercase rounded-md font-bold px-3 py-1 ml-1 hover:bg-red-700 transition-colors"
                >
                  revoke
                </button>
              </div>
            ))
          )}
        </div>
      </center>
    </div>
  );
};

export default AdminRevoke;