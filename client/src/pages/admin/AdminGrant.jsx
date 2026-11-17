import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrantTeachers, isAdmin } from '../../api/client';

const AdminGrant = () => {
  const [teachers, setTeachers] = useState([]);
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
    fetchTeachers();
  };

  const fetchTeachers = async () => {
    try {
      const response = await getGrantTeachers();
      setTeachers(response.teachers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      if (error.status === 401) {
        navigate('/login/admin');
      }
      setLoading(false);
    }
  };

  const handleGrantPermission = (teacherId) => {
    navigate(`/admin/permition?id=${teacherId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="w-full">
      <center>
        <div className="w-full">
          <h1 className="text-2xl font-bold my-5">Choose teacher To give Grant</h1>
          {teachers.map((teacher, index) => (
            <div key={teacher.tid} className="flex w-2/5 h-fit p-2.5 mt-0.5 bg-teal-50 rounded-lg mb-2 mx-auto">
              <p className="text-sm mt-1 h-fit w-fit font-light">
                {index + 1}. {teacher.fname.toUpperCase()} {teacher.lname}
              </p>
              <button
                onClick={() => handleGrantPermission(teacher.tid)}
                className="bg-green-600 text-white text-xs uppercase rounded-md font-bold px-3 py-1 ml-1 hover:bg-green-700 transition-colors"
              >
                Garant
              </button>
            </div>
          ))}
        </div>
      </center>
    </div>
  );
};

export default AdminGrant;