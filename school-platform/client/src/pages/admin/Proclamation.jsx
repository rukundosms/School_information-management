import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';

const Proclamation = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const navigate = useNavigate();
  const reportContentRef = useRef();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    if (!isAdmin()) {
      navigate('/login/admin');
      return;
    }
    
    // Get year and term from sessionStorage - check both possible keys
    let year = sessionStorage.getItem('year');
    if (!year) year = sessionStorage.getItem('proclamation_year');
    
    let term = sessionStorage.getItem('term');
    if (!term) term = sessionStorage.getItem('proclamation_term');
    
    console.log('Session data - Year:', year, 'Term:', term);
    
    if (!year) {
      navigate('/admin/proclamation-year');
      return;
    }
    
    if (!term) {
      navigate('/admin/proclamation-term');
      return;
    }
    
    await fetchReportData(year, term);
  };

  const fetchReportData = async (year, term) => {
    try {
      const response = await apiFetch(`/api/admin/proclamation?year=${encodeURIComponent(year)}&term=${term}`);
      console.log('Report data response:', response);
      
      if (!response.topPerformers && !response.bottomPerformers && !response.classes) {
        setError('No ranking data found for the selected criteria');
      } else if (response.topPerformers?.length === 0 && response.bottomPerformers?.length === 0 && response.classes?.length === 0) {
        setError('No students have marks data for the selected term and year.');
      } else {
        setReportData(response);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching proclamation data:', error);
      setError(error.body?.error || 'Failed to fetch report data');
      setLoading(false);
    }
  };

  const generatePrintHTML = () => {
    const content = reportContentRef.current.innerHTML;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Ranking Report</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; padding: 20px; }
            .print-container { max-width: 1200px; margin: 0 auto; background: white; }
            .report-card { page-break-after: always; margin-bottom: 0; background: white; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid black; padding: 6px; text-align: center; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-left { text-align: left; }
            .module-category { background-color: #e0e0e0; font-weight: bold; }
            .gold { background-color: #FFD700 !important; font-weight: bold; }
            .silver { background-color: #C0C0C0 !important; font-weight: bold; }
            .bronze { background-color: #CD7F32 !important; font-weight: bold; color: white; }
            .warning-row { background-color: #fff3cd !important; }
            .danger-row { background-color: #f8d7da !important; }
            @media print {
              body { padding: 0; }
              .report-card { page-break-after: always; margin: 0; }
              @page { size: A4; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">${content}</div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const printHTML = generatePrintHTML();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          setIsPrinting(false);
        }, 500);
      };
    }, 100);
  };

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'text-green-700', bg: 'bg-green-100' };
    if (percentage >= 80) return { text: 'Very Good', color: 'text-blue-700', bg: 'bg-blue-100' };
    if (percentage >= 60) return { text: 'Good', color: 'text-teal-700', bg: 'bg-teal-100' };
    if (percentage >= 50) return { text: 'Average', color: 'text-yellow-700', bg: 'bg-yellow-100' };
    if (percentage >= 40) return { text: 'Needs Improvement', color: 'text-orange-700', bg: 'bg-orange-100' };
    return { text: 'Failed', color: 'text-red-700', bg: 'bg-red-100' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading report data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center max-w-md">
          <h1 className="text-2xl text-red-600 font-bold mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem('year');
              sessionStorage.removeItem('proclamation_year');
              sessionStorage.removeItem('term');
              sessionStorage.removeItem('proclamation_term');
              navigate('/admin/proclamation-year');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Year Selection
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <h1 className="text-2xl text-red-600 font-bold mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-4">No ranking data found for the selected term and year.</p>
          <button
            onClick={() => {
              sessionStorage.removeItem('year');
              sessionStorage.removeItem('proclamation_year');
              sessionStorage.removeItem('term');
              sessionStorage.removeItem('proclamation_term');
              navigate('/admin/proclamation-year');
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Year Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div ref={reportContentRef}>
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          {/* Report Header */}
          <div className="text-center mb-8 pb-4 border-b-4 border-green-500">
            <h1 className="text-2xl font-bold text-green-600 mb-1">Collegio Santo Antonio Maria Zaccaria TSS/Gicumbi</h1>
            <h2 className="text-lg text-gray-600 mb-1">STUDENT RANKING REPORT - {reportData.termName}</h2>
            <p className="text-sm text-gray-500">Academic Year: {reportData.actualYear}</p>
            <p className="text-xs text-gray-400 mt-2">Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Top 20 Best Performers */}
          <div className="mb-10 break-inside-avoid">
            <h3 className="text-center text-xl font-bold text-green-600 mb-5 pb-2 border-b-2 border-green-600">
              TOP 20 BEST PERFORMERS - {reportData.termName} {reportData.actualYear}
            </h3>
            {reportData.topPerformers && reportData.topPerformers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="p-2 text-left w-[10%]">Rank</th>
                      <th className="p-2 text-left w-[35%]">Student Name</th>
                      <th className="p-2 text-left w-[25%]">Class</th>
                      <th className="p-2 text-left w-[15%]">Percentage (%)</th>
                      <th className="p-2 text-left w-[15%]">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topPerformers.map((student, idx) => {
                      const performance = getPerformanceLevel(student.percentage);
                      let rowClass = '';
                      if (idx === 0) rowClass = 'bg-yellow-100 font-bold';
                      else if (idx === 1) rowClass = 'bg-gray-200 font-bold';
                      else if (idx === 2) rowClass = 'bg-amber-700 text-white font-bold';
                      return (
                        <tr key={student.sid} className={`${rowClass} border-b border-gray-200 hover:bg-gray-50`}>
                          <td className="p-2">{student.rank}</td>
                          <td className="p-2">{student.name}</td>
                          <td className="p-2">{student.class}</td>
                          <td className="p-2 font-semibold">{student.percentage}%</td>
                          <td className="p-2">
                            <span className={`${performance.bg} ${performance.color} px-2 py-1 rounded-full text-xs font-semibold`}>
                              {performance.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="p-2 text-center text-gray-500 italic text-sm">
                        Top 20 Students based on {reportData.termName} performance
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-5">No students have marks data for {reportData.termName} to rank.</p>
            )}
          </div>

          {/* Bottom 20 Performers */}
          <div className="mb-10 break-inside-avoid">
            <h3 className="text-center text-xl font-bold text-green-600 mb-5 pb-2 border-b-2 border-green-600">
              BOTTOM 20 PERFORMERS - {reportData.termName} {reportData.actualYear}
            </h3>
            {reportData.bottomPerformers && reportData.bottomPerformers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="p-2 text-left w-[15%]">School Rank</th>
                      <th className="p-2 text-left w-[35%]">Student Name</th>
                      <th className="p-2 text-left w-[25%]">Class</th>
                      <th className="p-2 text-left w-[15%]">Percentage (%)</th>
                      <th className="p-2 text-left w-[10%]">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.bottomPerformers.map((student) => {
                      const performance = getPerformanceLevel(student.percentage);
                      let rowClass = '';
                      if (student.percentage < 40) rowClass = 'bg-red-50';
                      else if (student.percentage < 50) rowClass = 'bg-yellow-50';
                      return (
                        <tr key={student.sid} className={`${rowClass} border-b border-gray-200`}>
                          <td className="p-2">{student.schoolRank}</td>
                          <td className="p-2">{student.name}</td>
                          <td className="p-2">{student.class}</td>
                          <td className="p-2 font-semibold">{student.percentage}%</td>
                          <td className="p-2">
                            <span className={`${performance.bg} ${performance.color} px-2 py-1 rounded-full text-xs font-semibold`}>
                              {performance.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="p-2 text-center text-gray-500 italic text-sm">
                        Bottom 20 Students | Total Students with {reportData.termName} Marks: {reportData.totalStudentsWithMarks}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 italic py-5">No students have marks data for {reportData.termName} to rank.</p>
            )}
          </div>

          {/* Class-wise Ranking */}
          <div className="mb-10 break-inside-avoid">
            <h3 className="text-center text-xl font-bold text-green-600 mb-5 pb-2 border-b-2 border-green-600">
              CLASS-WISE RANKING - {reportData.termName} {reportData.actualYear}
            </h3>
            {reportData.classes && reportData.classes.map((classData, classIdx) => (
              <div key={classIdx} className="border-2 border-gray-300 rounded-lg mb-6 p-4 break-inside-avoid">
                <div className="text-center mb-4 pb-2 border-b-2 border-green-600">
                  <h4 className="text-lg font-bold text-green-600">{classData.className}</h4>
                  <p className="text-xs text-gray-500">{reportData.termName} Performance Ranking | Students with marks: {classData.studentsWithMarks}</p>
                </div>
                {classData.students && classData.students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-green-600 text-white">
                          <th className="p-2 text-left w-[15%]">Class Rank</th>
                          <th className="p-2 text-left w-[55%]">Student Name</th>
                          <th className="p-2 text-left w-[15%]">Percentage (%)</th>
                          <th className="p-2 text-left w-[15%]">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classData.students.map((student, idx) => {
                          const performance = getPerformanceLevel(student.percentage);
                          let rowClass = '';
                          if (idx === 0) rowClass = 'bg-yellow-100 font-bold';
                          else if (idx === 1) rowClass = 'bg-gray-200 font-bold';
                          else if (idx === 2) rowClass = 'bg-amber-700 text-white font-bold';
                          return (
                            <tr key={student.sid} className={`${rowClass} border-b border-gray-200`}>
                              <td className="p-2">{student.classRank}</td>
                              <td className="p-2">{student.name}</td>
                              <td className="p-2 font-semibold">{student.percentage}%</td>
                              <td className="p-2">
                                <span className={`${performance.bg} ${performance.color} px-2 py-1 rounded-full text-xs font-semibold`}>
                                  {performance.text}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4" className="p-2 text-center text-gray-500 italic text-sm">
                            School Manager: _________________________________________ | Date: {new Date().toLocaleDateString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 italic py-5">No students in this class have {reportData.termName} marks to rank.</p>
                )}
                <div className="text-center text-gray-400 text-xs pt-3 mt-3 border-t border-gray-200">
                  End of {classData.className} Ranking Report - {reportData.termName} {reportData.actualYear}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="px-5 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg transition-all hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {isPrinting ? 'Preparing...' : 'Print Report'}
        </button>
      </div>
    </div>
  );
};

export default Proclamation;