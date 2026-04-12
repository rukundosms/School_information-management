<?php
session_start();
include("connection.php");

$type = $_GET['type'] ?? '';
$year_id = $_GET['year_id'] ?? '';
$term = $_GET['term'] ?? '';

// Validate inputs
if (!$year_id || !$term) {
    echo '<div class="error">No data available for selected year/term</div>';
    exit();
}

// Route to appropriate function based on type
switch($type) {
    case 'completion':
        echo getCompletionDetails($conn, $year_id, $term);
        break;
    case 'students':
        echo getStudentDetails($conn, $year_id, $term);
        break;
    case 'teachers':
        echo getTeacherDetails($conn, $year_id, $term);
        break;
    case 'performance':
        echo getPerformanceDetails($conn, $year_id, $term);
        break;
    case 'missing':
        echo getMissingDetails($conn, $year_id, $term);
        break;
    default:
        echo '<div class="error">Invalid request type</div>';
}

mysqli_close($conn);

// Function to get completion details
function getCompletionDetails($conn, $year_id, $term) {
    $query = mysqli_query($conn, "
        SELECT 
            COUNT(DISTINCT CASE WHEN test > 0 THEN mark_id END) as formative,
            COUNT(DISTINCT CASE WHEN exam > 0 THEN mark_id END) as comprehensive,
            COUNT(DISTINCT mark_id) as total,
            ROUND(AVG(CASE WHEN test > 0 THEN test END), 2) as avg_test,
            ROUND(AVG(CASE WHEN exam > 0 THEN exam END), 2) as avg_exam
        FROM marks 
        WHERE year = '" . mysqli_real_escape_string($conn, $year_id) . "'
        AND team = '" . mysqli_real_escape_string($conn, $term) . "'
    ");
    
    $stats = mysqli_fetch_assoc($query);
    
    $html = '<h4>Assessment Completion Details</h4>
            <div class="tabs">
                <div class="tab active" data-tab="tab-summary">Summary</div>
                <div class="tab" data-tab="tab-by-module">By Module</div>
            </div>
            <div class="tab-content active" id="tab-summary">
                <table class="details-table">
                    <tr>
                        <th>Type</th>
                        <th>Completed</th>
                        <th>Average Score</th>
                        <th>Status</th>
                    </tr>
                    <tr>
                        <td>Formative (Test)</td>
                        <td>' . number_format($stats['formative'] ?? 0) . '</td>
                        <td>' . number_format($stats['avg_test'] ?? 0, 1) . '%</td>
                        <td><span class="badge success">Active</span></td>
                    </tr>
                    <tr>
                        <td>Comprehensive (Exam)</td>
                        <td>' . number_format($stats['comprehensive'] ?? 0) . '</td>
                        <td>' . number_format($stats['avg_exam'] ?? 0, 1) . '%</td>
                        <td><span class="badge success">Active</span></td>
                    </tr>
                    <tr style="background: #f8f9fa; font-weight: bold;">
                        <td><strong>Total</strong></td>
                        <td><strong>' . number_format($stats['total'] ?? 0) . '</strong></td>
                        <td><strong>' . number_format((($stats['avg_test'] ?? 0) * 0.4 + ($stats['avg_exam'] ?? 0) * 0.6), 1) . '%</strong></td>
                        <td><span class="badge primary">Overall</span></td>
                    </tr>
                </table>
            </div>
            <div class="tab-content" id="tab-by-module">
                <p>Module-wise breakdown would appear here.</p>
            </div>';
    
    return $html;
}

// Function to get student details
function getStudentDetails($conn, $year_id, $term) {
    $query = mysqli_query($conn, "
        SELECT s.sid, s.firstname, s.lastname, s.reg, c.class_name,
               COUNT(DISTINCT m.mid) as total_modules
        FROM student s
        JOIN class c ON s.class = c.cid
        LEFT JOIN marks mk ON mk.sid = s.sid 
            AND mk.year = '" . mysqli_real_escape_string($conn, $year_id) . "'
            AND mk.team = '" . mysqli_real_escape_string($conn, $term) . "'
        WHERE s.status = 'Active'
        GROUP BY s.sid, s.firstname, s.lastname, s.reg, c.class_name
        HAVING COUNT(DISTINCT CASE WHEN mk.test > 0 OR mk.exam > 0 THEN mk.mid END) = 0
        ORDER BY total_modules DESC
        LIMIT 20
    ");
    
    $html = '<h4>Students Not Assessed</h4>';
    
    if (mysqli_num_rows($query) > 0) {
        $html .= '<table class="details-table">
                    <tr>
                        <th>Student Name</th>
                        <th>Registration</th>
                        <th>Class</th>
                        <th>Modules</th>
                        <th>Status</th>
                    </tr>';
        
        while ($student = mysqli_fetch_assoc($query)) {
            $html .= '<tr>
                        <td><strong>' . htmlspecialchars($student['firstname'] . ' ' . $student['lastname']) . '</strong></td>
                        <td>' . htmlspecialchars($student['reg']) . '</td>
                        <td>' . htmlspecialchars($student['class_name']) . '</td>
                        <td>' . $student['total_modules'] . '</td>
                        <td><span class="badge danger">Not Assessed</span></td>
                      </tr>';
        }
        
        $html .= '</table>';
    } else {
        $html .= '<p class="empty-state">All students have been assessed! Great job!</p>';
    }
    
    return $html;
}

// Function to get teacher details
function getTeacherDetails($conn, $year_id, $term) {
    $query = mysqli_query($conn, "
        SELECT t.tid, t.tcode, t.fname, t.lname,
               COUNT(DISTINCT p.mid) as assigned_modules,
               COUNT(DISTINCT p.cid) as assigned_classes
        FROM teacher t
        LEFT JOIN permision p ON t.tid = p.tid
        WHERE NOT EXISTS (
            SELECT 1 FROM marks m 
            WHERE m.tid = t.tid 
            AND m.year = '" . mysqli_real_escape_string($conn, $year_id) . "'
            AND m.team = '" . mysqli_real_escape_string($conn, $term) . "'
            AND (m.test > 0 OR m.exam > 0)
        )
        GROUP BY t.tid, t.tcode, t.fname, t.lname
        HAVING assigned_modules > 0
        ORDER BY assigned_modules DESC
        LIMIT 15
    ");
    
    $html = '<h4>Teachers Not Assessing</h4>';
    
    if (mysqli_num_rows($query) > 0) {
        $html .= '<table class="details-table">
                    <tr>
                        <th>Teacher</th>
                        <th>Code</th>
                        <th>Assigned Modules</th>
                        <th>Classes</th>
                        <th>Status</th>
                    </tr>';
        
        while ($teacher = mysqli_fetch_assoc($query)) {
            $html .= '<tr>
                        <td><strong>' . htmlspecialchars($teacher['fname'] . ' ' . $teacher['lname']) . '</strong></td>
                        <td>' . htmlspecialchars($teacher['tcode']) . '</td>
                        <td>' . $teacher['assigned_modules'] . '</td>
                        <td>' . $teacher['assigned_classes'] . '</td>
                        <td><span class="badge warning">Not Assessing</span></td>
                      </tr>';
        }
        
        $html .= '</table>';
    } else {
        $html .= '<p class="empty-state">All teachers are actively assessing!</p>';
    }
    
    return $html;
}

// Function to get performance details
function getPerformanceDetails($conn, $year_id, $term) {
    $query = mysqli_query($conn, "
        SELECT 
            c.class_name,
            COUNT(DISTINCT s.sid) as students,
            COUNT(DISTINCT CASE WHEN m.test > 0 OR m.exam > 0 THEN s.sid END) as assessed_students,
            ROUND(AVG(CASE WHEN m.test > 0 THEN m.test END), 1) as avg_test,
            ROUND(AVG(CASE WHEN m.exam > 0 THEN m.exam END), 1) as avg_exam
        FROM class c
        LEFT JOIN student s ON s.class = c.cid AND s.status = 'Active'
        LEFT JOIN marks m ON m.sid = s.sid 
            AND m.year = '" . mysqli_real_escape_string($conn, $year_id) . "'
            AND m.team = '" . mysqli_real_escape_string($conn, $term) . "'
        GROUP BY c.cid, c.class_name
        HAVING students > 0
        ORDER BY avg_exam DESC
        LIMIT 8
    ");
    
    $html = '<h4>Performance Analysis</h4>';
    
    if (mysqli_num_rows($query) > 0) {
        $html .= '<div class="tabs">
                    <div class="tab active" data-tab="tab-class">By Class</div>
                    <div class="tab" data-tab="tab-top">Top Performers</div>
                  </div>
                  <div class="tab-content active" id="tab-class">
                    <table class="details-table">
                        <tr>
                            <th>Class</th>
                            <th>Students</th>
                            <th>Assessed</th>
                            <th>Avg Test</th>
                            <th>Avg Exam</th>
                            <th>Overall</th>
                        </tr>';
        
        while ($row = mysqli_fetch_assoc($query)) {
            $overall = round(($row['avg_test'] * 0.4 + $row['avg_exam'] * 0.6), 1);
            $assessment_rate = $row['students'] > 0 ? 
                round(($row['assessed_students'] / $row['students']) * 100, 0) : 0;
            
            $html .= '<tr>
                        <td><strong>' . htmlspecialchars($row['class_name']) . '</strong></td>
                        <td>' . $row['students'] . '</td>
                        <td>' . $assessment_rate . '%</td>
                        <td>' . $row['avg_test'] . '%</td>
                        <td>' . $row['avg_exam'] . '%</td>
                        <td><strong>' . $overall . '%</strong></td>
                      </tr>';
        }
        
        $html .= '</table></div>
                  <div class="tab-content" id="tab-top">
                    <p>Top performing students would appear here.</p>
                  </div>';
    } else {
        $html .= '<p class="empty-state">No performance data available</p>';
    }
    
    return $html;
}

// Function to get missing assessment details
function getMissingDetails($conn, $year_id, $term) {
    $query = mysqli_query($conn, "
        SELECT c.cid, c.class_name, c.class_code,
               COUNT(DISTINCT s.sid) as total_students,
               COUNT(DISTINCT m.moid) as total_modules
        FROM class c
        JOIN student s ON s.class = c.cid AND s.status = 'Active'
        LEFT JOIN module m ON m.class = c.cid
        WHERE NOT EXISTS (
            SELECT 1 FROM marks mk 
            WHERE mk.sid = s.sid 
            AND mk.year = '" . mysqli_real_escape_string($conn, $year_id) . "'
            AND mk.team = '" . mysqli_real_escape_string($conn, $term) . "'
            AND (mk.test > 0 OR mk.exam > 0)
        )
        GROUP BY c.cid, c.class_name, c.class_code
        ORDER BY total_students DESC
        LIMIT 10
    ");
    
    $html = '<h4>Missing Assessments Analysis</h4>';
    
    if (mysqli_num_rows($query) > 0) {
        $html .= '<div class="tabs">
                    <div class="tab active" data-tab="tab-classes">Classes</div>
                    <div class="tab" data-tab="tab-modules">Modules</div>
                  </div>
                  <div class="tab-content active" id="tab-classes">
                    <table class="details-table">
                        <tr>
                            <th>Class</th>
                            <th>Code</th>
                            <th>Students</th>
                            <th>Modules</th>
                            <th>Status</th>
                        </tr>';
        
        while ($class = mysqli_fetch_assoc($query)) {
            $html .= '<tr>
                        <td><strong>' . htmlspecialchars($class['class_name']) . '</strong></td>
                        <td>' . htmlspecialchars($class['class_code']) . '</td>
                        <td>' . $class['total_students'] . '</td>
                        <td>' . $class['total_modules'] . '</td>
                        <td><span class="badge danger">No Assessments</span></td>
                      </tr>';
        }
        
        $html .= '</table></div>
                  <div class="tab-content" id="tab-modules">
                    <p>Missing modules would appear here.</p>
                  </div>';
    } else {
        $html .= '<p class="empty-state">All classes have assessments!</p>';
    }
    
    return $html;
}
?>