import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getGrantTeacher, 
  getGrantModules, 
  checkTeacherPermission, 
  checkClassPermission, 
  grantPermission,
  isAdmin 
} from '../../api/client';

const PermissionModules = () => {
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState({
    level: '',
    name: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    
    const teacherId = sessionStorage.getItem('teacher');
    const classId = sessionStorage.getItem('cl');
    const level = sessionStorage.getItem('level');
    
    if (!teacherId || !classId) {
      navigate('/admin/grant');
      return;
    }

    setClassInfo({
      level: level || '',
      name: sessionStorage.getItem('name') || ''
    });

    await fetchTeacherInfo(teacherId);
    await fetchModules(classId);
  };

  const fetchTeacherInfo = async (teacherId) => {
    try {
      const response = await getGrantTeacher(teacherId);
      setTeacherInfo(response.teacher);
    } catch (error) {
      console.error('Error fetching teacher info:', error);
    }
  };

  const fetchModules = async (classId) => {
    try {
      const response = await getGrantModules(classId);
      setModules(response.modules || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching modules:', error);
      setLoading(false);
    }
  };

  const handleModuleSelect = async (module) => {
    const teacherId = sessionStorage.getItem('teacher');
    const classId = sessionStorage.getItem('cl');
    
    try {
      // Check if teacher already has this permission
      const teacherCheck = await checkTeacherPermission({
        cid: classId,
        mid: module.moid,
        tid: teacherId
      });

      if (teacherCheck.exists) {
        alert('You already have this permission');
        navigate('/admin/permision-module');
        return;
      }

      // Check if permission exists for this class and module
      const classCheck = await checkClassPermission({
        cid: classId,
        mid: module.moid
      });

      if (classCheck.exists) {
        alert('This permission already exists for this class');
        navigate('/admin/permision-module');
        return;
      }

      // Grant permission
      await grantPermission({
        cid: classId,
        tid: teacherId,
        mid: module.moid
      });

      alert('Permission granted successfully');
      navigate('/admin/permision-module');
    } catch (error) {
      console.error('Error granting permission:', error);
      alert(error.body?.error || 'Error granting permission');
    }
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
              <h1 className="text-2xl font-bold">{classInfo.level}</h1>
            </div>
          )}
          <h1 className="text-2xl font-bold my-5">Choose module</h1>
          <div className="flex flex-wrap justify-center">
            {modules.map((module) => (
              <button
                key={module.moid}
                onClick={() => handleModuleSelect(module)}
                className="w-1/5 h-24 m-2.5 bg-white text-black font-normal text-3xl border-none shadow-md shadow-green-200 rounded-md cursor-pointer transition-transform hover:scale-105"
              >
                {module.mname}
              </button>
            ))}
          </div>
        </div>
      </center>
    </div>
  );
};

export default PermissionModules;