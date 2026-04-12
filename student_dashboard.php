<?php
session_start();
include("connection.php");

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$student_name = $_SESSION['student_name'];
$student_class_id = $_SESSION['student_class_id'];
$student_class_name = $_SESSION['student_class_name'];

// Get current active year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year = mysqli_fetch_assoc($current_year_query);
$current_year_id = $current_year ? $current_year['year_id'] : 0;
$current_year_name = $current_year ? $current_year['year'] : 'N/A';

// Get student information
$student_query = mysqli_query($conn, "
    SELECT s.*, c.class_name, c.class_code
    FROM student s
    INNER JOIN class c ON s.class = c.cid
    WHERE s.sid = '$sid'
");
$student = mysqli_fetch_assoc($student_query);

// Get statistics
$total_assessments = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as cnt FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE c.cid = '$student_class_id' AND a.status = 'published'"));
$completed = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as cnt FROM assessment_submissions sub INNER JOIN assessments a ON sub.assessment_id = a.assessment_id INNER JOIN class c ON a.cid = c.cid WHERE sub.sid = '$sid' AND c.cid = '$student_class_id' AND sub.status = 'graded'"));
$pending = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as cnt FROM assessments a INNER JOIN class c ON a.cid = c.cid WHERE c.cid = '$student_class_id' AND a.status = 'published' AND a.end_date >= CURDATE() AND a.assessment_id NOT IN (SELECT assessment_id FROM assessment_submissions WHERE sid = '$sid')"));
$upcoming_classes = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as cnt FROM online_classes oc INNER JOIN class c ON oc.cid = c.cid WHERE c.cid = '$student_class_id' AND oc.scheduled_date >= CURDATE() AND oc.status = 'scheduled'"));

// Get recent activities
$recent_assessments = mysqli_query($conn, "
    SELECT a.*, sub.obtained_marks, sub.status as submission_status
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id AND sub.sid = '$sid'
    WHERE c.cid = '$student_class_id'
    ORDER BY a.created_at DESC
    LIMIT 5
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard</title>
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
        .sidebar .user-info img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 10px;
            border: 3px solid #ffc107;
        }
        .main-content {
            margin-left: 280px;
            padding: 20px;
            transition: all 0.3s;
        }
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            transition: transform 0.3s;
            cursor: pointer;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .stat-icon {
            font-size: 2.5rem;
            color: rgb(8, 58, 8);
        }
        .card-header-custom {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 12px 20px;
            border-radius: 10px 10px 0 0;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
            transition: all 0.3s;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
            transform: translateY(-2px);
        }
        .btn-outline-green {
            border: 1px solid rgb(8, 58, 8);
            color: rgb(8, 58, 8);
            background: transparent;
        }
        .btn-outline-green:hover {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .activity-card {
            border-left: 4px solid rgb(8, 58, 8);
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        .activity-card:hover {
            transform: translateX(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .notification-badge {
            position: relative;
        }
        .notification-count {
            position: absolute;
            top: -8px;
            right: -8px;
            background-color: red;
            color: white;
            border-radius: 50%;
            padding: 2px 6px;
            font-size: 10px;
        }
        .welcome-banner {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
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
    <!-- Sidebar Menu -->
    <div class="sidebar">
        <div class="user-info">
            <i class="fas fa-user-circle fa-4x mb-2"></i>
            <h5><?php echo htmlspecialchars($student_name); ?></h5>
            <small><?php echo htmlspecialchars($student['reg']); ?></small>
            <div class="mt-2">
                <span class="badge bg-warning text-dark"><?php echo htmlspecialchars($student_class_name); ?></span>
            </div>
        </div>
        
        <a href="student_dashboard.php" class="active">
            <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>
        <a href="student_online_classes.php">
            <i class="fas fa-video"></i> Online Classes
            <span class="badge bg-warning float-end mt-1"><?php echo $upcoming_classes['cnt']; ?></span>
        </a>
        <a href="student_assessments.php">
            <i class="fas fa-tasks"></i> Assessments
            <span class="badge bg-warning float-end mt-1"><?php echo $pending['cnt']; ?></span>
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
        <!-- Welcome Banner -->
        <div class="welcome-banner">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h3><i class="fas fa-graduation-cap"></i> Welcome back, <?php echo htmlspecialchars($student['firstname']); ?>!</h3>
                    <p class="mb-0">Academic Year: <?php echo $current_year_name; ?> | Class: <?php echo htmlspecialchars($student_class_name); ?></p>
                </div>
                <div class="notification-badge">
                    <a href="student_notifications.php" class="btn btn-light">
                        <i class="fas fa-bell"></i> Notifications
                        <?php 
                        $unread_count = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as cnt FROM notifications WHERE sid='$sid' AND is_read=0"));
                        if($unread_count['cnt'] > 0): 
                        ?>
                            <span class="notification-count"><?php echo $unread_count['cnt']; ?></span>
                        <?php endif; ?>
                    </a>
                </div>
            </div>
        </div>

        <!-- Statistics Cards -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="stat-card text-center" onclick="location.href='student_assessments.php'">
                    <i class="fas fa-tasks stat-icon"></i>
                    <h3><?php echo $total_assessments['cnt']; ?></h3>
                    <p>Total Assessments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center" onclick="location.href='student_results.php'">
                    <i class="fas fa-check-circle stat-icon"></i>
                    <h3><?php echo $completed['cnt']; ?></h3>
                    <p>Completed</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center" onclick="location.href='student_assessments.php'">
                    <i class="fas fa-clock stat-icon"></i>
                    <h3><?php echo $pending['cnt']; ?></h3>
                    <p>Pending Assessments</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center" onclick="location.href='student_online_classes.php'">
                    <i class="fas fa-video stat-icon"></i>
                    <h3><?php echo $upcoming_classes['cnt']; ?></h3>
                    <p>Upcoming Classes</p>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Quick Actions -->
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header-custom">
                        <i class="fas fa-bolt"></i> Quick Actions
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <a href="student_online_classes.php" class="btn btn-green w-100">
                                    <i class="fas fa-video"></i> Join Live Class
                                </a>
                            </div>
                            <div class="col-md-6 mb-3">
                                <a href="student_assessments.php" class="btn btn-green w-100">
                                    <i class="fas fa-play"></i> Take Assessment
                                </a>
                            </div>
                            <div class="col-md-6 mb-3">
                                <a href="student_forum.php" class="btn btn-outline-green w-100">
                                    <i class="fas fa-comment"></i> Ask Question
                                </a>
                            </div>
                            <div class="col-md-6 mb-3">
                                <a href="student_results.php" class="btn btn-outline-green w-100">
                                    <i class="fas fa-chart-line"></i> View Results
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upcoming Online Classes -->
                <div class="card">
                    <div class="card-header-custom">
                        <i class="fas fa-video"></i> Upcoming Online Classes
                    </div>
                    <div class="card-body">
                        <?php
                        $upcoming_classes_list = mysqli_query($conn, "
                            SELECT oc.*, t.fname, t.lname
                            FROM online_classes oc
                            INNER JOIN class c ON oc.cid = c.cid
                            INNER JOIN teacher t ON oc.tid = t.tid
                            WHERE c.cid = '$student_class_id' 
                            AND oc.scheduled_date >= CURDATE()
                            AND oc.status = 'scheduled'
                            ORDER BY oc.scheduled_date ASC, oc.start_time ASC
                            LIMIT 5
                        ");
                        if(mysqli_num_rows($upcoming_classes_list) > 0): 
                            while($class = mysqli_fetch_assoc($upcoming_classes_list)): 
                        ?>
                            <div class="activity-card">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6><?php echo htmlspecialchars($class['title']); ?></h6>
                                        <small class="text-muted">
                                            <i class="far fa-calendar-alt"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                            at <?php echo date('h:i A', strtotime($class['start_time'])); ?>
                                        </small>
                                        <br>
                                        <small>Teacher: <?php echo htmlspecialchars($class['fname'] . ' ' . $class['lname']); ?></small>
                                    </div>
                                    <a href="<?php echo $class['meeting_link']; ?>" target="_blank" class="btn btn-sm btn-green">
                                        <i class="fas fa-video"></i> Join
                                    </a>
                                </div>
                            </div>
                        <?php 
                            endwhile;
                        else: 
                        ?>
                            <div class="text-center p-4">
                                <i class="fas fa-calendar fa-2x text-muted mb-2"></i>
                                <p>No upcoming online classes</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Recent Activities -->
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header-custom">
                        <i class="fas fa-history"></i> Recent Assessments
                    </div>
                    <div class="card-body">
                        <?php if(mysqli_num_rows($recent_assessments) > 0): ?>
                            <?php while($assessment = mysqli_fetch_assoc($recent_assessments)): ?>
                                <div class="activity-card">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6><?php echo htmlspecialchars($assessment['title']); ?></h6>
                                            <small class="text-muted">
                                                <i class="far fa-calendar-alt"></i> Due: <?php echo date('M d, Y', strtotime($assessment['end_date'])); ?>
                                            </small>
                                        </div>
                                        <div>
                                            <?php if($assessment['submission_status'] == 'graded'): ?>
                                                <span class="badge bg-success">Graded: <?php echo $assessment['obtained_marks']; ?>/<?php echo $assessment['total_marks']; ?></span>
                                            <?php elseif($assessment['submission_status'] == 'submitted'): ?>
                                                <span class="badge bg-warning">Submitted</span>
                                            <?php else: ?>
                                                <a href="take_assessment.php?id=<?php echo $assessment['assessment_id']; ?>" class="btn btn-sm btn-green">Take</a>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <div class="text-center p-4">
                                <i class="fas fa-tasks fa-2x text-muted mb-2"></i>
                                <p>No assessments available</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Recent Announcements -->
                <div class="card">
                    <div class="card-header-custom">
                        <i class="fas fa-bullhorn"></i> Latest Announcements
                    </div>
                    <div class="card-body">
                        <?php
                        $announcements = mysqli_query($conn, "
                            SELECT a.*, t.fname, t.lname
                            FROM announcements a
                            INNER JOIN class c ON a.cid = c.cid
                            INNER JOIN teacher t ON a.tid = t.tid
                            WHERE c.cid = '$student_class_id' 
                            AND (a.expires_at IS NULL OR a.expires_at >= CURDATE())
                            ORDER BY a.created_at DESC
                            LIMIT 5
                        ");
                        if(mysqli_num_rows($announcements) > 0): 
                            while($ann = mysqli_fetch_assoc($announcements)): 
                        ?>
                            <div class="activity-card">
                                <div>
                                    <h6>
                                        <?php if($ann['important']): ?>
                                            <i class="fas fa-exclamation-circle text-danger"></i>
                                        <?php endif; ?>
                                        <?php echo htmlspecialchars($ann['title']); ?>
                                    </h6>
                                    <small class="text-muted">
                                        By: <?php echo htmlspecialchars($ann['fname'] . ' ' . $ann['lname']); ?>
                                        on <?php echo date('M d, Y', strtotime($ann['created_at'])); ?>
                                    </small>
                                    <p class="mt-2 mb-0"><?php echo htmlspecialchars(substr($ann['content'], 0, 100)); ?>...</p>
                                </div>
                            </div>
                        <?php 
                            endwhile;
                        else: 
                        ?>
                            <div class="text-center p-4">
                                <i class="fas fa-bell-slash fa-2x text-muted mb-2"></i>
                                <p>No announcements</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>