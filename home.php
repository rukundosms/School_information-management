<?php
session_start();

// Set timezone to your local time (Rwanda is UTC+2)
date_default_timezone_set('Africa/Kigali');

if (!isset($_SESSION['id'])) {
    header("location:index.html"); 
    exit();
}

// Error reporting
error_reporting(E_ERROR);
ini_set('display_errors', 0);
set_time_limit(30);
ini_set('memory_limit', '256M');

include("connection.php");

if (!$conn) {
    die("Database connection failed");
}

// Get filter parameters
$current_academic_year = date('Y');
$current_year_id = null;
$current_term = isset($_GET['term']) ? intval($_GET['term']) : 1;
$selected_teacher = isset($_GET['teacher']) ? intval($_GET['teacher']) : 0;
$selected_module = isset($_GET['module']) ? intval($_GET['module']) : 0;
$selected_class = isset($_GET['class']) ? intval($_GET['class']) : 0;
$selected_status = isset($_GET['status']) ? $_GET['status'] : 'all';
$view_all = isset($_GET['view_all']) ? $_GET['view_all'] : '';
$ajax_request = isset($_GET['ajax']) ? true : false;

// Get active year
$year_query = mysqli_query($conn, 
    "SELECT year_id, year 
     FROM year 
     WHERE status = 'active' 
     ORDER BY year_id DESC 
     LIMIT 1");
if ($year_query && mysqli_num_rows($year_query) > 0) {
    $year_data = mysqli_fetch_assoc($year_query);
    $current_academic_year = $year_data['year'];
    $current_year_id = $year_data['year_id'];
}
mysqli_free_result($year_query);

// Initialize base stats array
$stats = [
    'total_classes' => 0,
    'total_students' => 0,
    'total_teachers' => 0,
    'total_modules' => 0,
    'total_assessments' => 0,
    'formative_assessments' => 0,
    'comprehensive_assessments' => 0,
    'students_assessed' => 0,
    'teachers_assessing' => 0,
    'avg_test_score' => 0,
    'avg_exam_score' => 0,
    'test_passed' => 0,
    'test_failed' => 0,
    'exam_passed' => 0,
    'exam_failed' => 0,
    'classes_not_assessed' => 0,
    'active_users_5min' => 0,
    'total_assessed_modules' => 0,
    'total_missed_modules' => 0
];

// Get dropdown data
$years = [];
$year_options = mysqli_query($conn, "SELECT year_id, year FROM year ORDER BY year DESC LIMIT 5");
if ($year_options) {
    while ($year = mysqli_fetch_assoc($year_options)) {
        $years[] = $year;
    }
    mysqli_free_result($year_options);
}

$teachers = [];
$teacher_query = mysqli_query($conn, "SELECT tid, fname, lname, tcode FROM teacher ORDER BY fname LIMIT 100");
if ($teacher_query) {
    while ($teacher = mysqli_fetch_assoc($teacher_query)) {
        $teachers[] = $teacher;
    }
    mysqli_free_result($teacher_query);
}

$modules = [];
$module_query = mysqli_query($conn, "SELECT moid, mname FROM module ORDER BY mname LIMIT 100");
if ($module_query) {
    while ($module = mysqli_fetch_assoc($module_query)) {
        $modules[] = $module;
    }
    mysqli_free_result($module_query);
}

// Get classes that have students promoted to current year
$classes = [];
$class_query = "
    SELECT DISTINCT c.cid, c.class_name, c.level 
    FROM class c
    INNER JOIN student_promotion_log spl ON spl.to_class = c.cid
    WHERE spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
    ORDER BY c.class_name 
    LIMIT 50";
$class_result = mysqli_query($conn, $class_query);
if ($class_result) {
    while ($class = mysqli_fetch_assoc($class_result)) {
        $classes[] = $class;
    }
    mysqli_free_result($class_result);
}

$terms = [1, 2, 3];
$status_options = ['all' => 'All', 'assessed' => 'Assessed', 'not_assessed' => 'Not Assessed'];

// Get basic counts with proper promotion log filtering
$basic_counts = mysqli_query($conn, "
    SELECT 
        (SELECT COUNT(*) FROM class) as total_classes,
        (SELECT COUNT(DISTINCT s.sid) 
         FROM student s
         INNER JOIN student_promotion_log spl ON s.sid = spl.sid
         WHERE s.status = 'Active' 
         AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        ) as total_students,
        (SELECT COUNT(*) FROM teacher) as total_teachers,
        (SELECT COUNT(*) FROM module) as total_modules
");
if ($basic_counts) {
    $counts = mysqli_fetch_assoc($basic_counts);
    $stats = array_merge($stats, $counts);
    mysqli_free_result($basic_counts);
}

// ========== FIXED: Active users in last 10 minutes ==========
$current_user_id = $_SESSION['id'];
$current_time = date('Y-m-d H:i:s');
$active_time_limit = date('Y-m-d H:i:s', strtotime('-10 minutes'));

// Get current user info from teacher table
$current_user_query = mysqli_query($conn, "SELECT tid, fname, lname, tcode FROM teacher WHERE tid = '$current_user_id'");
$current_user_data = mysqli_fetch_assoc($current_user_query);
$current_user_name = $current_user_data ? ($current_user_data['fname'] . ' ' . $current_user_data['lname']) : 'Unknown';
$current_user_tcode = $current_user_data['tcode'] ?? '';

// CRITICAL FIX: Update current user's last activity on every page load
$update_activity = "UPDATE user SET last_activity = NOW() WHERE uid = '$current_user_id'";
mysqli_query($conn, $update_activity);

// Get all users who have logged in (have last_activity) in the last 10 minutes
$active_query = "
    SELECT 
        u.uid,
        u.tcode,
        u.role,
        u.last_activity,
        t.fname,
        t.lname,
        CONCAT(COALESCE(t.fname, ''), ' ', COALESCE(t.lname, '')) as user_name,
        CASE 
            WHEN u.uid = '$current_user_id' THEN 1 
            ELSE 0 
        END as is_current_user,
        TIMESTAMPDIFF(MINUTE, u.last_activity, NOW()) as minutes_ago,
        DATE_FORMAT(u.last_activity, '%h:%i %p') as formatted_time
    FROM user u
    LEFT JOIN teacher t ON u.tcode = t.tcode
    WHERE u.last_activity IS NOT NULL
    AND u.last_activity >= '$active_time_limit'
    ORDER BY is_current_user DESC, u.last_activity DESC";

$active_result = mysqli_query($conn, $active_query);

$active_now = [];

if ($active_result) {
    while ($active = mysqli_fetch_assoc($active_result)) {
        $display_name = trim($active['user_name']);
        if (empty($display_name) || $display_name == ' ') {
            $display_name = $active['tcode'] ?: 'User ' . $active['uid'];
        }
        
        $active_now[] = [
            'uid' => $active['uid'],
            'user_name' => $display_name,
            'tcode' => $active['tcode'],
            'role' => $active['role'],
            'last_active' => $active['last_activity'],
            'formatted_time' => $active['formatted_time'],
            'minutes_ago' => $active['minutes_ago'],
            'is_current_user' => $active['is_current_user']
        ];
    }
    mysqli_free_result($active_result);
}

// If no active users but we have current user, add them manually
if (empty($active_now) && $current_user_name && $current_user_name != 'Unknown') {
    $active_now[] = [
        'uid' => $current_user_id,
        'user_name' => $current_user_name,
        'tcode' => $current_user_tcode,
        'role' => 'teacher',
        'last_active' => $current_time,
        'formatted_time' => date('h:i A', strtotime($current_time)),
        'minutes_ago' => 0,
        'is_current_user' => 1
    ];
}

$stats['active_users_5min'] = count($active_now);
// ========== END FIXED ACTIVE USERS SECTION ==========

// Assessment stats query with proper promotion log filtering
if ($current_year_id) {
    $where_clause = "mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "' 
                     AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
                     AND s.status = 'Active'
                     AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                     AND spl.to_class = mk.cid";
    
    if ($selected_teacher > 0) {
        $where_clause .= " AND mk.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_module > 0) {
        $where_clause .= " AND mk.mid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_class > 0) {
        $where_clause .= " AND mk.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $assessment_stats = mysqli_query($conn, "
        SELECT 
            COUNT(DISTINCT mk.mark_id) as total_assessments,
            COUNT(DISTINCT CASE WHEN mk.test > 0 THEN mk.mark_id END) as formative_assessments,
            COUNT(DISTINCT CASE WHEN mk.exam > 0 THEN mk.mark_id END) as comprehensive_assessments,
            COUNT(DISTINCT mk.sid) as students_assessed,
            COUNT(DISTINCT mk.tid) as teachers_assessing,
            ROUND(AVG(CASE WHEN mk.test > 0 THEN mk.test END), 2) as avg_test_score,
            ROUND(AVG(CASE WHEN mk.exam > 0 THEN mk.exam END), 2) as avg_exam_score,
            SUM(CASE WHEN mk.test >= 50 THEN 1 ELSE 0 END) as test_passed,
            SUM(CASE WHEN mk.test < 50 AND mk.test > 0 THEN 1 ELSE 0 END) as test_failed,
            SUM(CASE WHEN mk.exam >= 50 THEN 1 ELSE 0 END) as exam_passed,
            SUM(CASE WHEN mk.exam < 50 AND mk.exam > 0 THEN 1 ELSE 0 END) as exam_failed
        FROM marks mk
        INNER JOIN student s ON mk.sid = s.sid
        INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND spl.to_class = mk.cid
        WHERE $where_clause
    ");
    
    if ($assessment_stats) {
        $assess_data = mysqli_fetch_assoc($assessment_stats);
        foreach ($assess_data as $key => $value) {
            if ($value !== null) {
                $stats[$key] = $value;
            }
        }
        mysqli_free_result($assessment_stats);
    }
}

// Get ALL teachers data for view all
$all_teachers_data = [];
if ($current_year_id && $view_all == 'teachers') {
    $teacher_query = "
        SELECT 
            t.tid,
            CONCAT(t.fname, ' ', t.lname) as teacher_name,
            COUNT(DISTINCT mk.mid) as modules_assessed,
            COUNT(DISTINCT mk.sid) as students_assessed,
            COUNT(DISTINCT CASE WHEN mk.test >= 50 THEN mk.sid END) as students_passed_test,
            COUNT(DISTINCT CASE WHEN mk.exam >= 50 THEN mk.sid END) as students_passed_exam,
            ROUND(AVG(mk.test), 1) as avg_test_score,
            ROUND(AVG(mk.exam), 1) as avg_exam_score,
            MAX(mk.date) as last_assessment
        FROM teacher t
        LEFT JOIN marks mk ON t.tid = mk.tid 
            AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "' 
            AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
        LEFT JOIN student s ON mk.sid = s.sid AND s.status = 'Active'
        LEFT JOIN student_promotion_log spl ON s.sid = spl.sid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND spl.to_class = mk.cid
        WHERE 1=1";
    
    if ($selected_teacher > 0) {
        $teacher_query .= " AND t.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_module > 0) {
        $teacher_query .= " AND mk.mid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_class > 0) {
        $teacher_query .= " AND mk.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $teacher_query .= " GROUP BY t.tid ORDER BY last_assessment DESC";
    
    $teacher_result = mysqli_query($conn, $teacher_query);
    if ($teacher_result) {
        while ($row = mysqli_fetch_assoc($teacher_result)) {
            $row['activity_status'] = 'Inactive';
            if ($row['last_assessment']) {
                $last_active = strtotime($row['last_assessment']);
                if ($last_active >= time() - 300) {
                    $row['activity_status'] = 'Active Now';
                } elseif ($last_active >= time() - 3600) {
                    $row['activity_status'] = 'Active (1h)';
                }
            }
            $all_teachers_data[] = $row;
        }
        mysqli_free_result($teacher_result);
    }
}

// Get ALL modules data for view all
$all_modules_data = [];
if ($current_year_id && $view_all == 'modules') {
    $module_query = "
        SELECT DISTINCT m.moid, m.mname, m.trade, 
               GROUP_CONCAT(DISTINCT CONCAT(t.fname, ' ', t.lname) SEPARATOR ', ') as teacher_names
        FROM module m
        INNER JOIN permision p ON m.moid = p.mid
        INNER JOIN teacher t ON p.tid = t.tid
        WHERE 1=1";
    
    if ($selected_module > 0) {
        $module_query .= " AND m.moid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_teacher > 0) {
        $module_query .= " AND p.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_class > 0) {
        $module_query .= " AND p.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $module_query .= " GROUP BY m.moid ORDER BY m.mname";
    
    $module_list = mysqli_query($conn, $module_query);
    
    if ($module_list) {
        while ($module = mysqli_fetch_assoc($module_list)) {
            $check_query = "
                SELECT 
                    COUNT(DISTINCT CASE WHEN mk.test > 0 THEN mk.sid END) as students_tested,
                    COUNT(DISTINCT CASE WHEN mk.exam > 0 THEN mk.sid END) as students_examined,
                    COUNT(DISTINCT mk.tid) as assessing_teachers
                FROM marks mk
                INNER JOIN student s ON mk.sid = s.sid
                INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
                    AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                    AND spl.to_class = mk.cid
                WHERE mk.mid = '" . $module['moid'] . "'
                AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
                AND s.status = 'Active'";
            
            $check_result = mysqli_query($conn, $check_query);
            if ($check_result) {
                $check_data = mysqli_fetch_assoc($check_result);
                
                $module['students_tested'] = $check_data['students_tested'] ?? 0;
                $module['students_examined'] = $check_data['students_examined'] ?? 0;
                $module['assessing_teachers'] = $check_data['assessing_teachers'] ?? 0;
                $module['status'] = ($module['students_tested'] > 0 || $module['students_examined'] > 0) ? 'Assessed' : 'Not Assessed';
                
                if ($selected_status == 'all' || 
                    ($selected_status == 'assessed' && $module['status'] == 'Assessed') ||
                    ($selected_status == 'not_assessed' && $module['status'] == 'Not Assessed')) {
                    $all_modules_data[] = $module;
                }
                
                mysqli_free_result($check_result);
            }
        }
        mysqli_free_result($module_list);
    }
}

// Get ALL missing assessments data for view all
$all_missing_data = [];
if ($current_year_id && $view_all == 'missing') {
    $class_query = "
        SELECT DISTINCT c.cid, c.class_name, c.level
        FROM class c
        INNER JOIN student_promotion_log spl ON spl.to_class = c.cid
        WHERE spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'";
    
    if ($selected_class > 0) {
        $class_query .= " AND c.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $class_result = mysqli_query($conn, $class_query);
    
    if ($class_result) {
        while ($class = mysqli_fetch_assoc($class_result)) {
            $module_query = "
                SELECT DISTINCT m.moid, m.mname, p.tid,
                       CONCAT(t.fname, ' ', t.lname) as teacher_name
                FROM permision p
                INNER JOIN module m ON m.moid = p.mid
                LEFT JOIN teacher t ON t.tid = p.tid
                WHERE p.cid = '" . $class['cid'] . "'";
            
            if ($selected_module > 0) {
                $module_query .= " AND m.moid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
            }
            if ($selected_teacher > 0) {
                $module_query .= " AND p.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
            }
            
            $module_result = mysqli_query($conn, $module_query);
            
            if ($module_result) {
                while ($module = mysqli_fetch_assoc($module_result)) {
                    $student_query = "
                        SELECT 
                            COUNT(DISTINCT s.sid) as total_students,
                            COUNT(DISTINCT CASE WHEN mk.test > 0 THEN s.sid END) as students_with_test,
                            COUNT(DISTINCT CASE WHEN mk.exam > 0 THEN s.sid END) as students_with_exam
                        FROM student s
                        INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
                            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                            AND spl.to_class = '" . $class['cid'] . "'
                        LEFT JOIN marks mk ON s.sid = mk.sid 
                            AND mk.mid = '" . $module['moid'] . "'
                            AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                            AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
                            AND mk.cid = '" . $class['cid'] . "'
                        WHERE s.status = 'Active'";
                    
                    $student_result = mysqli_query($conn, $student_query);
                    
                    if ($student_result) {
                        $student_data = mysqli_fetch_assoc($student_result);
                        
                        $missing_test = $student_data['total_students'] - $student_data['students_with_test'];
                        $missing_exam = $student_data['total_students'] - $student_data['students_with_exam'];
                        
                        $include_record = false;
                        if ($selected_status == 'all') {
                            $include_record = ($missing_test > 0 || $missing_exam > 0);
                        } elseif ($selected_status == 'assessed') {
                            $include_record = ($missing_test == 0 && $missing_exam == 0);
                        } elseif ($selected_status == 'not_assessed') {
                            $include_record = ($missing_test > 0 || $missing_exam > 0);
                        }
                        
                        if ($include_record && $student_data['total_students'] > 0) {
                            $all_missing_data[] = [
                                'class_name' => $class['class_name'],
                                'level' => $class['level'],
                                'module_name' => $module['mname'],
                                'teacher_name' => $module['teacher_name'] ?? 'Not Assigned',
                                'total_students' => $student_data['total_students'],
                                'students_with_test' => $student_data['students_with_test'],
                                'students_with_exam' => $student_data['students_with_exam'],
                                'missing_test' => $missing_test,
                                'missing_exam' => $missing_exam
                            ];
                        }
                        
                        mysqli_free_result($student_result);
                    }
                }
                mysqli_free_result($module_result);
            }
        }
        mysqli_free_result($class_result);
    }
}

// Get ALL activities data for view all
$all_activities_data = [];
if ($current_year_id && $view_all == 'activities') {
    $activities_query = "
        SELECT 
            mk.date as activity_time,
            CONCAT(t.fname, ' ', t.lname) as performed_by,
            CONCAT(s.firstname, ' ', s.lastname, ' - ', m.mname) as description,
            mk.team as term,
            mk.test,
            mk.exam,
            c.class_name
        FROM marks mk
        INNER JOIN teacher t ON mk.tid = t.tid
        INNER JOIN student s ON mk.sid = s.sid AND s.status = 'Active'
        INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND spl.to_class = mk.cid
        INNER JOIN module m ON mk.mid = m.moid
        INNER JOIN class c ON mk.cid = c.cid
        WHERE mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'";

    if ($selected_teacher > 0) {
        $activities_query .= " AND mk.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_module > 0) {
        $activities_query .= " AND mk.mid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_class > 0) {
        $activities_query .= " AND mk.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }

    $activities_query .= " ORDER BY mk.date DESC";
    
    $activities_result = mysqli_query($conn, $activities_query);
    if ($activities_result) {
        while ($activity = mysqli_fetch_assoc($activities_result)) {
            $all_activities_data[] = $activity;
        }
        mysqli_free_result($activities_result);
    }
}

// Handle AJAX requests
if ($ajax_request) {
    header('Content-Type: application/json');
    $response = ['success' => false, 'data' => [], 'html' => ''];
    
    if ($view_all == 'teachers') {
        $response['success'] = true;
        $response['data'] = $all_teachers_data;
        $response['html'] = generateTeachersTable($all_teachers_data);
    } elseif ($view_all == 'modules') {
        $response['success'] = true;
        $response['data'] = $all_modules_data;
        $response['html'] = generateModulesTable($all_modules_data);
    } elseif ($view_all == 'missing') {
        $response['success'] = true;
        $response['data'] = $all_missing_data;
        $response['html'] = generateMissingTable($all_missing_data);
    } elseif ($view_all == 'activities') {
        $response['success'] = true;
        $response['data'] = $all_activities_data;
        $response['html'] = generateActivitiesTable($all_activities_data);
    }
    
    echo json_encode($response);
    exit();
}

// Module assessment status - limited data for dashboard
$module_status_data = [];
if ($current_year_id) {
    $module_list_query = "
        SELECT DISTINCT m.moid, m.mname, m.trade, 
               GROUP_CONCAT(DISTINCT CONCAT(t.fname, ' ', t.lname) SEPARATOR ', ') as teacher_names
        FROM module m
        INNER JOIN permision p ON m.moid = p.mid
        INNER JOIN teacher t ON p.tid = t.tid
        WHERE 1=1";
    
    if ($selected_module > 0) {
        $module_list_query .= " AND m.moid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_teacher > 0) {
        $module_list_query .= " AND p.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_class > 0) {
        $module_list_query .= " AND p.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $module_list_query .= " GROUP BY m.moid LIMIT 10";
    
    $module_list = mysqli_query($conn, $module_list_query);
    
    if ($module_list) {
        while ($module = mysqli_fetch_assoc($module_list)) {
            $check_query = "
                SELECT 
                    COUNT(DISTINCT CASE WHEN mk.test > 0 THEN mk.sid END) as students_tested,
                    COUNT(DISTINCT CASE WHEN mk.exam > 0 THEN mk.sid END) as students_examined,
                    COUNT(DISTINCT mk.tid) as assessing_teachers
                FROM marks mk
                INNER JOIN student s ON mk.sid = s.sid
                INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
                    AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                    AND spl.to_class = mk.cid
                WHERE mk.mid = '" . $module['moid'] . "'
                AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
                AND s.status = 'Active'";
            
            $check_result = mysqli_query($conn, $check_query);
            if ($check_result) {
                $check_data = mysqli_fetch_assoc($check_result);
                
                $module['students_tested'] = $check_data['students_tested'] ?? 0;
                $module['students_examined'] = $check_data['students_examined'] ?? 0;
                $module['assessing_teachers'] = $check_data['assessing_teachers'] ?? 0;
                $module['status'] = ($module['students_tested'] > 0 || $module['students_examined'] > 0) ? 'Assessed' : 'Not Assessed';
                
                if ($selected_status == 'all' || 
                    ($selected_status == 'assessed' && $module['status'] == 'Assessed') ||
                    ($selected_status == 'not_assessed' && $module['status'] == 'Not Assessed')) {
                    $module_status_data[] = $module;
                    
                    if ($module['status'] == 'Assessed') {
                        $stats['total_assessed_modules']++;
                    } else {
                        $stats['total_missed_modules']++;
                    }
                }
                
                mysqli_free_result($check_result);
            }
        }
        mysqli_free_result($module_list);
    }
}

// Teacher performance - limited data for dashboard
$teacher_performance = [];
if ($current_year_id) {
    $teacher_where = "";
    if ($selected_teacher > 0) {
        $teacher_where = " AND t.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    
    $teacher_query = "
        SELECT 
            t.tid,
            CONCAT(t.fname, ' ', t.lname) as teacher_name,
            COUNT(DISTINCT mk.mid) as modules_assessed,
            COUNT(DISTINCT mk.sid) as students_assessed,
            COUNT(DISTINCT CASE WHEN mk.test >= 50 THEN mk.sid END) as students_passed_test,
            COUNT(DISTINCT CASE WHEN mk.exam >= 50 THEN mk.sid END) as students_passed_exam,
            ROUND(AVG(mk.test), 1) as avg_test_score,
            ROUND(AVG(mk.exam), 1) as avg_exam_score,
            MAX(mk.date) as last_assessment
        FROM teacher t
        LEFT JOIN marks mk ON t.tid = mk.tid 
            AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "' 
            AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
        LEFT JOIN student s ON mk.sid = s.sid AND s.status = 'Active'
        LEFT JOIN student_promotion_log spl ON s.sid = spl.sid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND spl.to_class = mk.cid
        WHERE 1=1 $teacher_where
        GROUP BY t.tid
        HAVING students_assessed > 0
        ORDER BY last_assessment DESC
        LIMIT 10";
    
    $teacher_result = mysqli_query($conn, $teacher_query);
    if ($teacher_result) {
        while ($row = mysqli_fetch_assoc($teacher_result)) {
            $row['activity_status'] = 'Inactive';
            if ($row['last_assessment']) {
                $last_active = strtotime($row['last_assessment']);
                if ($last_active >= time() - 300) {
                    $row['activity_status'] = 'Active Now';
                } elseif ($last_active >= time() - 3600) {
                    $row['activity_status'] = 'Active (1h)';
                }
            }
            $teacher_performance[] = $row;
        }
        mysqli_free_result($teacher_result);
    }
}

// Missing assessments - limited data for dashboard
$missing_assessments = [];
if ($current_year_id) {
    $class_query = "
        SELECT DISTINCT c.cid, c.class_name, c.level
        FROM class c
        INNER JOIN student_promotion_log spl ON spl.to_class = c.cid
        WHERE spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        AND 1=1";
    
    if ($selected_class > 0) {
        $class_query .= " AND c.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    $class_query .= " LIMIT 5";
    
    $class_result = mysqli_query($conn, $class_query);
    
    if ($class_result) {
        while ($class = mysqli_fetch_assoc($class_result)) {
            $module_query = "
                SELECT DISTINCT m.moid, m.mname, p.tid,
                       CONCAT(t.fname, ' ', t.lname) as teacher_name
                FROM permision p
                INNER JOIN module m ON m.moid = p.mid
                LEFT JOIN teacher t ON t.tid = p.tid
                WHERE p.cid = '" . $class['cid'] . "'";
            
            if ($selected_module > 0) {
                $module_query .= " AND m.moid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
            }
            if ($selected_teacher > 0) {
                $module_query .= " AND p.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
            }
            $module_query .= " LIMIT 3";
            
            $module_result = mysqli_query($conn, $module_query);
            
            if ($module_result) {
                while ($module = mysqli_fetch_assoc($module_result)) {
                    $student_query = "
                        SELECT 
                            COUNT(DISTINCT s.sid) as total_students,
                            COUNT(DISTINCT CASE WHEN mk.test > 0 THEN s.sid END) as students_with_test,
                            COUNT(DISTINCT CASE WHEN mk.exam > 0 THEN s.sid END) as students_with_exam
                        FROM student s
                        INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
                            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                            AND spl.to_class = '" . $class['cid'] . "'
                        LEFT JOIN marks mk ON s.sid = mk.sid 
                            AND mk.mid = '" . $module['moid'] . "'
                            AND mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
                            AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
                            AND mk.cid = '" . $class['cid'] . "'
                        WHERE s.status = 'Active'";
                    
                    $student_result = mysqli_query($conn, $student_query);
                    
                    if ($student_result) {
                        $student_data = mysqli_fetch_assoc($student_result);
                        
                        $missing_test = $student_data['total_students'] - $student_data['students_with_test'];
                        $missing_exam = $student_data['total_students'] - $student_data['students_with_exam'];
                        
                        $include_record = false;
                        if ($selected_status == 'all') {
                            $include_record = ($missing_test > 0 || $missing_exam > 0);
                        } elseif ($selected_status == 'assessed') {
                            $include_record = ($missing_test == 0 && $missing_exam == 0);
                        } elseif ($selected_status == 'not_assessed') {
                            $include_record = ($missing_test > 0 || $missing_exam > 0);
                        }
                        
                        if ($include_record && $student_data['total_students'] > 0) {
                            $missing_assessments[] = [
                                'class_name' => $class['class_name'],
                                'level' => $class['level'],
                                'module_name' => $module['mname'],
                                'teacher_name' => $module['teacher_name'] ?? 'Not Assigned',
                                'total_students' => $student_data['total_students'],
                                'students_with_test' => $student_data['students_with_test'],
                                'students_with_exam' => $student_data['students_with_exam'],
                                'missing_test' => $missing_test,
                                'missing_exam' => $missing_exam
                            ];
                        }
                        
                        mysqli_free_result($student_result);
                    }
                }
                mysqli_free_result($module_result);
            }
        }
        mysqli_free_result($class_result);
    }
}

// Recent activities - limited data for dashboard
$recent_activities = [];
$recent_query = "
    SELECT 
        mk.date as activity_time,
        CONCAT(t.fname, ' ', t.lname) as performed_by,
        CONCAT(s.firstname, ' ', s.lastname, ' - ', m.mname) as description,
        mk.team as term,
        mk.test,
        mk.exam,
        c.class_name
    FROM marks mk
    INNER JOIN teacher t ON mk.tid = t.tid
    INNER JOIN student s ON mk.sid = s.sid AND s.status = 'Active'
    INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
        AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        AND spl.to_class = mk.cid
    INNER JOIN module m ON mk.mid = m.moid
    INNER JOIN class c ON mk.cid = c.cid
    WHERE mk.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
    AND mk.team = '" . mysqli_real_escape_string($conn, $current_term) . "'";

if ($selected_teacher > 0) {
    $recent_query .= " AND mk.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
}
if ($selected_module > 0) {
    $recent_query .= " AND mk.mid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
}
if ($selected_class > 0) {
    $recent_query .= " AND mk.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
}

$recent_query .= " ORDER BY mk.date DESC LIMIT 10";

$recent_result = mysqli_query($conn, $recent_query);
if ($recent_result) {
    while ($activity = mysqli_fetch_assoc($recent_result)) {
        $recent_activities[] = $activity;
    }
    mysqli_free_result($recent_result);
}

// Calculate possible assessments with proper promotion log filtering
$cache_key = "possible_assessments_{$current_year_id}_{$current_term}_{$selected_teacher}_{$selected_module}_{$selected_class}";
if (!isset($_SESSION[$cache_key]) || isset($_GET['refresh'])) {
    $possible_query = "
        SELECT COUNT(*) as total_possible
        FROM permision p
        INNER JOIN student s ON s.status = 'Active'
        INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND spl.to_class = p.cid
        INNER JOIN module m ON p.mid = m.moid
        WHERE 1=1";
    
    if ($selected_teacher > 0) {
        $possible_query .= " AND p.tid = '" . mysqli_real_escape_string($conn, $selected_teacher) . "'";
    }
    if ($selected_module > 0) {
        $possible_query .= " AND p.mid = '" . mysqli_real_escape_string($conn, $selected_module) . "'";
    }
    if ($selected_class > 0) {
        $possible_query .= " AND p.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $possible_result = mysqli_query($conn, $possible_query);
    if ($possible_result) {
        $possible_data = mysqli_fetch_assoc($possible_result);
        $total_possible_assessments = $possible_data['total_possible'] ?? 0;
        $_SESSION[$cache_key] = $total_possible_assessments;
        mysqli_free_result($possible_result);
    }
} else {
    $total_possible_assessments = $_SESSION[$cache_key];
}

// Calculate classes not assessed
if ($current_year_id) {
    $classes_query = "
        SELECT COUNT(DISTINCT c.cid) as count
        FROM class c
        WHERE EXISTS (
            SELECT 1 FROM student_promotion_log spl 
            WHERE spl.to_class = c.cid 
            AND spl.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        )";
    
    if ($selected_class > 0) {
        $classes_query .= " AND c.cid = '" . mysqli_real_escape_string($conn, $selected_class) . "'";
    }
    
    $classes_query .= " AND NOT EXISTS (
            SELECT 1 FROM marks m 
            INNER JOIN student_promotion_log spl2 ON m.sid = spl2.sid
            WHERE spl2.to_class = c.cid 
            AND m.year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
            AND m.team = '" . mysqli_real_escape_string($conn, $current_term) . "'
            AND spl2.to_year = '" . mysqli_real_escape_string($conn, $current_year_id) . "'
        )";
    
    $classes_result = mysqli_query($conn, $classes_query);
    if ($classes_result) {
        $class_data = mysqli_fetch_assoc($classes_result);
        $stats['classes_not_assessed'] = $class_data['count'] ?? 0;
        mysqli_free_result($classes_result);
    }
}

// Calculate derived stats
$students_not_assessed = max(0, $stats['total_students'] - $stats['students_assessed']);
$teachers_not_assessing = max(0, $stats['total_teachers'] - $stats['teachers_assessing']);
$completed_assessments = $stats['formative_assessments'] + $stats['comprehensive_assessments'];

$total_possible_formative = $total_possible_assessments > 0 ? ceil($total_possible_assessments / 2) : 0;
$total_possible_comprehensive = $total_possible_assessments > 0 ? floor($total_possible_assessments / 2) : 0;
$pending_assessments = max(0, $total_possible_assessments - $completed_assessments);

// Calculate rates
$completion_rate = $total_possible_assessments > 0 ? round(($completed_assessments / $total_possible_assessments) * 100, 2) : 0;
$formative_completion_rate = $total_possible_formative > 0 ? round(($stats['formative_assessments'] / $total_possible_formative) * 100, 2) : 0;
$comprehensive_completion_rate = $total_possible_comprehensive > 0 ? round(($stats['comprehensive_assessments'] / $total_possible_comprehensive) * 100, 2) : 0;
$student_assessment_rate = $stats['total_students'] > 0 ? round(($stats['students_assessed'] / $stats['total_students']) * 100, 2) : 0;
$teacher_assessment_rate = $stats['total_teachers'] > 0 ? round(($stats['teachers_assessing'] / $stats['total_teachers']) * 100, 2) : 0;
$test_passed_rate = ($stats['test_passed'] + $stats['test_failed']) > 0 ? round(($stats['test_passed'] / ($stats['test_passed'] + $stats['test_failed'])) * 100, 2) : 0;
$exam_passed_rate = ($stats['exam_passed'] + $stats['exam_failed']) > 0 ? round(($stats['exam_passed'] / ($stats['exam_passed'] + $stats['exam_failed'])) * 100, 2) : 0;
$module_assessment_rate = $stats['total_modules'] > 0 ? round(($stats['total_assessed_modules'] / $stats['total_modules']) * 100, 2) : 0;

// Get school name
$school_name = $_SESSION['school_name'] ?? 'School Management System';

mysqli_close($conn);

// Calculate percentages
$missing_teachers_percentage = $stats['total_teachers'] > 0 ? round(($teachers_not_assessing / $stats['total_teachers']) * 100, 2) : 0;
$missing_students_percentage = $stats['total_students'] > 0 ? round(($students_not_assessed / $stats['total_students']) * 100, 2) : 0;
$missing_assessments_percentage = $total_possible_assessments > 0 ? round(($pending_assessments / $total_possible_assessments) * 100, 2) : 0;
$missing_classes_percentage = $stats['total_classes'] > 0 ? round(($stats['classes_not_assessed'] / $stats['total_classes']) * 100, 2) : 0;

// Helper functions to generate tables
function generateTeachersTable($data) {
    $html = '<div class="modal-filter-bar">';
    $html .= '<input type="text" class="modal-search" placeholder="Search teachers..." onkeyup="filterModalTable(this.value)">';
    $html .= '</div>';
    $html .= '<table class="data-table" id="modalTable">';
    $html .= '<thead><tr><th>Teacher</th><th>Status</th><th>Modules</th><th>Students</th><th>Test Avg</th><th>Exam Avg</th><th>Test Pass</th><th>Exam Pass</th><th>Last Active</th></tr></thead>';
    $html .= '<tbody>';
    
    if (empty($data)) {
        $html .= '<tr><td colspan="9" style="text-align: center; padding: 40px;">No teacher data available</td></tr>';
    } else {
        foreach ($data as $row) {
            $test_pass_rate = $row['students_assessed'] > 0 ? round(($row['students_passed_test'] / $row['students_assessed']) * 100, 1) : 0;
            $exam_pass_rate = $row['students_assessed'] > 0 ? round(($row['students_passed_exam'] / $row['students_assessed']) * 100, 1) : 0;
            
            $status_class = 'inactive';
            $status_text = 'Inactive';
            if ($row['activity_status'] == 'Active Now') {
                $status_class = 'active';
                $status_text = 'Active Now';
            } elseif ($row['activity_status'] == 'Active (1h)') {
                $status_class = 'warning';
                $status_text = 'Active (1h)';
            }
            
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($row['teacher_name']) . '</td>';
            $html .= '<td><span class="badge ' . $status_class . '"><span class="status-indicator ' . $status_class . '"></span> ' . $status_text . '</span></td>';
            $html .= '<td>' . $row['modules_assessed'] . '</td>';
            $html .= '<td>' . $row['students_assessed'] . '</td>';
            $html .= '<td>' . ($row['avg_test_score'] ? $row['avg_test_score'] . '%' : '-') . '</td>';
            $html .= '<td>' . ($row['avg_exam_score'] ? $row['avg_exam_score'] . '%' : '-') . '</td>';
            $html .= '<td>' . $test_pass_rate . '%</td>';
            $html .= '<td>' . $exam_pass_rate . '%</td>';
            $html .= '<td>' . ($row['last_assessment'] ? date('Y-m-d H:i', strtotime($row['last_assessment'])) : 'Never') . '</td>';
            $html .= '</tr>';
        }
    }
    
    $html .= '</tbody></table>';
    return $html;
}

function generateModulesTable($data) {
    $html = '<div class="modal-filter-bar">';
    $html .= '<input type="text" class="modal-search" placeholder="Search modules..." onkeyup="filterModalTable(this.value)">';
    $html .= '</div>';
    $html .= '<table class="data-table" id="modalTable">';
    $html .= '<thead><tr><th>Module</th><th>Trade</th><th>Status</th><th>Tested</th><th>Examined</th><th>Total Students</th><th>Assessing Teachers</th></tr></thead>';
    $html .= '<tbody>';
    
    if (empty($data)) {
        $html .= '<tr><td colspan="7" style="text-align: center; padding: 40px;">No module data available</td></tr>';
    } else {
        foreach ($data as $row) {
            $status_class = $row['status'] == 'Assessed' ? 'success' : 'danger';
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($row['mname']) . '</td>';
            $html .= '<td>' . ($row['trade'] ?? 'N/A') . '</td>';
            $html .= '<td><span class="badge ' . $status_class . '">' . $row['status'] . '</span></td>';
            $html .= '<td>' . $row['students_tested'] . '</td>';
            $html .= '<td>' . $row['students_examined'] . '</td>';
            $html .= '<td>' . max($row['students_tested'], $row['students_examined']) . '</td>';
            $html .= '<td>' . ($row['teacher_names'] ?? 'None') . '</td>';
            $html .= '</tr>';
        }
    }
    
    $html .= '</tbody></table>';
    return $html;
}

function generateMissingTable($data) {
    $html = '<div class="modal-filter-bar">';
    $html .= '<input type="text" class="modal-search" placeholder="Search..." onkeyup="filterModalTable(this.value)">';
    $html .= '</div>';
    $html .= '<table class="data-table" id="modalTable">';
    $html .= '<thead><tr><th>Class</th><th>Module</th><th>Teacher</th><th>Total Students</th><th>With Test</th><th>With Exam</th><th>Missing Test</th><th>Missing Exam</th></tr></thead>';
    $html .= '<tbody>';
    
    if (empty($data)) {
        $html .= '<tr><td colspan="8" style="text-align: center; padding: 40px;">No missing assessments found</td></tr>';
    } else {
        foreach ($data as $row) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($row['class_name']) . ' (L' . $row['level'] . ')</td>';
            $html .= '<td>' . htmlspecialchars($row['module_name']) . '</td>';
            $html .= '<td>' . htmlspecialchars($row['teacher_name']) . '</td>';
            $html .= '<td>' . $row['total_students'] . '</td>';
            $html .= '<td>' . $row['students_with_test'] . '</td>';
            $html .= '<td>' . $row['students_with_exam'] . '</td>';
            $html .= '<td><span class="badge ' . ($row['missing_test'] > 0 ? 'danger' : 'success') . '">' . $row['missing_test'] . '</span></td>';
            $html .= '<td><span class="badge ' . ($row['missing_exam'] > 0 ? 'warning' : 'success') . '">' . $row['missing_exam'] . '</span></td>';
            $html .= '</tr>';
        }
    }
    
    $html .= '</tbody></table>';
    return $html;
}

function generateActivitiesTable($data) {
    $html = '<div class="modal-filter-bar">';
    $html .= '<input type="text" class="modal-search" placeholder="Search activities..." onkeyup="filterModalTable(this.value)">';
    $html .= '</div>';
    $html .= '<table class="data-table" id="modalTable">';
    $html .= '<thead><tr><th>Time</th><th>Teacher</th><th>Activity</th><th>Class</th><th>Test Score</th><th>Exam Score</th><th>Term</th></tr></thead>';
    $html .= '<tbody>';
    
    if (empty($data)) {
        $html .= '<tr><td colspan="7" style="text-align: center; padding: 40px;">No activities found</td></tr>';
    } else {
        foreach ($data as $row) {
            $test_badge = $row['test'] >= 50 ? 'success' : ($row['test'] > 0 ? 'danger' : '');
            $exam_badge = $row['exam'] >= 50 ? 'success' : ($row['exam'] > 0 ? 'danger' : '');
            
            $html .= '<tr>';
            $html .= '<td>' . date('Y-m-d H:i:s', strtotime($row['activity_time'])) . '</td>';
            $html .= '<td>' . htmlspecialchars($row['performed_by']) . '</td>';
            $html .= '<td>' . htmlspecialchars($row['description']) . '</td>';
            $html .= '<td>' . htmlspecialchars($row['class_name']) . '</td>';
            $html .= '<td>' . ($row['test'] > 0 ? "<span class='badge {$test_badge}'>" . $row['test'] . "%</span>" : '-') . '</td>';
            $html .= '<td>' . ($row['exam'] > 0 ? "<span class='badge {$exam_badge}'>" . $row['exam'] . "%</span>" : '-') . '</td>';
            $html .= '<td>Term ' . $row['term'] . '</td>';
            $html .= '</tr>';
        }
    }
    
    $html .= '</tbody></table>';
    return $html;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>Collegio Santo Antonio Maria Zaccaria</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* CSS Variables */
        :root {
            --primary-color: #3498db;
            --secondary-color: #013220;
            --success-color: #27ae60;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --info-color: #17a2b8;
            --light-color: #ecf0f1;
            --dark-color: #2c3e50;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --radius: 8px;
            --transition: all 0.3s ease;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: #f5f7fa;
            color: #333;
            line-height: 1.6;
            overflow-x: hidden;
        }

        .cont {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .top {
            background: linear-gradient(135deg, var(--secondary-color), #025a3a);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1002;
            position: sticky;
            top: 0;
        }

        .top .s {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .top img {
            height: 45px;
            width: 45px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid white;
        }

        .top h1 {
            font-size: 1.5rem;
            font-weight: 600;
            background: linear-gradient(90deg, #fff, #e0e0e0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .user {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .academic-year {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: 600;
            backdrop-filter: blur(10px);
        }

        .header-logout {
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            background: linear-gradient(135deg, #c0392b, #e74c3c);
            border-radius: 20px;
            transition: var(--transition);
            font-weight: 600;
        }

        .header-logout:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
        }

        .center {
            display: flex;
            flex: 1;
            min-height: 0;
        }

        .left {
            width: 260px;
            background: linear-gradient(180deg, var(--secondary-color), #025a3a);
            color: white;
            padding: 20px 0;
            overflow-y: auto;
            z-index: 1001;
            flex-shrink: 0;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
        }

        .left h1 {
            padding: 0 20px 15px;
            font-size: 1.3rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 15px;
            color: white;
        }

        .left nav {
            display: flex;
            flex-direction: column;
        }

        .left nav a {
            color: white;
            text-decoration: none;
            padding: 14px 20px;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 0 25px 25px 0;
            margin: 3px 0;
            position: relative;
            overflow: hidden;
        }

        .left nav a::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 0;
            background: rgba(255, 255, 255, 0.15);
            transition: var(--transition);
        }

        .left nav a:hover::before,
        .left nav a.active::before {
            width: 5px;
        }

        .left nav a:hover,
        .left nav a.active {
            background: rgba(255, 255, 255, 0.1);
            padding-left: 30px;
        }

        .left nav a i {
            font-size: 1.1rem;
            width: 24px;
            text-align: center;
        }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .iframe-container {
            flex: 1;
            position: relative;
            background: #f5f7fa;
        }

        .iframe-container iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        }

        .dashboard-content {
            flex: 1;
            padding: 0;
            overflow-y: auto;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
        }

        .dashboard-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 25px;
        }

        .control-panel {
            background: white;
            border-radius: var(--radius);
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
            display: flex;
            flex-wrap: wrap;
            gap: 25px;
            align-items: flex-end;
            border-left: 5px solid var(--primary-color);
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            min-width: 160px;
        }

        .filter-group label {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--dark-color);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .filter-group select {
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            transition: var(--transition);
            background: white;
        }

        .filter-group select:focus {
            border-color: var(--primary-color);
            outline: none;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .refresh-btn {
            background: linear-gradient(135deg, var(--primary-color), #2980b9);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: var(--transition);
            font-size: 15px;
        }

        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(52, 152, 219, 0.3);
        }

        .reset-btn {
            background: linear-gradient(135deg, #95a5a6, #7f8c8d);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: var(--transition);
            font-size: 15px;
        }

        .reset-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(127, 140, 141, 0.3);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 35px;
        }

        .stat-card {
            background: white;
            border-radius: var(--radius);
            padding: 25px;
            box-shadow: var(--shadow);
            border-left: 6px solid;
            transition: var(--transition);
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: inherit;
            opacity: 0.3;
        }

        .stat-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-card.success { border-left-color: var(--success-color); }
        .stat-card.info { border-left-color: var(--info-color); }
        .stat-card.warning { border-left-color: var(--warning-color); }
        .stat-card.danger { border-left-color: var(--danger-color); }
        .stat-card.primary { border-left-color: var(--primary-color); }

        .stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .stat-title {
            font-weight: 700;
            color: var(--dark-color);
            font-size: 1.1rem;
        }

        .stat-icon {
            font-size: 1.8rem;
            opacity: 0.8;
        }

        .stat-value {
            font-size: 2.8rem;
            font-weight: 800;
            margin-bottom: 10px;
            line-height: 1;
        }

        .stat-subtitle {
            color: #666;
            font-size: 0.95rem;
            margin-bottom: 15px;
            line-height: 1.4;
        }

        .stat-progress {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .stat-progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
        }

        .stat-progress-fill.success { background: var(--success-color); }
        .stat-progress-fill.info { background: var(--info-color); }
        .stat-progress-fill.warning { background: var(--warning-color); }
        .stat-progress-fill.danger { background: var(--danger-color); }
        .stat-progress-fill.primary { background: var(--primary-color); }

        .stat-percentage {
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .click-indicator {
            color: var(--primary-color);
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
        }

        .section {
            background: white;
            border-radius: var(--radius);
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
            border-top: 1px solid #f0f0f0;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f5f5f5;
            flex-wrap: wrap;
            gap: 15px;
        }

        .section-title {
            color: var(--dark-color);
            font-size: 1.4rem;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 700;
        }

        .section-actions {
            display: flex;
            gap: 10px;
        }

        .view-all-btn {
            background: linear-gradient(135deg, var(--primary-color), #2980b9);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: var(--transition);
            font-size: 0.9rem;
        }

        .view-all-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
        }

        .badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge.success { background: #d4f5e3; color: #155724; border: 1px solid #c3e6cb; }
        .badge.info { background: #d1f0f5; color: #0c5460; border: 1px solid #bee5eb; }
        .badge.warning { background: #fff5d1; color: #856404; border: 1px solid #ffeaa7; }
        .badge.danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .badge.primary { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .badge.active { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; animation: pulse 2s infinite; }
        .badge.inactive { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }

        .status-indicator.active { background: #27ae60; box-shadow: 0 0 5px #27ae60; animation: pulse-green 2s infinite; }
        .status-indicator.inactive { background: #95a5a6; }
        .status-indicator.warning { background: #f39c12; }

        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(39, 174, 96, 0); }
            100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
        }

        .table-container {
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
            border-radius: var(--radius);
            border: 1px solid #e9ecef;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            min-width: 600px;
        }

        .data-table th {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 14px;
            text-align: left;
            font-weight: 700;
            color: var(--dark-color);
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .data-table td {
            padding: 12px 14px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
        }

        .data-table tr:hover {
            background: #f1f5f9;
        }

        .data-table tr:nth-child(even) {
            background: #fafcfd;
        }

        .data-table tr:nth-child(even):hover {
            background: #f1f5f9;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }

        .info-card {
            background: white;
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            border: 1px solid #e9ecef;
        }

        .info-card h4 {
            color: var(--dark-color);
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .info-list {
            list-style: none;
        }

        .info-list li {
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .info-list li:last-child {
            border-bottom: none;
        }

        .info-label {
            color: #666;
            font-weight: 500;
        }

        .info-value {
            font-weight: 700;
        }

        .info-value.success { color: var(--success-color); }
        .info-value.danger { color: var(--danger-color); }

        .metric-group {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 15px;
        }

        .metric {
            flex: 1;
            min-width: 100px;
            text-align: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: var(--radius);
        }

        .metric-value {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .metric-label {
            font-size: 0.8rem;
            color: #666;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1100;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
            backdrop-filter: blur(5px);
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: var(--radius);
            width: 95%;
            max-width: 1400px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            animation: slideUp 0.4s ease;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
            padding: 25px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: var(--radius) var(--radius) 0 0;
            position: sticky;
            top: 0;
            z-index: 20;
        }

        .modal-header h3 {
            color: var(--dark-color);
            margin: 0;
            font-size: 1.4rem;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.8rem;
            cursor: pointer;
            color: #666;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition);
        }

        .modal-close:hover {
            background: #f8f9fa;
            color: var(--danger-color);
        }

        .modal-body {
            padding: 25px;
            max-height: calc(90vh - 100px);
            overflow-y: auto;
        }

        .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .details-dropdown {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease-out;
            background: #f8fafc;
            border-radius: 0 0 var(--radius) var(--radius);
            margin: 0 -25px -25px;
            padding: 0 25px;
        }

        .details-dropdown.active {
            max-height: 500px;
            padding: 20px 25px;
            margin-top: 15px;
        }

        .export-btn {
            background: linear-gradient(135deg, #27ae60, #219a52);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: var(--transition);
            font-size: 0.9rem;
            margin-left: 10px;
        }

        .export-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
        }

        .modal-filter-bar {
            background: #f8f9fa;
            padding: 15px;
            border-radius: var(--radius);
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: center;
        }

        .modal-search {
            flex: 1;
            min-width: 200px;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
        }

        .modal-search:focus {
            border-color: var(--primary-color);
            outline: none;
        }

        .heartbeat-indicator {
            display: inline-block;
            animation: heartbeat-pulse 1s ease;
        }

        @keyframes heartbeat-pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }

        .online-status {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
        }

        .online-status.online {
            background: #27ae60;
            box-shadow: 0 0 5px #27ae60;
            animation: pulse-green 2s infinite;
        }

        .online-status.offline {
            background: #95a5a6;
        }

        @media (max-width: 768px) {
            .left {
                position: fixed;
                top: 70px;
                left: 0;
                height: calc(100vh - 70px);
                transform: translateX(-100%);
                transition: transform 0.3s;
                z-index: 1000;
                width: 280px;
                box-shadow: 5px 0 15px rgba(0, 0, 0, 0.2);
            }

            .left.active {
                transform: translateX(0);
            }

            .menu-toggle {
                display: block;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition);
            }

            .control-panel {
                flex-direction: column;
                align-items: stretch;
                gap: 20px;
            }

            .filter-group {
                width: 100%;
            }

            .stats-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .grid-3 {
                grid-template-columns: 1fr;
            }

            .section-header {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .modal-content {
                width: 100%;
                height: 100%;
                max-height: 100vh;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <div class="top">
            <div class="s">
                <button class="menu-toggle" id="menuToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <img src="images/logo.jpg" alt="School Logo" loading="lazy">
                <h1><?php echo htmlspecialchars($school_name); ?> -CSAMZ</h1>
            </div>
            <div class="user">
                <div class="academic-year">
                    <i class="fas fa-calendar-alt"></i>
                    Year: <?php echo htmlspecialchars($current_academic_year); ?> | Term: <?php echo $current_term; ?>
                </div>
                <a href="logout.php" class="header-logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </a>
            </div>
        </div>
        
        <div class="center">
            <div class="left" id="sidebar">
                <h1>Admin MENUS</h1>
                <nav>
                    <a href="teacher.php" target="contentFrame"><i class="fas fa-chalkboard-teacher"></i> Teachers</a>
                    <a href="student_class.php" target="contentFrame"><i class="fas fa-users"></i> Students</a>
                    <a href="class.php" target="contentFrame"><i class="fas fa-school"></i> Classes</a>
                    <a href="module.php" target="contentFrame"><i class="fas fa-book"></i> Modules</a>
                    <a href="assessment.php" target="contentFrame"><i class="fas fa-clipboard-check"></i> Assessment</a>
                    <a href="grant.php" target="contentFrame"><i class="fas fa-key"></i> Grant</a>
                    <a href="revok.php" target="contentFrame"><i class="fas fa-ban"></i> Revoke</a>
                    <a href="year.php" target="contentFrame"><i class="fas fa-calendar-alt"></i> Academic Year</a>
                    <a href="rep.php" target="contentFrame"><i class="fas fa-file-alt"></i> Report</a>
                    <a href="proclamation_year.php" target="contentFrame"><i class="fas fa-trophy"></i> Ranking</a>
                    <a href="school.php" target="contentFrame"><i class="fas fa-university"></i> School</a>
                    <a href="blue.php" target="contentFrame"><i class="fas fa-user"></i> Progression</a>
                    <a href="#" onclick="showDashboard()" class="active"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                </nav>
            </div>
            
            <div class="main-content">
                <div class="iframe-container" id="iframeContainer" style="display: none;">
                    <div class="loading-spinner" id="iframeLoading"></div>
                    <iframe name="contentFrame" id="contentFrame" 
                            title="Content Frame" 
                            onload="hideIframeLoading()"></iframe>
                </div>
                
                <div class="dashboard-content" id="dashboardView">
                    <div class="dashboard-container">
                        <!-- Enhanced Control Panel -->
                        <div class="control-panel">
                            <div class="filter-group">
                                <label for="yearSelect"><i class="fas fa-calendar"></i> Academic Year:</label>
                                <select id="yearSelect" onchange="applyFilters()">
                                    <?php foreach ($years as $year): ?>
                                        <option value="<?php echo $year['year_id']; ?>" 
                                            <?php echo $year['year_id'] == $current_year_id ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($year['year']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label for="termSelect"><i class="fas fa-layer-group"></i> Term:</label>
                                <select id="termSelect" onchange="applyFilters()">
                                    <?php foreach ($terms as $term): ?>
                                        <option value="<?php echo $term; ?>" 
                                            <?php echo $term == $current_term ? 'selected' : ''; ?>>
                                            Term <?php echo $term; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="classSelect"><i class="fas fa-school"></i> Class:</label>
                                <select id="classSelect" onchange="applyFilters()">
                                    <option value="0">All Classes</option>
                                    <?php foreach ($classes as $class): ?>
                                        <option value="<?php echo $class['cid']; ?>" 
                                            <?php echo $class['cid'] == $selected_class ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($class['class_name']); ?> (Level <?php echo $class['level']; ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="teacherSelect"><i class="fas fa-chalkboard-teacher"></i> Teacher:</label>
                                <select id="teacherSelect" onchange="applyFilters()">
                                    <option value="0">All Teachers</option>
                                    <?php foreach ($teachers as $teacher): ?>
                                        <option value="<?php echo $teacher['tid']; ?>" 
                                            <?php echo $teacher['tid'] == $selected_teacher ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($teacher['fname'] . ' ' . $teacher['lname']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="moduleSelect"><i class="fas fa-book"></i> Module:</label>
                                <select id="moduleSelect" onchange="applyFilters()">
                                    <option value="0">All Modules</option>
                                    <?php foreach ($modules as $module): ?>
                                        <option value="<?php echo $module['moid']; ?>" 
                                            <?php echo $module['moid'] == $selected_module ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($module['mname']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="statusSelect"><i class="fas fa-check-circle"></i> Status:</label>
                                <select id="statusSelect" onchange="applyFilters()">
                                    <?php foreach ($status_options as $value => $label): ?>
                                        <option value="<?php echo $value; ?>" 
                                            <?php echo $value == $selected_status ? 'selected' : ''; ?>>
                                            <?php echo $label; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            
                            <button class="refresh-btn" onclick="applyFilters()">
                                <i class="fas fa-filter"></i> Apply Filters
                            </button>
                            
                            <button class="reset-btn" onclick="resetFilters()">
                                <i class="fas fa-undo"></i> Reset
                            </button>
                        </div>

                        <!-- Real-time Activity Status -->
                        <div class="stats-grid">
                            <div class="stat-card success">
                                <div class="stat-header">
                                    <div class="stat-title">Active Now (10min)</div>
                                    <div class="stat-icon"><i class="fas fa-user-clock"></i></div>
                                </div>
                                <div class="stat-value"><?php echo count($active_now); ?></div>
                                <div class="stat-subtitle">
                                    Users currently active
                                    <?php if (count($active_now) > 0): ?>
                                        <span style="font-size: 0.8rem;">(You are active now)</span>
                                    <?php endif; ?>
                                </div>
                                <div class="metric-group">
                                    <?php 
                                    $display_active = array_slice($active_now, 0, 3);
                                    foreach($display_active as $active): 
                                    ?>
                                    <div class="metric">
                                        <div class="metric-value">
                                            <span class="status-indicator <?php echo $active['minutes_ago'] <= 1 ? 'active' : ($active['minutes_ago'] <= 5 ? 'active' : 'warning'); ?>"></span>
                                        </div>
                                        <div class="metric-label">
                                            <?php 
                                            $name_parts = explode(' ', $active['user_name']);
                                            echo htmlspecialchars($name_parts[0]) . (isset($active['is_current_user']) && $active['is_current_user'] ? ' (You)' : '');
                                            ?>
                                        </div>
                                    </div>
                                    <?php endforeach; ?>
                                    <?php if (count($active_now) > 3): ?>
                                    <div class="metric">
                                        <div class="metric-value">+<?php echo count($active_now) - 3; ?></div>
                                        <div class="metric-label">more</div>
                                    </div>
                                    <?php endif; ?>
                                </div>
                                <div class="stat-percentage">
                                    <span>Last active: <?php echo !empty($active_now) ? date('h:i A', strtotime($active_now[0]['last_active'])) : 'N/A'; ?></span>
                                    <span class="click-indicator" onclick="showActiveUsers()"><i class="fas fa-users"></i> View All</span>
                                </div>
                            </div>

                            <div class="stat-card info">
                                <div class="stat-header">
                                    <div class="stat-title">Module Assessment Status</div>
                                    <div class="stat-icon"><i class="fas fa-book-open"></i></div>
                                </div>
                                <div class="stat-value"><?php echo $stats['total_assessed_modules']; ?>/<?php echo $stats['total_modules']; ?></div>
                                <div class="stat-subtitle">
                                    Modules with at least one assessment
                                </div>
                                <div class="stat-progress">
                                    <div class="stat-progress-fill info" style="width: <?php echo min(100, $module_assessment_rate); ?>%"></div>
                                </div>
                                <div class="stat-percentage">
                                    <span>Missed: <?php echo $stats['total_missed_modules']; ?> modules</span>
                                    <span class="click-indicator" onclick="showModuleStatus()"><i class="fas fa-chevron-down"></i> Details</span>
                                </div>
                            </div>

                            <div class="stat-card warning">
                                <div class="stat-header">
                                    <div class="stat-title">Test vs Exam Completion</div>
                                    <div class="stat-icon"><i class="fas fa-chart-bar"></i></div>
                                </div>
                                <div class="stat-value"><?php echo $formative_completion_rate; ?>% | <?php echo $comprehensive_completion_rate; ?>%</div>
                                <div class="stat-subtitle">
                                    Test | Exam completion rates
                                </div>
                                <div class="metric-group">
                                    <div class="metric">
                                        <div class="metric-value"><?php echo $stats['test_passed']; ?></div>
                                        <div class="metric-label">Test Passed</div>
                                    </div>
                                    <div class="metric">
                                        <div class="metric-value"><?php echo $stats['exam_passed']; ?></div>
                                        <div class="metric-label">Exam Passed</div>
                                    </div>
                                </div>
                                <div class="stat-percentage">
                                    <span>Avg Test: <?php echo $stats['avg_test_score']; ?>% | Exam: <?php echo $stats['avg_exam_score']; ?>%</span>
                                    <span class="click-indicator" onclick="showPerformanceDetails()"><i class="fas fa-chart-line"></i> Analyze</span>
                                </div>
                            </div>
                        </div>

                        <!-- Original Stats Grid -->
                        <div class="stats-grid">
                            <!-- Overall Completion -->
                            <div class="stat-card success clickable-card" onclick="loadDetails('completion')">
                                <div class="stat-header">
                                    <div class="stat-title">Overall Completion</div>
                                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                                </div>
                                <div class="stat-value"><?php echo number_format($completion_rate, 1); ?>%</div>
                                <div class="stat-subtitle">
                                    <?php echo number_format($completed_assessments); ?> assessments completed
                                </div>
                                <div class="stat-progress">
                                    <div class="stat-progress-fill success" style="width: <?php echo min(100, $completion_rate); ?>%"></div>
                                </div>
                                <div class="stat-percentage">
                                    <span>Pending: <?php echo number_format($pending_assessments); ?></span>
                                    <span class="click-indicator"><i class="fas fa-chevron-down"></i> Details</span>
                                </div>
                                <div class="details-dropdown" id="details-completion"></div>
                            </div>

                            <!-- Student Coverage -->
                            <div class="stat-card info clickable-card" onclick="loadDetails('students')">
                                <div class="stat-header">
                                    <div class="stat-title">Student Coverage</div>
                                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                                </div>
                                <div class="stat-value"><?php echo number_format($student_assessment_rate, 1); ?>%</div>
                                <div class="stat-subtitle">
                                    <?php echo number_format($stats['students_assessed']); ?> out of <?php echo number_format($stats['total_students']); ?> students assessed
                                </div>
                                <div class="stat-progress">
                                    <div class="stat-progress-fill info" style="width: <?php echo min(100, $student_assessment_rate); ?>%"></div>
                                </div>
                                <div class="stat-percentage">
                                    <span><?php echo number_format($students_not_assessed); ?> not assessed</span>
                                    <span class="click-indicator"><i class="fas fa-chevron-down"></i> View Students</span>
                                </div>
                                <div class="details-dropdown" id="details-students"></div>
                            </div>

                            <!-- Teacher Engagement -->
                            <div class="stat-card warning clickable-card" onclick="loadDetails('teachers')">
                                <div class="stat-header">
                                    <div class="stat-title">Teacher Engagement</div>
                                    <div class="stat-icon"><i class="fas fa-chalkboard-teacher"></i></div>
                                </div>
                                <div class="stat-value"><?php echo number_format($teacher_assessment_rate, 1); ?>%</div>
                                <div class="stat-subtitle">
                                    <?php echo number_format($stats['teachers_assessing']); ?> out of <?php echo number_format($stats['total_teachers']); ?> teachers assessing
                                </div>
                                <div class="stat-progress">
                                    <div class="stat-progress-fill warning" style="width: <?php echo min(100, $teacher_assessment_rate); ?>%"></div>
                                </div>
                                <div class="stat-percentage">
                                    <span><?php echo number_format($teachers_not_assessing); ?> not assessing</span>
                                    <span class="click-indicator"><i class="fas fa-chevron-down"></i> View Teachers</span>
                                </div>
                                <div class="details-dropdown" id="details-teachers"></div>
                            </div>

                            <!-- Missing Assessments -->
                            <div class="stat-card danger clickable-card" onclick="loadDetails('missing')">
                                <div class="stat-header">
                                    <div class="stat-title">Missing Assessments</div>
                                    <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                                </div>
                                <div class="stat-value"><?php echo number_format($pending_assessments); ?></div>
                                <div class="stat-subtitle">
                                    <?php echo number_format($missing_assessments_percentage, 1); ?>% of all possible assessments
                                </div>
                                <div class="stat-progress">
                                    <div class="stat-progress-fill danger" style="width: <?php echo min(100, $missing_assessments_percentage); ?>%"></div>
                                </div>
                                <div class="stat-percentage">
                                    <span><?php echo number_format($stats['classes_not_assessed']); ?> classes affected</span>
                                    <span class="click-indicator"><i class="fas fa-chevron-down"></i> View Details</span>
                                </div>
                                <div class="details-dropdown" id="details-missing"></div>
                            </div>
                        </div>

                        <!-- Teacher Performance Overview -->
                        <div class="section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <i class="fas fa-chalkboard-teacher"></i> Teacher Assessment Performance
                                </h3>
                                <div class="section-actions">
                                    <span class="badge info">Active in 10min: <?php echo $stats['active_users_5min']; ?></span>
                                    <button class="view-all-btn" onclick="showAllTeachersModal()">
                                        <i class="fas fa-eye"></i> View All Teachers
                                    </button>
                                </div>
                            </div>
                            
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Teacher</th>
                                            <th>Status</th>
                                            <th>Modules Assessed</th>
                                            <th>Students Assessed</th>
                                            <th>Test Pass Rate</th>
                                            <th>Exam Pass Rate</th>
                                            <th>Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (empty($teacher_performance)): ?>
                                            <tr><td colspan="7" style="text-align: center; padding: 30px;">No teacher performance data available</td></tr>
                                        <?php else: ?>
                                            <?php foreach ($teacher_performance as $perf): ?>
                                            <tr>
                                                <td><?php echo htmlspecialchars($perf['teacher_name']); ?></td>
                                                <td>
                                                    <?php if ($perf['activity_status'] == 'Active Now'): ?>
                                                        <span class="badge active"><span class="status-indicator active"></span> Active Now</span>
                                                    <?php elseif ($perf['activity_status'] == 'Active (1h)'): ?>
                                                        <span class="badge warning">Active (1h)</span>
                                                    <?php else: ?>
                                                        <span class="badge inactive">Inactive</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td><?php echo $perf['modules_assessed']; ?></td>
                                                <td><?php echo $perf['students_assessed']; ?></td>
                                                <td>
                                                    <?php 
                                                    $test_pass_rate = $perf['students_assessed'] > 0 ? 
                                                        round(($perf['students_passed_test'] / $perf['students_assessed']) * 100, 1) : 0;
                                                    echo $test_pass_rate . '%';
                                                    ?>
                                                </td>
                                                <td>
                                                    <?php 
                                                    $exam_pass_rate = $perf['students_assessed'] > 0 ? 
                                                        round(($perf['students_passed_exam'] / $perf['students_assessed']) * 100, 1) : 0;
                                                    echo $exam_pass_rate . '%';
                                                    ?>
                                                </td>
                                                <td><?php echo $perf['last_assessment'] ? date('H:i', strtotime($perf['last_assessment'])) : 'Never'; ?></td>
                                            </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Module Assessment Status -->
                        <div class="section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <i class="fas fa-book"></i> Module Assessment Status
                                </h3>
                                <button class="view-all-btn" onclick="showAllModulesModal()">
                                    <i class="fas fa-eye"></i> View All Modules
                                </button>
                            </div>
                            
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Module</th>
                                            <th>Trade</th>
                                            <th>Status</th>
                                            <th>Students Tested</th>
                                            <th>Students Examined</th>
                                            <th>Assigned Teachers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (empty($module_status_data)): ?>
                                            <tr><td colspan="6" style="text-align: center; padding: 30px;">No module data available</td></tr>
                                        <?php else: ?>
                                            <?php foreach ($module_status_data as $module): ?>
                                            <tr>
                                                <td><?php echo htmlspecialchars($module['mname']); ?></td>
                                                <td><?php echo htmlspecialchars($module['trade'] ?? 'N/A'); ?></td>
                                                <td>
                                                    <?php if ($module['status'] == 'Assessed'): ?>
                                                        <span class="badge success">Assessed</span>
                                                    <?php else: ?>
                                                        <span class="badge danger">Not Assessed</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td><?php echo $module['students_tested']; ?></td>
                                                <td><?php echo $module['students_examined']; ?></td>
                                                <td><?php echo htmlspecialchars($module['teacher_names'] ?? 'None'); ?></td>
                                            </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Missing Assessments by Class -->
                        <div class="section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <i class="fas fa-exclamation-circle"></i> Missing Assessments by Class
                                </h3>
                                <button class="view-all-btn" onclick="showAllMissingModal()">
                                    <i class="fas fa-eye"></i> View All Missing
                                </button>
                            </div>
                            
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Class</th>
                                            <th>Module</th>
                                            <th>Teacher</th>
                                            <th>Total Students</th>
                                            <th>Missing Test</th>
                                            <th>Missing Exam</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (empty($missing_assessments)): ?>
                                            <tr><td colspan="6" style="text-align: center; padding: 30px;">No missing assessments found</td></tr>
                                        <?php else: ?>
                                            <?php foreach ($missing_assessments as $missing): ?>
                                            <tr>
                                                <td><?php echo htmlspecialchars($missing['class_name']); ?> (L<?php echo $missing['level']; ?>)</td>
                                                <td><?php echo htmlspecialchars($missing['module_name']); ?></td>
                                                <td><?php echo htmlspecialchars($missing['teacher_name']); ?></td>
                                                <td><?php echo $missing['total_students']; ?></td>
                                                <td>
                                                    <?php if ($missing['missing_test'] > 0): ?>
                                                        <span class="badge danger"><?php echo $missing['missing_test']; ?> students</span>
                                                    <?php else: ?>
                                                        <span class="badge success">Complete</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <?php if ($missing['missing_exam'] > 0): ?>
                                                        <span class="badge warning"><?php echo $missing['missing_exam']; ?> students</span>
                                                    <?php else: ?>
                                                        <span class="badge success">Complete</span>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Recent Activities -->
                        <?php if (!empty($recent_activities)): ?>
                        <div class="section">
                            <div class="section-header">
                                <h3 class="section-title">
                                    <i class="fas fa-history"></i> Recent Assessments
                                </h3>
                                <button class="view-all-btn" onclick="showAllActivitiesModal()">
                                    <i class="fas fa-eye"></i> View All Activities
                                </button>
                            </div>
                            
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Teacher</th>
                                            <th>Activity</th>
                                            <th>Class</th>
                                            <th>Test Score</th>
                                            <th>Exam Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($recent_activities as $activity): ?>
                                        <tr>
                                            <td><?php echo date('H:i:s', strtotime($activity['activity_time'])); ?></td>
                                            <td><?php echo htmlspecialchars($activity['performed_by']); ?></td>
                                            <td><?php echo htmlspecialchars($activity['description']); ?></td>
                                            <td><?php echo htmlspecialchars($activity['class_name']); ?></td>
                                            <td>
                                                <?php if ($activity['test'] > 0): ?>
                                                    <span class="badge <?php echo $activity['test'] >= 50 ? 'success' : 'danger'; ?>">
                                                        <?php echo $activity['test']; ?>%
                                                    </span>
                                                <?php else: ?>
                                                    -
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($activity['exam'] > 0): ?>
                                                    <span class="badge <?php echo $activity['exam'] >= 50 ? 'success' : 'danger'; ?>">
                                                        <?php echo $activity['exam']; ?>%
                                                    </span>
                                                <?php else: ?>
                                                    -
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for Detailed Views -->
    <div class="modal" id="detailModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Detailed View</h3>
                <div>
                    <button class="export-btn" id="modalExportBtn" onclick="exportModalData()">
                        <i class="fas fa-download"></i> Export CSV
                    </button>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
            </div>
            <div class="modal-body" id="modalContent">
                <div class="loading-spinner"></div>
            </div>
        </div>
    </div>

    <script>
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Close menu when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');
            
            if (window.innerWidth <= 768 && 
                !sidebar.contains(event.target) && 
                !menuToggle.contains(event.target) &&
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });

        // Filter functions
        function applyFilters() {
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            const status = document.getElementById('statusSelect').value;
            
            window.location.href = '?year_id=' + yearId + '&term=' + term + 
                '&teacher=' + teacher + '&module=' + module + 
                '&class=' + classId + '&status=' + status;
        }

        function resetFilters() {
            window.location.href = '?year_id=<?php echo $current_year_id; ?>&term=<?php echo $current_term; ?>';
        }

        function refreshDashboard() {
            applyFilters();
        }

        // Navigation functions
        function showDashboard() {
            document.getElementById('iframeContainer').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
            
            document.querySelectorAll('.left nav a').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector('.left nav a[onclick="showDashboard()"]').classList.add('active');
        }

        function showIframe(url) {
            document.getElementById('dashboardView').style.display = 'none';
            document.getElementById('iframeContainer').style.display = 'block';
            document.getElementById('contentFrame').src = url;
        }

        function hideIframeLoading() {
            document.getElementById('iframeLoading').style.display = 'none';
        }

        // Initialize navigation links
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.left nav a[target="contentFrame"]').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const url = this.getAttribute('href');
                    showIframe(url);
                });
            });
        });

        // Modal functions
        let currentModalData = null;
        
        function showModal(title, content, exportableData = null) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalContent').innerHTML = content;
            document.getElementById('detailModal').classList.add('active');
            document.body.style.overflow = 'hidden';
            currentModalData = exportableData;
        }

        function closeModal() {
            document.getElementById('detailModal').classList.remove('active');
            document.body.style.overflow = '';
            currentModalData = null;
        }

        function exportModalData() {
            if (!currentModalData) return;
            
            // Create CSV content
            let csv = currentModalData.headers.join(',') + '\n';
            currentModalData.rows.forEach(row => {
                csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
            });
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentModalData.filename || 'export.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        // Show functions for detailed views with AJAX
        function showAllTeachersModal() {
            showModal('All Teachers Performance', '<div class="loading-spinner"></div>');
            
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            const status = document.getElementById('statusSelect').value;
            
            fetch('?view_all=teachers&ajax=1&year_id=' + yearId + '&term=' + term + 
                  '&teacher=' + teacher + '&module=' + module + '&class=' + classId + '&status=' + status)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('modalContent').innerHTML = data.html;
                        
                        // Prepare exportable data from the table
                        const table = document.querySelector('#modalContent table');
                        if (table) {
                            const headers = [];
                            const rows = [];
                            
                            table.querySelectorAll('thead th').forEach(th => {
                                headers.push(th.textContent.trim());
                            });
                            
                            table.querySelectorAll('tbody tr').forEach(tr => {
                                if (tr.querySelector('td') && tr.querySelector('td').colSpan !== 9) {
                                    const row = [];
                                    tr.querySelectorAll('td').forEach(td => {
                                        row.push(td.textContent.trim());
                                    });
                                    rows.push(row);
                                }
                            });
                            
                            currentModalData = {
                                headers: headers,
                                rows: rows,
                                filename: 'teachers_performance.csv'
                            };
                        }
                    } else {
                        document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                });
        }

        function showAllModulesModal() {
            showModal('All Modules Status', '<div class="loading-spinner"></div>');
            
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            const status = document.getElementById('statusSelect').value;
            
            fetch('?view_all=modules&ajax=1&year_id=' + yearId + '&term=' + term + 
                  '&teacher=' + teacher + '&module=' + module + '&class=' + classId + '&status=' + status)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('modalContent').innerHTML = data.html;
                        
                        const table = document.querySelector('#modalContent table');
                        if (table) {
                            const headers = [];
                            const rows = [];
                            
                            table.querySelectorAll('thead th').forEach(th => {
                                headers.push(th.textContent.trim());
                            });
                            
                            table.querySelectorAll('tbody tr').forEach(tr => {
                                if (tr.querySelector('td') && tr.querySelector('td').colSpan !== 7) {
                                    const row = [];
                                    tr.querySelectorAll('td').forEach(td => {
                                        row.push(td.textContent.trim());
                                    });
                                    rows.push(row);
                                }
                            });
                            
                            currentModalData = {
                                headers: headers,
                                rows: rows,
                                filename: 'modules_status.csv'
                            };
                        }
                    } else {
                        document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                });
        }

        function showAllMissingModal() {
            showModal('All Missing Assessments', '<div class="loading-spinner"></div>');
            
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            const status = document.getElementById('statusSelect').value;
            
            fetch('?view_all=missing&ajax=1&year_id=' + yearId + '&term=' + term + 
                  '&teacher=' + teacher + '&module=' + module + '&class=' + classId + '&status=' + status)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('modalContent').innerHTML = data.html;
                        
                        const table = document.querySelector('#modalContent table');
                        if (table) {
                            const headers = [];
                            const rows = [];
                            
                            table.querySelectorAll('thead th').forEach(th => {
                                headers.push(th.textContent.trim());
                            });
                            
                            table.querySelectorAll('tbody tr').forEach(tr => {
                                if (tr.querySelector('td') && tr.querySelector('td').colSpan !== 8) {
                                    const row = [];
                                    tr.querySelectorAll('td').forEach(td => {
                                        row.push(td.textContent.trim());
                                    });
                                    rows.push(row);
                                }
                            });
                            
                            currentModalData = {
                                headers: headers,
                                rows: rows,
                                filename: 'missing_assessments.csv'
                            };
                        }
                    } else {
                        document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                });
        }

        function showAllActivitiesModal() {
            showModal('All Recent Activities', '<div class="loading-spinner"></div>');
            
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            
            fetch('?view_all=activities&ajax=1&year_id=' + yearId + '&term=' + term + 
                  '&teacher=' + teacher + '&module=' + module + '&class=' + classId)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('modalContent').innerHTML = data.html;
                        
                        const table = document.querySelector('#modalContent table');
                        if (table) {
                            const headers = [];
                            const rows = [];
                            
                            table.querySelectorAll('thead th').forEach(th => {
                                headers.push(th.textContent.trim());
                            });
                            
                            table.querySelectorAll('tbody tr').forEach(tr => {
                                if (tr.querySelector('td') && tr.querySelector('td').colSpan !== 7) {
                                    const row = [];
                                    tr.querySelectorAll('td').forEach(td => {
                                        row.push(td.textContent.trim());
                                    });
                                    rows.push(row);
                                }
                            });
                            
                            currentModalData = {
                                headers: headers,
                                rows: rows,
                                filename: 'recent_activities.csv'
                            };
                        }
                    } else {
                        document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('modalContent').innerHTML = '<div style="color: red; text-align: center;">Failed to load data</div>';
                });
        }

        function showActiveUsers() {
            const activeUsers = <?php echo json_encode($active_now); ?>;
            let content = '<div class="active-users-list">';
            content += '<div class="modal-filter-bar">';
            content += '<input type="text" class="modal-search" placeholder="Search users..." onkeyup="filterModalTable(this.value)">';
            content += '</div>';
            content += '<table class="data-table" id="modalTable">';
            content += '<thead><tr><th>User</th><th>Role</th><th>Last Active</th><th>Minutes Ago</th><th>Status</th></tr></thead>';
            content += '<tbody>';
            
            if (activeUsers.length === 0) {
                content += '<tr><td colspan="5" style="text-align: center; padding: 40px;">No active users in the last 10 minutes</td></tr>';
            } else {
                activeUsers.forEach(user => {
                    const isCurrentUser = user.is_current_user ? ' (You)' : '';
                    const minutesAgo = user.minutes_ago;
                    let statusText = 'Active';
                    let statusClass = 'active';
                    
                    if (minutesAgo <= 1) {
                        statusText = 'Active Now';
                        statusClass = 'active';
                    } else if (minutesAgo <= 5) {
                        statusText = 'Active (' + minutesAgo + ' min ago)';
                        statusClass = 'active';
                    } else {
                        statusText = 'Active (' + minutesAgo + ' min ago)';
                        statusClass = 'warning';
                    }
                    
                    content += '<tr>';
                    content += '<td><span class="online-status ' + (statusClass === 'active' ? 'online' : 'offline') + '"></span> ' + user.user_name + isCurrentUser + '</td>';
                    content += '<td>' + (user.role || 'Teacher') + '</td>';
                    content += '<td>' + new Date(user.last_active).toLocaleTimeString() + '</td>';
                    content += '<td>' + minutesAgo + ' min ago</td>';
                    content += '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>';
                    content += '</tr>';
                });
            }
            
            content += '</tbody></table></div>';
            
            // Prepare exportable data
            const exportData = {
                headers: ['User', 'Role', 'Last Active', 'Minutes Ago', 'Status'],
                rows: activeUsers.map(user => [
                    user.user_name + (user.is_current_user ? ' (You)' : ''),
                    user.role || 'Teacher',
                    new Date(user.last_active).toLocaleString(),
                    user.minutes_ago + ' min ago',
                    user.minutes_ago <= 1 ? 'Active Now' : 'Active'
                ]),
                filename: 'active_users_' + new Date().toISOString().slice(0,19).replace(/:/g, '-') + '.csv'
            };
            
            showModal('Active Users (Last 10 Minutes)', content, exportData);
        }

        function showModuleStatus() {
            const modules = <?php echo json_encode($module_status_data); ?>;
            let content = '<div class="module-status">';
            content += '<div class="modal-filter-bar">';
            content += '<input type="text" class="modal-search" placeholder="Search modules..." onkeyup="filterModalTable(this.value)">';
            content += '</div>';
            content += '<table class="data-table" id="modalTable">';
            content += '<thead><tr><th>Module</th><th>Trade</th><th>Status</th><th>Tested</th><th>Examined</th><th>Teachers</th></tr></thead>';
            content += '<tbody>';
            
            if (modules.length === 0) {
                content += '<tr><td colspan="6" style="text-align: center; padding: 40px;">No module data available</td></tr>';
            } else {
                modules.forEach(module => {
                    content += '<tr>';
                    content += '<td>' + module.mname + '</td>';
                    content += '<td>' + (module.trade || 'N/A') + '</td>';
                    content += '<td><span class="badge ' + (module.status === 'Assessed' ? 'success' : 'danger') + '">' + module.status + '</span></td>';
                    content += '<td>' + module.students_tested + '</td>';
                    content += '<td>' + module.students_examined + '</td>';
                    content += '<td>' + (module.teacher_names || 'None') + '</td>';
                    content += '</tr>';
                });
            }
            
            content += '</tbody></table></div>';
            
            const exportData = {
                headers: ['Module', 'Trade', 'Status', 'Tested', 'Examined', 'Teachers'],
                rows: modules.map(module => [
                    module.mname,
                    module.trade || 'N/A',
                    module.status,
                    module.students_tested,
                    module.students_examined,
                    module.teacher_names || 'None'
                ]),
                filename: 'module_status.csv'
            };
            
            showModal('Module Status', content, exportData);
        }

        function showPerformanceDetails() {
            const content = `
                <div class="performance-details">
                    <div class="grid-3">
                        <div class="info-card">
                            <h4><i class="fas fa-check-circle"></i> Test Performance</h4>
                            <div class="info-list">
                                <li><span class="info-label">Average Score:</span> <span class="info-value"><?php echo $stats['avg_test_score']; ?>%</span></li>
                                <li><span class="info-label">Passed:</span> <span class="info-value success"><?php echo $stats['test_passed']; ?></span></li>
                                <li><span class="info-label">Failed:</span> <span class="info-value danger"><?php echo $stats['test_failed']; ?></span></li>
                                <li><span class="info-label">Pass Rate:</span> <span class="info-value"><?php echo $test_passed_rate; ?>%</span></li>
                            </div>
                        </div>
                        <div class="info-card">
                            <h4><i class="fas fa-star"></i> Exam Performance</h4>
                            <div class="info-list">
                                <li><span class="info-label">Average Score:</span> <span class="info-value"><?php echo $stats['avg_exam_score']; ?>%</span></li>
                                <li><span class="info-label">Passed:</span> <span class="info-value success"><?php echo $stats['exam_passed']; ?></span></li>
                                <li><span class="info-label">Failed:</span> <span class="info-value danger"><?php echo $stats['exam_failed']; ?></span></li>
                                <li><span class="info-label">Pass Rate:</span> <span class="info-value"><?php echo $exam_passed_rate; ?>%</span></li>
                            </div>
                        </div>
                        <div class="info-card">
                            <h4><i class="fas fa-chart-pie"></i> Overall Stats</h4>
                            <div class="info-list">
                                <li><span class="info-label">Total Assessments:</span> <span class="info-value"><?php echo $stats['total_assessments']; ?></span></li>
                                <li><span class="info-label">Formative:</span> <span class="info-value"><?php echo $stats['formative_assessments']; ?></span></li>
                                <li><span class="info-label">Comprehensive:</span> <span class="info-value"><?php echo $stats['comprehensive_assessments']; ?></span></li>
                                <li><span class="info-label">Students Assessed:</span> <span class="info-value"><?php echo $stats['students_assessed']; ?></span></li>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            showModal('Performance Details', content);
        }

        // Filter function for modal tables
        function filterModalTable(searchText) {
            const table = document.getElementById('modalTable');
            if (!table) return;
            
            const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            const searchLower = searchText.toLowerCase();
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                let found = false;
                
                for (let j = 0; j < cells.length; j++) {
                    const cell = cells[j];
                    if (cell.textContent.toLowerCase().indexOf(searchLower) > -1) {
                        found = true;
                        break;
                    }
                }
                
                row.style.display = found ? '' : 'none';
            }
        }

        // AJAX for loading details
        function loadDetails(type) {
            const dropdown = document.getElementById('details-' + type);
            
            if (dropdown.classList.contains('loaded')) {
                dropdown.classList.toggle('active');
                return;
            }
            
            if (dropdown.classList.contains('loading')) return;
            
            dropdown.classList.add('loading');
            dropdown.innerHTML = '<div class="loading-spinner"></div><p style="text-align: center;">Loading details...</p>';
            dropdown.classList.add('active');
            
            const yearId = document.getElementById('yearSelect').value;
            const term = document.getElementById('termSelect').value;
            const teacher = document.getElementById('teacherSelect').value;
            const module = document.getElementById('moduleSelect').value;
            const classId = document.getElementById('classSelect').value;
            const status = document.getElementById('statusSelect').value;
            
            fetch('get_details.php?type=' + type + 
                  '&year_id=' + yearId + 
                  '&term=' + term +
                  '&teacher=' + teacher +
                  '&module=' + module +
                  '&class=' + classId +
                  '&status=' + status)
                .then(response => response.text())
                .then(html => {
                    dropdown.innerHTML = html;
                    dropdown.classList.remove('loading');
                    dropdown.classList.add('loaded');
                })
                .catch(error => {
                    console.error('Error:', error);
                    dropdown.innerHTML = '<div style="color: red; text-align: center;">Failed to load details</div>';
                    dropdown.classList.remove('loading');
                });
        }

        // Close modal with escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });

        // Close modal when clicking outside
        document.getElementById('detailModal').addEventListener('click', function(event) {
            if (event.target === this) {
                closeModal();
            }
        });

        // Heartbeat to keep user session active
        let lastHeartbeat = Date.now();
        let heartbeatInterval = null;

        function sendHeartbeat() {
            const now = Date.now();
            // Only send if at least 1 minute has passed since last heartbeat
            if (now - lastHeartbeat < 60000) {
                return;
            }
            
            fetch('heartbeat.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'action=update_activity'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    lastHeartbeat = now;
                    // Update the "last active" display for current user
                    updateCurrentUserActivityDisplay();
                }
            })
            .catch(error => console.log('Heartbeat error:', error));
        }

        function updateCurrentUserActivityDisplay() {
            // Optional: Update the dashboard to show current user as active
            const activeNowElement = document.querySelector('.stat-card.success .stat-value');
            if (activeNowElement) {
                // Add heartbeat indicator
                const heartbeatIndicator = document.createElement('span');
                heartbeatIndicator.className = 'heartbeat-indicator';
                heartbeatIndicator.innerHTML = ' ●';
                heartbeatIndicator.style.color = '#27ae60';
                heartbeatIndicator.style.fontSize = '12px';
                heartbeatIndicator.style.marginLeft = '5px';
                
                // Add indicator if not exists
                if (!document.querySelector('.heartbeat-indicator')) {
                    activeNowElement.parentElement.appendChild(heartbeatIndicator);
                    setTimeout(() => {
                        if (heartbeatIndicator) heartbeatIndicator.remove();
                    }, 2000);
                }
            }
        }
        
        // Start heartbeat every 60 seconds (60000 ms)
        heartbeatInterval = setInterval(sendHeartbeat, 60000);
        
        // Send initial heartbeat after 3 seconds
        setTimeout(sendHeartbeat, 3000);
        
        // Also update activity on page visibility change
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                sendHeartbeat();
            }
        });
        
        // Update activity on user interaction (mouse move, click, keypress)
        let activityTimeout;
        function userActivity() {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                sendHeartbeat();
            }, 5000);
        }
        
        document.addEventListener('mousemove', userActivity);
        document.addEventListener('click', userActivity);
        document.addEventListener('keypress', userActivity);
    </script>
</body>
</html>