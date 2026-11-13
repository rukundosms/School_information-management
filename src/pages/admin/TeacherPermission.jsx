import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getGrantTeacher, getGrantClasses, isAdmin } from '../../api/client';

const TeacherPermission = () => {
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    
    const queryParams = new URLSearchParams(location.search);
    const teacherId = queryParams.get('id');
    
    if (!teacherId) {
      navigate('/admin/grant');
      return;
    }

    await fetchTeacherInfo(teacherId);
    await fetchClasses();
    sessionStorage.setItem('me', teacherId);
  };

  const fetchTeacherInfo = async (teacherId) => {
    try {
      const response = await getGrantTeacher(teacherId);
      setTeacherInfo(response.teacher);
    } catch (error) {
      console.error('Error fetching teacher info:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await getGrantClasses();
      setClasses(response.classes || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setLoading(false);
    }
  };

  const handleClassSelect = (classItem) => {
    sessionStorage.setItem('cl', classItem.cid);
    sessionStorage.setItem('level', classItem.level);
    sessionStorage.setItem('name', classItem.class_name);
    sessionStorage.setItem('teacher', sessionStorage.getItem('me'));
    navigate('/admin/permision-module');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="w-full">
      <center>
        <div className="w-full h-screen">
          {teacherInfo && (
            <div className="mb-5">
              <h1 className="text-2xl font-bold">
                {teacherInfo.fname.toUpperCase()} {teacherInfo.lname}
              </h1>
            </div>
          )}
          <h1 className="text-2xl font-bold my-5">choose class</h1>
          <div className="flex flex-wrap justify-center">
            {classes.map((classItem) => (
              <button
                key={classItem.cid}
                onClick={() => handleClassSelect(classItem)}
                className="w-1/5 h-24 m-2.5 bg-white text-black font-normal text-3xl border-none shadow-md shadow-green-200 rounded-md cursor-pointer transition-transform hover:scale-105"
              >
                {classItem.level}
              </button>
            ))}
          </div>
        </div>
      </center>
    </div>
  );
};

export default TeacherPermission;