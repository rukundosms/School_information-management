import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const ReportCard = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState('14px');
  const navigate = useNavigate();
  const printRef = useRef();

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
    const term = sessionStorage.getItem('report_term');
    
    console.log('ReportCard - Session Data:', { classId, yearId, term });
    
    if (!classId || !yearId || !term) {
      console.log('Missing session data, redirecting to report');
      navigate('/admin/report');
      return;
    }
    
    await fetchReportData(classId, yearId, term);
  };

  const fetchReportData = async (classId, yearId, term) => {
    try {
      console.log('Fetching report data for:', { classId, yearId, term });
      const response = await apiFetch(`/api/admin/report-card?classId=${classId}&yearId=${yearId}&term=${term}`);
      console.log('Report data response:', response);
      
      if (!response.students || response.students.length === 0) {
        setError('No students with marks found in this class');
      } else {
        setReportData(response);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError(error.body?.error || error.message || 'Failed to fetch report data');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFontChange = (e) => {
    const newSize = e.target.value;
    setFontSize(newSize);
  };

  const handleGoBack = () => {
    navigate('/admin/report-term');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center max-w-md">
          <h1 className="text-2xl text-red-600 mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.students || reportData.students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <h1 className="text-2xl text-red-600 mb-4">No Data Available</h1>
          <p className="text-gray-600">No students with marks found in this class</p>
          <button
            onClick={handleGoBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div ref={printRef}>
        {reportData.students.map((student, index) => (
          <div
            key={student.sid}
            className="report-card bg-white border border-gray-300 shadow-md mb-5 p-5 page-break-after-always relative"
            style={{ fontSize: fontSize, minHeight: '650px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 pt-2.5">
              <div className="w-2/5 pl-2.5">
                <p className="text-xs font-bold uppercase">Republic of Rwanda</p>
                <p className="text-xs">{reportData.school?.school_name || 'School Name'}</p>
                <p className="text-xs">{reportData.school?.district || 'District'}-{reportData.school?.secter || 'Sector'}</p>
                <p className="text-xs">{reportData.school?.phone || 'Phone'}</p>
              </div>
              <div className="w-1/5 text-center">
                <img src="/images/logo.jpg" alt="Logo" className="w-[90px] h-[90px] object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
              <div className="w-2/5 text-left pl-5">
                <p className="text-xs font-bold uppercase">Ministry of Education</p>
                <p className="text-xs">School year: {reportData.yearLabel || 'Year'}</p>
                <p className="text-xs">
                  {reportData.term}
                  <sup>
                    {reportData.term === 1 ? 'st' : reportData.term === 2 ? 'nd' : 'rd'}
                  </sup>{' '}
                  Term
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="text-2xl font-bold text-center border-y-2 border-black py-1 my-2.5">
              Report Card
            </div>

            {/* Student Info */}
            <div className="w-full min-h-[60px] p-1.5 text-left flex mb-2.5">
              <div className="w-3/5">
                <span className="text-sm font-medium">
                  Student Name: {student.firstname} {student.lastname}
                </span>
                <br />
                <span className="text-sm font-medium">
                  Class: {student.level || ''}{student.class_name || ''}
                </span>
                <br />
              </div>
              <div className="w-2/5">
                <span className="text-sm font-medium">No: {index + 1}</span>
                <br />
                <span className="text-sm font-medium">
                  Conduct: {student.conduct || 'Not entered'}
                </span>
              </div>
            </div>

            {/* Marks Table */}
            <table className="w-full border-collapse mt-2.5 text-xs">
              <thead>
                <tr>
                  <th rowSpan="2" className="border border-black p-1">All Subjects</th>
                  <th colSpan="3" className="border border-black p-1">Maximum</th>
                  <th colSpan="3" className="border border-black p-1">O.P</th>
                </tr>
                <tr>
                  <th className="border border-black p-1">EU</th>
                  <th className="border border-black p-1">ET</th>
                  <th className="border border-black p-1">ToT</th>
                  <th className="border border-black p-1">EU</th>
                  <th className="border border-black p-1">ET</th>
                  <th className="border border-black p-1">ToT</th>
                </tr>
              </thead>
              <tbody>
                {student.marks && student.marks.map((mark, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1 text-left pl-2.5">{mark.mname}</td>
                    <td className="border border-black p-1 text-center">{mark.ttotal || 0}</td>
                    <td className="border border-black p-1 text-center">{mark.etotal || 0}</td>
                    <td className="border border-black p-1 text-center">{(mark.ttotal || 0) + (mark.etotal || 0)}</td>
                    <td className="border border-black p-1 text-center">
                      {mark.module_type === 'specific' || mark.module_type === 'general' ? (
                        ((mark.test || 0) * 100 / (mark.ttotal || 1)) < 70 ? <u>{mark.test || 0}</u> : (mark.test || 0)
                      ) : (
                        ((mark.test || 0) * 100 / (mark.ttotal || 1)) < 50 ? <u>{mark.test || 0}</u> : (mark.test || 0)
                      )}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {mark.module_type === 'specific' || mark.module_type === 'general' ? (
                        ((mark.exam || 0) * 100 / (mark.etotal || 1)) < 70 ? <u>{mark.exam || 0}</u> : (mark.exam || 0)
                      ) : (
                        ((mark.exam || 0) * 100 / (mark.etotal || 1)) < 50 ? <u>{mark.exam || 0}</u> : (mark.exam || 0)
                      )}
                    </td>
                    <td className="border border-black p-1 text-center">{(mark.test || 0) + (mark.exam || 0)}</td>
                  </tr>
                ))}
                <tr>
                  <th className="border border-black p-1 text-left pl-2.5">Total</th>
                  <th className="border border-black p-1 text-center">{student.test_max || 0}</th>
                  <th className="border border-black p-1 text-center">{student.exam_max || 0}</th>
                  <th className="border border-black p-1 text-center">{student.max_marks || 0}</th>
                  <th className="border border-black p-1 text-center">{student.test || 0}</th>
                  <th className="border border-black p-1 text-center">{student.exam || 0}</th>
                  <th className="border border-black p-1 text-center">{student.total_marks || 0}</th>
                </tr>
                <tr>
                  <th className="border border-black p-1 text-left pl-2.5">Average</th>
                  <th className="border border-black p-1 text-center">{student.percentage || 0}%</th>
                  <th className="border border-black p-1 text-center">Rank</th>
                  <th colSpan="5" className="border border-black p-1 text-center">
                    {student.rank || '-'} out of {student.total_students || 0}
                  </th>
                </tr>
                <tr>
                  <td colSpan="7" className="border border-black p-1 h-[30px]"></td>
                </tr>
                <tr>
                  <td rowSpan="2" colSpan="3" className="border border-black p-2.5 align-top text-left">
                    <b>Observations</b>
                    <br />EU: End Unit
                    <br />ET: End Term
                    <br />ToT: Total of Term
                  </td>
                  <td colSpan="4" className="border border-black p-5 text-center">Teacher Signature</td>
                </tr>
                <tr>
                  <td colSpan="4" className="border border-black p-5 text-center">Parent Signature</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="fixed bottom-5 left-5 flex gap-2.5">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700"
        >
          Print Out
        </button>
        <select
          onChange={handleFontChange}
          value={fontSize}
          className="px-2.5 py-2.5 rounded-md border border-gray-300"
        >
          <option value="8px">8</option>
          <option value="9px">9</option>
          <option value="10px">10</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="22px">22</option>
          <option value="24px">24</option>
        </select>
      </div>

      <style jsx>{`
        @media print {
          .report-card {
            page-break-after: always;
            break-inside: avoid;
            margin: 0;
            padding: 10px;
          }
          button, select {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportCard;