import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../../api/client';

const RevokeModule = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      console.log('RevokeModule - Component mounted');
      
      // Check admin authentication
      if (!isAdmin()) {
        console.log('Not admin, redirecting to login');
        navigate('/login/admin');
        return;
      }
      
      // Get teacher and class from sessionStorage (as PHP does)
      const teacherId = sessionStorage.getItem('teacher');
      const classId = sessionStorage.getItem('cl');
      
      console.log('SessionStorage teacher:', teacherId);
      console.log('SessionStorage class:', classId);
      
      if (!teacherId || !classId) {
        console.log('Missing teacher or class, redirecting to revoke');
        navigate('/admin/revoke');
        return;
      }
      
      try {
        const token = JSON.parse(localStorage.getItem('school_portal_auth') || '{}').token;
        console.log('Fetching modules for revoke');
        
        const response = await fetch(`/api/admin/teacher-modules-revoke/${teacherId}/${classId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('Modules response:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch modules');
        }
        
        setModules(data.modules || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const handleModuleRevoke = async (module) => {
    const teacherId = sessionStorage.getItem('teacher');
    const classId = sessionStorage.getItem('cl');
    
    console.log('Revoking module:', module.mname);
    console.log('Teacher ID:', teacherId);
    console.log('Class ID:', classId);
    
    try {
      const token = JSON.parse(localStorage.getItem('school_portal_auth') || '{}').token;
      
      const response = await fetch('/api/admin/revoke-permission', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cid: classId,
          tid: teacherId,
          mid: module.moid
        })
      });
      
      const data = await response.json();
      console.log('Revoke response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke permission');
      }
      
      alert('permission revoked');
      navigate('/admin/revoke');
    } catch (err) {
      console.error('Error revoking permission:', err);
      alert(err.message || 'Error revoking permission');
    }
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
        <div className="w-full h-screen">
          <h1 className="text-2xl font-bold my-5">Choose module</h1>
          {modules.length === 0 ? (
            <h1 className="text-xl text-red-600 mt-10">No modules found</h1>
          ) : (
            <div className="flex flex-wrap justify-center">
              {modules.map((module) => (
                <button
                  key={module.moid}
                  onClick={() => handleModuleRevoke(module)}
                  className="w-fit h-24 m-2.5 bg-white text-black font-normal text-3xl border-none shadow-md shadow-red-200 rounded-md cursor-pointer transition-transform hover:scale-105 hover:bg-red-50 px-8"
                >
                  {module.mname}
                </button>
              ))}
            </div>
          )}
        </div>
      </center>
    </div>
  );
};

export default RevokeModule;