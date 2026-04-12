<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$student_class_id = $_SESSION['student_class_id'];
$student_class_name = $_SESSION['student_class_name'];

// Get current active year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year = mysqli_fetch_assoc($current_year_query);
$current_year_id = $current_year ? $current_year['year_id'] : 0;

// Get the actual class ID for the student's class
$actual_class_query = mysqli_query($conn, "
    SELECT cid, class_name, class_code 
    FROM class 
    WHERE class_name = '$student_class_name' 
    OR cid = '$student_class_id'
    LIMIT 1
");
$actual_class = mysqli_fetch_assoc($actual_class_query);
$actual_class_id = $actual_class ? $actual_class['cid'] : $student_class_id;
$actual_class_name = $actual_class ? $actual_class['class_name'] : $student_class_name;

// Get all assessments for the student's class (match by class ID)
$assessments_query = mysqli_query($conn, "
    SELECT a.*, 
           (SELECT submission_id FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submitted,
           (SELECT obtained_marks FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as obtained_marks,
           (SELECT status FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submission_status,
           (SELECT feedback FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as feedback,
           (SELECT submission_date FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submission_date,
           (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE (c.cid = '$actual_class_id' OR c.class_name = '$actual_class_name')
    AND a.status = 'published'
    ORDER BY a.start_date DESC, a.created_at DESC
");

// Debug: Show what's being queried
$debug_info = [
    'student_class_name' => $student_class_name,
    'student_class_id' => $student_class_id,
    'actual_class_id' => $actual_class_id,
    'actual_class_name' => $actual_class_name,
    'query_class_id' => $actual_class_id,
    'assessment_count' => mysqli_num_rows($assessments_query)
];

// If no assessments found with class ID, try to get all assessments
if(mysqli_num_rows($assessments_query) == 0) {
    // Try to get assessments without class filter (for debugging)
    $assessments_query = mysqli_query($conn, "
        SELECT a.*, 
               (SELECT submission_id FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submitted,
               (SELECT obtained_marks FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as obtained_marks,
               (SELECT status FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submission_status,
               (SELECT feedback FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as feedback,
               (SELECT submission_date FROM assessment_submissions WHERE assessment_id = a.assessment_id AND sid = '$sid') as submission_date,
               (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions
        FROM assessments a
        WHERE a.status = 'published'
        ORDER BY a.start_date DESC, a.created_at DESC
    ");
}

// Get assessment summary based on actual class
$summary = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN a.end_date < CURDATE() OR (a.end_date = CURDATE() AND a.end_time < CURTIME()) THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN a.start_date > CURDATE() OR (a.start_date = CURDATE() AND a.start_time > CURTIME()) THEN 1 ELSE 0 END) as upcoming_count,
        SUM(CASE WHEN a.start_date <= CURDATE() AND a.end_date >= CURDATE() THEN 1 ELSE 0 END) as ongoing_count
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE (c.cid = '$actual_class_id' OR c.class_name = '$actual_class_name')
    AND a.status = 'published'
"));

// Handle any session messages
$success = isset($_SESSION['success']) ? $_SESSION['success'] : null;
$error = isset($_SESSION['error']) ? $_SESSION['error'] : null;
$take_assessment_error = isset($_SESSION['take_assessment_error']) ? $_SESSION['take_assessment_error'] : null;
$take_assessment_debug = isset($_SESSION['take_assessment_debug']) ? $_SESSION['take_assessment_debug'] : null;

// Clear session messages
unset($_SESSION['success']);
unset($_SESSION['error']);
unset($_SESSION['take_assessment_error']);
unset($_SESSION['take_assessment_debug']);

// Helper function to safely escape HTML
function safeHtml($str) {
    return htmlspecialchars($str ?? '', ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Assessments - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background-color: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .sidebar {
            background-color: rgb(8, 58, 8);
            min-height: 100vh;
            color: white;
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            z-index: 1000;
            transition: all 0.3s;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }
        .sidebar a {
            color: white;
            text-decoration: none;
            display: block;
            padding: 12px 20px;
            transition: all 0.3s;
            border-left: 4px solid transparent;
        }
        .sidebar a:hover {
            background-color: rgb(5, 40, 5);
            padding-left: 25px;
            border-left-color: #ffc107;
        }
        .sidebar a.active {
            background-color: rgb(5, 40, 5);
            border-left-color: #ffc107;
        }
        .sidebar a i {
            width: 25px;
            margin-right: 10px;
        }
        .sidebar .user-info {
            padding: 25px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        .sidebar .user-info i {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        .main-content {
            margin-left: 280px;
            padding: 20px;
            transition: all 0.3s;
        }
        .assessment-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: all 0.3s;
            border-left: 4px solid rgb(8, 58, 8);
        }
        .assessment-card:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            display: inline-block;
        }
        .status-upcoming { background: #ffc107; color: #000; }
        .status-ongoing { background: #28a745; color: #fff; }
        .status-closed { background: #dc3545; color: #fff; }
        .status-submitted { background: #17a2b8; color: #fff; }
        .status-graded { background: #6c757d; color: #fff; }
        .btn-take {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 8px 20px;
            border-radius: 5px;
            border: none;
            text-decoration: none;
            display: inline-block;
        }
        .btn-take:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .btn-take.disabled {
            background-color: #6c757d;
            cursor: not-allowed;
            opacity: 0.6;
        }
        .summary-card {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .summary-card:hover {
            transform: translateY(-5px);
        }
        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }
        .filter-buttons {
            margin-bottom: 20px;
        }
        .filter-btn {
            margin-right: 10px;
            padding: 8px 20px;
            border-radius: 5px;
            border: 1px solid rgb(8, 58, 8);
            background: white;
            color: rgb(8, 58, 8);
            cursor: pointer;
            transition: all 0.3s;
        }
        .filter-btn.active, .filter-btn:hover {
            background: rgb(8, 58, 8);
            color: white;
        }
        .debug-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 20px;
            font-size: 12px;
            display: none;
        }
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                min-height: auto;
            }
            .main-content {
                margin-left: 0;
            }
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="user-info">
            <i class="fas fa-user-circle"></i>
            <h5><?php echo safeHtml($_SESSION['student_name']); ?></h5>
            <small><?php echo safeHtml($_SESSION['student_reg']); ?></small>
            <div class="mt-2">
                <span class="badge bg-warning text-dark"><?php echo safeHtml($actual_class_name); ?></span>
            </div>
        </div>
        <a href="student_dashboard.php">
            <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>
        <a href="student_online_classes.php">
            <i class="fas fa-video"></i> Online Classes
        </a>
        <a href="student_assessments.php" class="active">
            <i class="fas fa-tasks"></i> Assessments
        </a>
        <a href="student_results.php">
            <i class="fas fa-chart-line"></i> My Results
        </a>
        <a href="student_attendance.php">
            <i class="fas fa-calendar-check"></i> Attendance
        </a>
        <a href="student_forum.php">
            <i class="fas fa-comments"></i> Discussion Forum
        </a>
        <a href="student_announcements.php">
            <i class="fas fa-bullhorn"></i> Announcements
        </a>
        <a href="student_profile.php">
            <i class="fas fa-user"></i> My Profile
        </a>
        <a href="logout.php" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
            <i class="fas fa-sign-out-alt"></i> Logout
        </a>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-tasks"></i> My Assessments
            <small class="text-muted">Class: <?php echo safeHtml($actual_class_name); ?></small>
        </h2>
        
        <!-- Debug Info (hidden by default, can be shown for troubleshooting) -->
        <div class="debug-info" id="debugInfo">
            <strong>Debug Information:</strong><br>
            Student Class Name: <?php echo safeHtml($student_class_name); ?><br>
            Student Class ID: <?php echo safeHtml($student_class_id); ?><br>
            Actual Class ID: <?php echo safeHtml($actual_class_id); ?><br>
            Actual Class Name: <?php echo safeHtml($actual_class_name); ?><br>
            Assessments Found: <?php echo mysqli_num_rows($assessments_query); ?><br>
            <button onclick="document.getElementById('debugInfo').style.display='none'" class="btn btn-sm btn-secondary mt-2">Hide</button>
        </div>
        
        <?php if(mysqli_num_rows($assessments_query) == 0): ?>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> 
                <strong>No assessments found for your class.</strong> 
                <button onclick="document.getElementById('debugInfo').style.display='block'" class="btn btn-sm btn-link">Show Debug Info</button>
            </div>
        <?php endif; ?>
        
        <!-- Alert Messages -->
        <?php if($success): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle"></i> <?php echo safeHtml($success); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if($error): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-circle"></i> <?php echo safeHtml($error); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if($take_assessment_error && is_array($take_assessment_error)): ?>
            <div class="alert alert-warning alert-dismissible fade show">
                <i class="fas fa-exclamation-triangle"></i> 
                <strong>Cannot take assessment:</strong>
                <ul class="mb-0 mt-2">
                    <?php foreach($take_assessment_error as $err): ?>
                        <li><?php echo safeHtml($err); ?></li>
                    <?php endforeach; ?>
                </ul>
                <?php if($take_assessment_debug && is_array($take_assessment_debug)): ?>
                    <hr>
                    <small><strong>Debug Info:</strong><br>
                    <?php foreach($take_assessment_debug as $key => $value): ?>
                        <?php echo safeHtml($key) . ': ' . safeHtml($value) . '<br>'; ?>
                    <?php endforeach; ?>
                    </small>
                <?php endif; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <!-- Summary Cards -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="summary-card" onclick="filterAssessments('all')">
                    <h3><?php echo isset($summary['total']) ? $summary['total'] : 0; ?></h3>
                    <p>Total Assessments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card" onclick="filterAssessments('ongoing')">
                    <h3><?php echo isset($summary['ongoing_count']) ? $summary['ongoing_count'] : 0; ?></h3>
                    <p>Ongoing</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card" onclick="filterAssessments('upcoming')">
                    <h3><?php echo isset($summary['upcoming_count']) ? $summary['upcoming_count'] : 0; ?></h3>
                    <p>Upcoming</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="summary-card" onclick="filterAssessments('completed')">
                    <h3><?php echo isset($summary['completed_count']) ? $summary['completed_count'] : 0; ?></h3>
                    <p>Completed</p>
                </div>
            </div>
        </div>
        
        <!-- Filter Buttons -->
        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterAssessments('all')">All Assessments</button>
            <button class="filter-btn" onclick="filterAssessments('ongoing')">Ongoing</button>
            <button class="filter-btn" onclick="filterAssessments('upcoming')">Upcoming</button>
            <button class="filter-btn" onclick="filterAssessments('completed')">Completed</button>
            <button class="filter-btn" onclick="filterAssessments('submitted')">Submitted</button>
            <button class="filter-btn" onclick="filterAssessments('graded')">Graded</button>
        </div>
        
        <!-- Assessments List -->
        <div class="card">
            <div class="card-header" style="background-color: rgb(8, 58, 8); color: white;">
                <i class="fas fa-list"></i> Assessments List
            </div>
            <div class="card-body" id="assessmentsContainer">
                <?php if(isset($assessments_query) && mysqli_num_rows($assessments_query) > 0): ?>
                    <?php while($assessment = mysqli_fetch_assoc($assessments_query)): 
                        $current_date = date('Y-m-d');
                        $current_time = date('H:i:s');
                        $start_datetime = ($assessment['start_date'] ?? '') . ' ' . ($assessment['start_time'] ?? '');
                        $end_datetime = ($assessment['end_date'] ?? '') . ' ' . ($assessment['end_time'] ?? '');
                        
                        // Determine assessment status
                        $is_open = (isset($assessment['start_date']) && isset($assessment['end_date']) && 
                                   $assessment['start_date'] <= $current_date && 
                                   $assessment['end_date'] >= $current_date);
                        $is_upcoming = (isset($assessment['start_date']) && $assessment['start_date'] > $current_date);
                        $is_closed = (isset($assessment['end_date']) && $assessment['end_date'] < $current_date);
                        $is_submitted = isset($assessment['submitted']) && $assessment['submitted'] !== null;
                        $is_graded = isset($assessment['submission_status']) && $assessment['submission_status'] == 'graded';
                        
                        // Determine card status class
                        if($is_graded) {
                            $card_status = 'graded';
                        } elseif($is_submitted) {
                            $card_status = 'submitted';
                        } elseif($is_open) {
                            $card_status = 'ongoing';
                        } elseif($is_upcoming) {
                            $card_status = 'upcoming';
                        } else {
                            $card_status = 'closed';
                        }
                    ?>
                        <div class="assessment-card" data-status="<?php echo $card_status; ?>">
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <h5><?php echo safeHtml($assessment['title']); ?></h5>
                                        <?php if(isset($assessment['total_questions']) && $assessment['total_questions'] == 0): ?>
                                            <span class="badge bg-danger">No Questions</span>
                                        <?php endif; ?>
                                    </div>
                                    <p class="text-muted mb-2"><?php echo safeHtml($assessment['description']); ?></p>
                                    <div class="row mt-2">
                                        <div class="col-md-6">
                                            <small class="text-muted">
                                                <i class="fas fa-calendar-alt"></i> Start: <?php echo date('M d, Y H:i', strtotime($start_datetime)); ?>
                                            </small>
                                        </div>
                                        <div class="col-md-6">
                                            <small class="text-muted">
                                                <i class="fas fa-calendar-check"></i> End: <?php echo date('M d, Y H:i', strtotime($end_datetime)); ?>
                                            </small>
                                        </div>
                                    </div>
                                    <div class="row mt-1">
                                        <div class="col-md-4">
                                            <small class="text-muted">
                                                <i class="fas fa-star"></i> Total Marks: <?php echo isset($assessment['total_marks']) ? $assessment['total_marks'] : 0; ?>
                                            </small>
                                        </div>
                                        <div class="col-md-4">
                                            <small class="text-muted">
                                                <i class="fas fa-clock"></i> Duration: <?php echo isset($assessment['duration_minutes']) ? $assessment['duration_minutes'] : 0; ?> mins
                                            </small>
                                        </div>
                                        <div class="col-md-4">
                                            <small class="text-muted">
                                                <i class="fas fa-question-circle"></i> Questions: <?php echo isset($assessment['total_questions']) ? $assessment['total_questions'] : 0; ?>
                                            </small>
                                        </div>
                                    </div>
                                    
                                    <?php if($is_graded && isset($assessment['feedback']) && $assessment['feedback']): ?>
                                        <div class="mt-2">
                                            <small class="text-info">
                                                <i class="fas fa-comment"></i> Feedback: <?php echo safeHtml($assessment['feedback']); ?>
                                            </small>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                <div class="col-md-4 text-end">
                                    <?php if($is_open && !$is_submitted && isset($assessment['total_questions']) && $assessment['total_questions'] > 0): ?>
                                        <span class="status-badge status-ongoing mb-2">Ongoing</span>
                                        <br>
                                        <a href="take_assessment.php?id=<?php echo $assessment['assessment_id']; ?>" 
                                           class="btn-take mt-2"
                                           onclick="return confirm('Are you ready to start this assessment?')">
                                            <i class="fas fa-play"></i> Take Assessment
                                        </a>
                                    <?php elseif($is_open && !$is_submitted && isset($assessment['total_questions']) && $assessment['total_questions'] == 0): ?>
                                        <span class="status-badge status-ongoing mb-2">Ongoing</span>
                                        <br>
                                        <button class="btn-take disabled mt-2" disabled>
                                            <i class="fas fa-exclamation-triangle"></i> No Questions
                                        </button>
                                    <?php elseif($is_open && $is_submitted && !$is_graded): ?>
                                        <span class="status-badge status-submitted">Submitted - Awaiting Grading</span>
                                        <div class="mt-2">
                                            <small class="text-muted">Submitted on: <?php echo isset($assessment['submission_date']) ? date('M d, H:i', strtotime($assessment['submission_date'])) : 'N/A'; ?></small>
                                        </div>
                                    <?php elseif($is_upcoming): ?>
                                        <span class="status-badge status-upcoming">Upcoming</span>
                                        <br>
                                        <small class="text-muted">
                                            Starts in: 
                                            <?php 
                                            if(isset($start_datetime) && $start_datetime != ' '):
                                                $start = strtotime($start_datetime);
                                                $now = time();
                                                $diff = $start - $now;
                                                if($diff > 0) {
                                                    $days = floor($diff / (60 * 60 * 24));
                                                    if($days > 0) {
                                                        echo $days . " days";
                                                    } else {
                                                        $hours = floor($diff / (60 * 60));
                                                        echo $hours . " hours";
                                                    }
                                                } else {
                                                    echo "soon";
                                                }
                                            else:
                                                echo "N/A";
                                            endif;
                                            ?>
                                        </small>
                                    <?php elseif($is_closed && !$is_submitted): ?>
                                        <span class="status-badge status-closed">Closed - Missed</span>
                                        <br>
                                        <small class="text-muted">Ended on <?php echo isset($assessment['end_date']) ? date('M d, Y', strtotime($assessment['end_date'])) : 'N/A'; ?></small>
                                    <?php elseif($is_graded): ?>
                                        <span class="status-badge status-graded">Graded</span>
                                        <div class="mt-2">
                                            <h4><?php echo isset($assessment['obtained_marks']) ? $assessment['obtained_marks'] : 0; ?>/<?php echo isset($assessment['total_marks']) ? $assessment['total_marks'] : 0; ?></h4>
                                            <?php 
                                                $obtained = isset($assessment['obtained_marks']) ? $assessment['obtained_marks'] : 0;
                                                $total = isset($assessment['total_marks']) ? $assessment['total_marks'] : 1;
                                                $percentage = ($obtained / $total) * 100;
                                                $grade = $percentage >= 80 ? 'A' : ($percentage >= 70 ? 'B' : ($percentage >= 60 ? 'C' : ($percentage >= 50 ? 'D' : 'F')));
                                                $grade_color = $percentage >= 70 ? 'success' : ($percentage >= 50 ? 'warning' : 'danger');
                                            ?>
                                            <span class="badge bg-<?php echo $grade_color; ?>">
                                                Grade: <?php echo $grade; ?> (<?php echo round($percentage, 1); ?>%)
                                            </span>
                                            <br>
                                            <a href="view_assessment_result.php?id=<?php echo $assessment['assessment_id']; ?>" class="btn btn-sm btn-outline-secondary mt-2">
                                                <i class="fas fa-eye"></i> View Details
                                            </a>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                <?php else: ?>
                    <div class="text-center p-5">
                        <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                        <h4>No Assessments Available</h4>
                        <p>No assessments have been published for your class yet.</p>
                        <p class="text-muted">Check back later for new assessments.</p>
                        <?php if(mysqli_num_rows($assessments_query) == 0 && isset($debug_info['assessment_count']) && $debug_info['assessment_count'] == 0): ?>
                            <button onclick="document.getElementById('debugInfo').style.display='block'" class="btn btn-sm btn-outline-secondary mt-2">
                                <i class="fas fa-bug"></i> Show Debug Info
                            </button>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
        // Filter assessments by status
        function filterAssessments(status) {
            const assessments = document.querySelectorAll('.assessment-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update active button
            buttons.forEach(btn => btn.classList.remove('active'));
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            // Filter assessments
            assessments.forEach(assessment => {
                const cardStatus = assessment.getAttribute('data-status');
                if (status === 'all') {
                    assessment.style.display = 'block';
                } else if (cardStatus === status) {
                    assessment.style.display = 'block';
                } else {
                    assessment.style.display = 'none';
                }
            });
        }
    </script>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>