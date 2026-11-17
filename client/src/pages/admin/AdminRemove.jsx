import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdmin } from '../../api/client';

const AdminRemove = () => {
  const [permittedClasses, setPermittedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      console.log('AdminRemove - Component mounted');
      
      // Check admin authentication
      if (!isAdmin()) {
        console.log('Not admin, redirecting to login');
        navigate('/login/admin');
        return;
      }
      
      // Get teacher ID from URL
      const queryParams = new URLSearchParams(location.search);
      const teacherId = queryParams.get('id');
      console.log('Teacher ID from URL:', teacherId);
      
      if (!teacherId) {
        console.log('No teacher ID, redirecting to revoke');
        navigate('/admin/revoke');
        return;
      }
      
      // Store teacher ID in sessionStorage (as PHP does with $_SESSION['teacher'])
      sessionStorage.setItem('teacher', teacherId);
      console.log('Stored teacher in sessionStorage:', sessionStorage.getItem('teacher'));
      
      try {
        // Fetch permitted classes
        const token = JSON.parse(localStorage.getItem('school_portal_auth') || '{}').token;
        console.log('Fetching permitted classes for teacher:', teacherId);
        
        const response = await fetch(`/api/admin/teacher-permitted-classes/${teacherId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('Permitted classes response:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch classes');
        }
        
        setPermittedClasses(data.classes || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching permitted classes:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [location, navigate]);

  const handleClassSelect = (classItem) => {
    console.log('Selected class:', classItem);
    // Store class ID in sessionStorage (as PHP does with $_SESSION['cl'])
    sessionStorage.setItem('cl', classItem.cid);
    console.log('Stored class in sessionStorage:', sessionStorage.getItem('cl'));
    console.log('Navigating to revoke_module');
    navigate('/admin/revoke_module');
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
          <h1 className="text-2xl font-bold my-5">Choose class</h1>
          {permittedClasses.length === 0 ? (
            <h1 className="text-xl text-red-600 mt-10">No permitted class</h1>
          ) : (
            <div className="flex flex-wrap justify-center">
              {permittedClasses.map((classItem) => (
                <button
                  key={classItem.cid}
                  onClick={() => handleClassSelect(classItem)}
                  className="w-1/5 h-24 m-2.5 bg-white text-black font-normal text-3xl border-none shadow-md shadow-red-200 rounded-md cursor-pointer transition-transform hover:scale-105"
                >
                  {classItem.level}
                </button>
              ))}
            </div>
          )}
        </div>
      </center>
    </div>
  );
};

export default AdminRemove;