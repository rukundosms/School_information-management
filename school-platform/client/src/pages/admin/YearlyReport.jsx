import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, apiFetch } from '../../api/client';
import schoolLogo from '../../../dist/assets/log.png';
import rtbLogo from '../../../dist/assets/rtb.png';
import qrCode from '../../../dist/assets/qlcode.jpg';

const YearlyReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState('10px');
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
    
    const classId = sessionStorage.getItem('report_cl');
    const yearId = sessionStorage.getItem('report_year');
    
    if (!classId || !yearId) {
      navigate('/admin/report');
      return;
    }
    
    await fetchYearlyReport(classId, yearId);
  };

  const fetchYearlyReport = async (classId, yearId) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const response = await apiFetch(`/api/admin/yearly-report?classId=${classId}&yearId=${yearId}`);
      
      if (response.students && response.students.length > 0) {
        setReportData(response);
      } else {
        setError('No student records found for the selected academic year and class.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching yearly report:', error);
      setError(error.body?.error || error.message || 'Failed to fetch yearly report');
      setLoading(false);
    }
  };

  const generatePrintHTML = () => {
    const content = reportContentRef.current.innerHTML;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Yearly Report Card - ${reportData?.yearLabel || 'Report'}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              background: white;
              padding: 20px;
            }
            .print-container {
              width: 100%;
              max-width: 1200px;
              margin: 0 auto;
              background: white;
            }
            .report-card {
              page-break-after: always;
              page-break-inside: avoid;
              margin-bottom: 0;
              background: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid black;
              padding: 6px;
              text-align: center;
              vertical-align: top;
            }
            th {
              background-color: #f2f2f2;
              font-weight: 700;
            }
            td {
              font-weight: 500;
            }
            .text-left {
              text-align: left;
            }
            .module-category {
              background-color: #e0e0e0;
              font-weight: 700;
            }
            .footer {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .report-card {
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0;
              }
              @page {
                size: A4;
                margin: 0.5cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${content}
          </div>
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

  const handleFontChange = (e) => {
    const newSize = e.target.value;
    setFontSize(newSize);
  };

  const groupModulesByType = (modules) => {
    const grouped = {
      complementary: [],
      general: [],
      specific: []
    };
    
    modules.forEach(module => {
      if (module.module_type === 'complementary') {
        grouped.complementary.push(module);
      } else if (module.module_type === 'general') {
        grouped.general.push(module);
      } else if (module.module_type === 'specific') {
        grouped.specific.push(module);
      }
    });
    
    return grouped;
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
          <h1 className="text-2xl text-red-600 mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/report')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.students || reportData.students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-5">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <h1 className="text-2xl text-red-600 mb-4">No Data Available</h1>
          <p className="text-gray-600">No student records found for the selected academic year and class.</p>
          <button
            onClick={() => navigate('/admin/report')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Report Cards Container */}
      <div ref={reportContentRef} style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {reportData.students.map((student, index) => {
          const groupedModules = groupModulesByType(student.modules || []);
          let moduleCounter = 0;
          
          return (
            <div
              key={student.sid}
              className="report-card"
              style={{ 
                fontSize: fontSize,
                backgroundColor: 'white',
                marginBottom: '20px',
                padding: '15px',
                borderRadius: '5px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                pageBreakAfter: 'always',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                position: 'relative'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ width: '70px', textAlign: 'center' }}>
                  <img src={schoolLogo} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 'bold', border: '2px solid black', padding: '8px', margin: '0 15px' }}>
                  TRAINEE'S ASSESSMENT REPORT
                </div>
                <div style={{ width: '70px', textAlign: 'center' }}>
                  <img src={rtbLogo} alt="RTB" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                </div>
              </div>

              {/* School Info */}
              <div style={{ marginBottom: '15px', lineHeight: '1.4', fontSize: '10px', fontWeight: '500' }}>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>School Name:</strong> {reportData.school?.code}-{reportData.school?.school_name}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>E-mail:</strong> {reportData.school?.email}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>Telephone:</strong> {reportData.school?.phone}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>Qualification Code:</strong> {student.class_code || reportData.classInfo?.class_code}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>Qualification Name:</strong> {student.level || reportData.classInfo?.level} {student.class_name || reportData.classInfo?.class_name}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>Academic Year:</strong> {reportData.yearLabel}</p>
                <p style={{ fontWeight: '500' }}><strong style={{ fontWeight: '700' }}>Class:</strong> {student.level || reportData.classInfo?.level} {student.class_name || reportData.classInfo?.class_name}</p>
                <p style={{ fontWeight: '700' }}><strong style={{ fontWeight: '700' }}>Student Name:</strong> <u style={{ fontWeight: '700' }}>{student.firstname} {student.lastname}</u></p>
              </div>

              {/* Behavior Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '9px' }}>
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>Behavior</th>
                    <th style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>MAX</th>
                    <th colSpan="3" style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>TERM 1</th>
                    <th colSpan="3" style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>TERM 2</th>
                    <th colSpan="3" style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>TERM 3</th>
                    <th colSpan="4" style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>AVERAGE</th>
                  </tr>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '5px', fontWeight: '700' }}>40</th>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: '500' }}>{student.term1_conduct || '-'}</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: '500' }}>{student.term2_conduct || '-'}</td>
                    <td colSpan="3" style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: '500' }}>{student.term3_conduct || '-'}</td>
                    <td colSpan="4" style={{ border: '1px solid black', padding: '5px', textAlign: 'center', fontWeight: '500' }}>{student.avg_conduct || '-'}</td>
                  </tr>
                </thead>
              </table>

              {/* Modules Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid black', padding: '4px', width: '5%', fontWeight: '700' }}>N<sup>0</sup></th>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', width: '20%', fontWeight: '700' }}>MODULE CODE & TITLE</th>
                      <th style={{ border: '1px solid black', padding: '4px', width: '5%', fontWeight: '700' }}>CR</th>
                      <th colSpan="3" style={{ border: '1px solid black', padding: '4px', width: '12%', fontWeight: '700' }}>TERM 1</th>
                      <th colSpan="3" style={{ border: '1px solid black', padding: '4px', width: '12%', fontWeight: '700' }}>TERM 2</th>
                      <th colSpan="3" style={{ border: '1px solid black', padding: '4px', width: '12%', fontWeight: '700' }}>TERM 3</th>
                      <th colSpan="4" style={{ border: '1px solid black', padding: '4px', width: '20%', fontWeight: '700' }}>TOTAL</th>
                    </tr>
                    <tr>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}></th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}></th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}></th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>S.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>C.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>TOT</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>S.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>C.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>TOT</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>S.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>C.A</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>TOT</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>O.P</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>M.P</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>%</th>
                      <th style={{ border: '1px solid black', padding: '4px', fontWeight: '700' }}>DES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Complementary Modules */}
                    {groupedModules.complementary.length > 0 && (
                      <>
                        <tr className="module-category">
                          <td colSpan="16" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700', backgroundColor: '#e0e0e0' }}>COMPLEMENTARY MODULES</td>
                        </tr>
                        {groupedModules.complementary.map((module) => {
                          moduleCounter++;
                          return (
                            <tr key={`comp-${module.moid}`}>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{moduleCounter}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: '500' }}>{module.mcode} {module.mname}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.credit}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.overall_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.max_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.percentage}%</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{module.status}</td>
                            </tr>
                          );
                        })}
                      </>
                    )}

                    {/* General Modules */}
                    {groupedModules.general.length > 0 && (
                      <>
                        <tr className="module-category">
                          <td colSpan="16" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700', backgroundColor: '#e0e0e0' }}>GENERAL MODULES</td>
                        </tr>
                        {groupedModules.general.map((module) => {
                          moduleCounter++;
                          return (
                            <tr key={`gen-${module.moid}`}>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{moduleCounter}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: '500' }}>{module.mcode} {module.mname}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.credit}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.overall_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.max_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.percentage}%</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{module.status}</td>
                            </tr>
                          );
                        })}
                      </>
                    )}

                    {/* Specific Modules */}
                    {groupedModules.specific.length > 0 && (
                      <>
                        <tr className="module-category">
                          <td colSpan="16" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700', backgroundColor: '#e0e0e0' }}>SPECIFIC MODULES</td>
                        </tr>
                        {groupedModules.specific.map((module) => {
                          moduleCounter++;
                          return (
                            <tr key={`spec-${module.moid}`}>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{moduleCounter}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: '500' }}>{module.mcode} {module.mname}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.credit}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term1_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term2_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_test}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_exam}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.term3_total}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.overall_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.max_points}</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '500' }}>{module.percentage}%</td>
                              <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{module.status}</td>
                            </tr>
                          );
                        })}
                      </>
                    )}

                    {/* Totals Row */}
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>TOTAL</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term1_total}/{student.term1_max}</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term2_total}/{student.term2_max}</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term3_total}/{student.term3_max}</td>
                      <td colSpan="4" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.year_total}/{student.year_max}</td>
                    </tr>
                    
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>PERCENTAGE</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term1_percentage}%</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term2_percentage}%</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term3_percentage}%</td>
                      <td colSpan="4" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.yearly_percentage}%</td>
                    </tr>
                    
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>POSITION</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term1_rank} / {student.term1_all}</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term2_rank} / {student.term2_all}</td>
                      <td colSpan="3" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{student.term3_rank} / {student.term3_all}</td>
                      <td colSpan="4" style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{index + 1} / {reportData.totalStudents}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8px' }}>
                <div>
                  <p style={{ fontWeight: '500' }}>Trainer's signature: _________________</p>
                  <p style={{ fontWeight: '500' }}>Done At {reportData.school?.district}, {reportData.school?.secter}, on {new Date().toLocaleDateString()}</p>
                  <p style={{ fontWeight: '500' }}>HeadTeacher signature + stamp: _________________</p>
                </div>
                <div>
                  <img src={qrCode} alt="QR Code" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div>
                    <u><strong style={{ fontWeight: '700' }}>First Session Decision</strong></u><br />
                    <span style={{ fontWeight: '500' }}>‣ Promotion</span> <input type="checkbox" /><br />
                    <span style={{ fontWeight: '500' }}>‣ Re-assessment</span> <input type="checkbox" /><br />
                    <span style={{ fontWeight: '500' }}>‣ Discontinuation</span> <input type="checkbox" />
                  </div>
                  <div>
                    <u><strong style={{ fontWeight: '700' }}>Second Session Decision</strong></u><br />
                    <span style={{ fontWeight: '500' }}>‣ Promotion</span> <input type="checkbox" /><br />
                    <span style={{ fontWeight: '500' }}>‣ Repeat</span> <input type="checkbox" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Button at Bottom */}
      <div className="print-hidden" style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px',
        display: 'flex',
        gap: '10px',
        backgroundColor: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <select
          onChange={handleFontChange}
          value={fontSize}
          style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer', fontWeight: '500' }}
        >
          <option value="9px">Extra Small (9px)</option>
          <option value="10px">Small (10px)</option>
          <option value="11px">Normal (11px)</option>
          <option value="12px">Medium (12px)</option>
          <option value="13px">Large (13px)</option>
        </select>
        
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          style={{ 
            padding: '8px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            opacity: isPrinting ? 0.6 : 1
          }}
        >
          🖨️ {isPrinting ? 'Preparing...' : 'Print Report Cards'}
        </button>
      </div>

      <style jsx global>{`
        @media print {
          .print-hidden {
            display: none !important;
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .report-card {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none;
            margin: 0;
            padding: 10px;
          }
          @page {
            size: A4;
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
};

export default YearlyReport;