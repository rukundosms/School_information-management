<?php
if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

// Get counts for badges
$pending_assessments = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COUNT(*) as cnt 
    FROM assessments a 
    INNER JOIN class c ON a.cid = c.cid 
    WHERE c.cid = '$student_class_id' 
    AND a.status = 'published' 
    AND a.end_date >= CURDATE() 
    AND a.assessment_id NOT IN (
        SELECT assessment_id FROM assessment_submissions WHERE sid = '$sid'
    )
"));

$upcoming_classes = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COUNT(*) as cnt 
    FROM online_classes oc 
    INNER JOIN class c ON oc.cid = c.cid 
    WHERE c.cid = '$student_class_id' 
    AND oc.scheduled_date >= CURDATE() 
    AND oc.status = 'scheduled'
"));

$unread_notifications = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COUNT(*) as cnt 
    FROM notifications 
    WHERE sid = '$sid' AND is_read = 0
"));
?>
<style>
    .sidebar-menu {
        background-color: rgb(8, 58, 8);
        min-height: 100vh;
        color: white;
        position: fixed;
        top: 0;
        left: 0;
        width: 250px;
        z-index: 1000;
    }
    .sidebar-menu a {
        color: white;
        text-decoration: none;
        display: block;
        padding: 12px 20px;
        transition: all 0.3s;
        border-left: 4px solid transparent;
    }
    .sidebar-menu a:hover {
        background-color: rgb(5, 40, 5);
        padding-left: 25px;
        border-left-color: #ffc107;
    }
    .sidebar-menu a.active {
        background-color: rgb(5, 40, 5);
        border-left-color: #ffc107;
    }
    .sidebar-menu a i {
        width: 25px;
        margin-right: 10px;
    }
    .sidebar-menu .user-info {
        padding: 25px 20px;
        text-align: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 20px;
    }
    .sidebar-menu .user-info i {
        font-size: 3rem;
        margin-bottom: 10px;
    }
    .main-content {
        margin-left: 250px;
        padding: 20px;
    }
    @media (max-width: 768px) {
        .sidebar-menu {
            width: 100%;
            position: relative;
            min-height: auto;
        }
        .main-content {
            margin-left: 0;
        }
    }
</style>

<div class="sidebar-menu">
    <div class="user-info">
        <i class="fas fa-user-circle"></i>
        <h5><?php echo htmlspecialchars($_SESSION['student_name']); ?></h5>
        <small><?php echo htmlspecialchars($_SESSION['student_reg'] ?? ''); ?></small>
        <div class="mt-2">
            <span class="badge bg-warning text-dark"><?php echo htmlspecialchars($_SESSION['student_class_name']); ?></span>
        </div>
    </div>
    
    <a href="student_dashboard.php" class="<?php echo basename($_SERVER['PHP_SELF']) == 'student_dashboard.php' ? 'active' : ''; ?>">
        <i class="fas fa-tachometer-alt"></i> Dashboard
    </a>
    <a href="student_online_classes.php" class="<?php echo basename($_SERVER['PHP_SELF']) == 'student_online_classes.php' ? 'active' : ''; ?>">
        <i class="fas fa-video"></i> Online Classes
        <?php if($upcoming_classes['cnt'] > 0): ?>
            <span class="badge bg-warning float-end"><?php echo $upcoming_classes['cnt']; ?></span>
        <?php endif; ?>
    </a>
    <a href="student_assessments.php" class="<?php echo basename($_SERVER['PHP_SELF']) == 'student_assessments.php' ? 'active' : ''; ?>">
        <i class="fas fa-tasks"></i> Assessments
        <?php if($pending_assessments['cnt'] > 0): ?>
            <span class="badge bg-warning float-end"><?php echo $pending_assessments['cnt']; ?></span>
        <?php endif; ?>
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