<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = $_SESSION['tcode'];

// Get teacher info
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get total classes taught by teacher
$classes_query = mysqli_query($conn, "SELECT COUNT(*) as total FROM class WHERE tid='$tid'");
$classes = mysqli_fetch_assoc($classes_query);

// Get total students across all classes
$students_query = mysqli_query($conn, "
    SELECT COUNT(DISTINCT s.sid) as total 
    FROM student s 
    JOIN class c ON s.class = c.class_name 
    WHERE c.tid='$tid'
");
$students = mysqli_fetch_assoc($students_query);

// Get upcoming online classes
$upcoming_classes = mysqli_query($conn, "
    SELECT COUNT(*) as total 
    FROM online_classes 
    WHERE tid='$tid' 
    AND status='scheduled' 
    AND scheduled_date >= CURDATE()
");
$upcoming = mysqli_fetch_assoc($upcoming_classes);

// Get pending assessments to grade
$pending_grading = mysqli_query($conn, "
    SELECT COUNT(*) as total 
    FROM assessment_submissions 
    WHERE status='submitted'
");
$pending = mysqli_fetch_assoc($pending_grading);

// Get recent online classes
$recent_classes = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid'
    ORDER BY oc.scheduled_date DESC, oc.start_time DESC
    LIMIT 5
");

// Get recent assessments
$recent_assessments = mysqli_query($conn, "
    SELECT a.*, c.class_name,
           (SELECT COUNT(*) FROM assessment_submissions WHERE assessment_id = a.assessment_id) as submissions
    FROM assessments a
    JOIN class c ON a.cid = c.cid
    WHERE a.tid='$tid'
    ORDER BY a.created_at DESC
    LIMIT 5
");

// Get recent announcements
$announcements = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM announcements a
    JOIN class c ON a.cid = c.cid
    WHERE a.tid='$tid'
    ORDER BY a.created_at DESC
    LIMIT 5
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Dashboard Home</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid rgb(8, 58, 8);
            transition: transform 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .stat-icon {
            font-size: 2rem;
            color: rgb(8, 58, 8);
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 1.8rem;
            font-weight: bold;
            margin: 10px 0;
            color: rgb(8, 58, 8);
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .card {
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .card-header {
            background: white;
            border-bottom: 2px solid rgb(8, 58, 8);
            padding: 12px 15px;
            font-weight: bold;
            border-radius: 8px 8px 0 0 !important;
            color: rgb(8, 58, 8);
        }
        
        .class-item, .assessment-item, .announcement-item {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        
        .class-item:hover, .assessment-item:hover, .announcement-item:hover {
            background: #f9f9f9;
        }
        
        .badge-status {
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: normal;
        }
        
        .badge-scheduled {
            background: #e8f5e9;
            color: rgb(8, 58, 8);
        }
        
        .badge-published {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .badge-completed {
            background: #f5f5f5;
            color: #666;
        }
        
        .badge-ongoing {
            background: #fff3e0;
            color: #f57c00;
        }
        
        .badge-draft {
            background: #f5f5f5;
            color: #999;
        }
        
        .btn-outline-green {
            border: 1px solid rgb(8, 58, 8);
            color: rgb(8, 58, 8);
            background: transparent;
            padding: 3px 10px;
            font-size: 0.75rem;
            border-radius: 4px;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }
        
        .btn-outline-green:hover {
            background: rgb(8, 58, 8);
            color: white;
            text-decoration: none;
        }
        
        .btn-link-green {
            color: rgb(8, 58, 8);
            text-decoration: none;
        }
        
        .btn-link-green:hover {
            text-decoration: underline;
            color: rgb(5, 40, 5);
        }
        
        .quick-action-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.3s;
            border: 1px solid #e0e0e0;
        }
        
        .quick-action-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-color: rgb(8, 58, 8);
        }
        
        .quick-action-icon {
            font-size: 2rem;
            color: rgb(8, 58, 8);
            margin-bottom: 10px;
        }
        
        .quick-action-title {
            font-size: 0.9rem;
            margin: 10px 0;
            font-weight: 500;
            color: #333;
        }
        
        h4 {
            color: rgb(8, 58, 8);
        }
        
        .text-muted {
            color: #6c757d;
        }
        
        .text-green {
            color: rgb(8, 58, 8);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <!-- Welcome Section -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="stat-card">
                    <h4>Welcome back, <?php echo htmlspecialchars($teacher['fname']." ".$teacher['lname']); ?>!</h4>
                    <p class="text-muted mb-0">Here's an overview of your teaching activities.</p>
                </div>
            </div>
        </div>
        
        <!-- Statistics -->
        <div class="row">
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-chalkboard"></i>
                    </div>
                    <div class="stat-value"><?php echo $classes['total']; ?></div>
                    <div class="stat-label">Classes Teaching</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-value"><?php echo $students['total']; ?></div>
                    <div class="stat-label">Total Students</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="stat-value"><?php echo $upcoming['total']; ?></div>
                    <div class="stat-label">Upcoming Classes</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <div class="stat-value"><?php echo $pending['total']; ?></div>
                    <div class="stat-label">Pending Grading</div>
                </div>
            </div>
        </div>
        
        <!-- Recent Online Classes and Assessments -->
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-video me-2 text-green"></i> Recent Online Classes
                        <a href="manage_online_classes.php" class="btn-outline-green float-end">View All</a>
                    </div>
                    <div class="card-body p-0">
                        <?php while($class = mysqli_fetch_assoc($recent_classes)): ?>
                            <div class="class-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1" style="font-size: 0.9rem;"><?php echo htmlspecialchars($class['title']); ?></h6>
                                        <small class="text-muted">
                                            <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                                            <br>
                                            <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                            at <?php echo date('h:i A', strtotime($class['start_time'])); ?>
                                        </small>
                                    </div>
                                    <span class="badge-status badge-<?php echo $class['status']; ?>">
                                        <?php echo ucfirst($class['status']); ?>
                                    </span>
                                </div>
                            </div>
                        <?php endwhile; ?>
                        <?php if(mysqli_num_rows($recent_classes) == 0): ?>
                            <div class="text-center p-4 text-muted">
                                <i class="fas fa-calendar-alt fa-2x mb-2"></i>
                                <p>No online classes scheduled yet</p>
                                <a href="schedule_online_class.php" class="btn-outline-green">Schedule a Class</a>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-tasks me-2 text-green"></i> Recent Assessments
                        <a href="manage_assessments.php" class="btn-outline-green float-end">View All</a>
                    </div>
                    <div class="card-body p-0">
                        <?php while($assessment = mysqli_fetch_assoc($recent_assessments)): ?>
                            <div class="assessment-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1" style="font-size: 0.9rem;"><?php echo htmlspecialchars($assessment['title']); ?></h6>
                                        <small class="text-muted">
                                            <i class="fas fa-chalkboard"></i> <?php echo $assessment['class_name']; ?>
                                            <br>
                                            <i class="fas fa-star"></i> Total: <?php echo $assessment['total_marks']; ?> marks
                                            <br>
                                            <i class="fas fa-users"></i> Submissions: <?php echo $assessment['submissions']; ?>
                                        </small>
                                    </div>
                                    <span class="badge-status badge-<?php echo $assessment['status']; ?>">
                                        <?php echo ucfirst($assessment['status']); ?>
                                    </span>
                                </div>
                            </div>
                        <?php endwhile; ?>
                        <?php if(mysqli_num_rows($recent_assessments) == 0): ?>
                            <div class="text-center p-4 text-muted">
                                <i class="fas fa-file-alt fa-2x mb-2"></i>
                                <p>No assessments created yet</p>
                                <a href="create_assessment.php" class="btn-outline-green">Create Assessment</a>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Announcements -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-bullhorn me-2 text-green"></i> Recent Announcements
                        <a href="announcements.php" class="btn-outline-green float-end">View All</a>
                    </div>
                    <div class="card-body p-0">
                        <?php while($announcement = mysqli_fetch_assoc($announcements)): ?>
                            <div class="announcement-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1" style="font-size: 0.9rem;">
                                            <?php if($announcement['important']): ?>
                                                <span class="badge bg-danger me-2" style="font-size: 0.7rem;">Important</span>
                                            <?php endif; ?>
                                            <?php echo htmlspecialchars($announcement['title']); ?>
                                        </h6>
                                        <small class="text-muted">
                                            <i class="fas fa-chalkboard"></i> <?php echo $announcement['class_name']; ?>
                                            | <i class="far fa-clock"></i> <?php echo date('M d, Y h:i A', strtotime($announcement['created_at'])); ?>
                                        </small>
                                        <p class="mt-2 mb-0" style="font-size: 0.85rem;"><?php echo substr($announcement['content'], 0, 200); ?>...</p>
                                    </div>
                                    <a href="view_announcement.php?id=<?php echo $announcement['announcement_id']; ?>" class="btn-link-green" style="font-size: 0.8rem;">
                                        Read More <i class="fas fa-arrow-right"></i>
                                    </a>
                                </div>
                            </div>
                        <?php endwhile; ?>
                        <?php if(mysqli_num_rows($announcements) == 0): ?>
                            <div class="text-center p-4 text-muted">
                                <i class="fas fa-bullhorn fa-2x mb-2"></i>
                                <p>No announcements yet</p>
                                <a href="announcements.php" class="btn-outline-green">Create Announcement</a>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="row mt-3">
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="quick-action-card">
                    <div class="quick-action-icon">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="quick-action-title">Schedule Class</div>
                    <a href="schedule_online_class.php" class="btn-outline-green">Schedule Now</a>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="quick-action-card">
                    <div class="quick-action-icon">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <div class="quick-action-title">Create Assessment</div>
                    <a href="create_assessment.php" class="btn-outline-green">Create Now</a>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="quick-action-card">
                    <div class="quick-action-icon">
                        <i class="fas fa-upload"></i>
                    </div>
                    <div class="quick-action-title">Upload Marks</div>
                    <a href="classes.php" class="btn-outline-green">Upload Now</a>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="quick-action-card">
                    <div class="quick-action-icon">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="quick-action-title">Mark Attendance</div>
                    <a href="mark_attendance.php" class="btn-outline-green">Mark Now</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>