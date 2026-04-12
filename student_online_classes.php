<?php
session_start();
include("connection.php");

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$student_class_id = $_SESSION['student_class_id'];

// Handle class join request
if (isset($_POST['join_class'])) {
    $class_id = mysqli_real_escape_string($conn, $_POST['class_id']);
    // Add attendance record
    mysqli_query($conn, "
        INSERT INTO attendance (cid, sid, class_date, status, check_in_time) 
        VALUES ('$student_class_id', '$sid', CURDATE(), 'present', CURTIME())
    ");
    
    // Get meeting link
    $meeting = mysqli_fetch_assoc(mysqli_query($conn, "SELECT meeting_link FROM online_classes WHERE class_id = '$class_id'"));
    if ($meeting) {
        header("Location: " . $meeting['meeting_link']);
        exit();
    }
}

// Get all online classes
$classes_query = mysqli_query($conn, "
    SELECT oc.*, t.fname, t.lname,
           (SELECT COUNT(*) FROM attendance WHERE cid = oc.cid AND sid = '$sid' AND class_date = oc.scheduled_date) as attended
    FROM online_classes oc
    INNER JOIN class c ON oc.cid = c.cid
    INNER JOIN teacher t ON oc.tid = t.tid
    WHERE c.cid = '$student_class_id'
    ORDER BY oc.scheduled_date DESC
");

// Get attendance summary
$attendance_summary = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
    FROM attendance 
    WHERE sid = '$sid' AND cid = '$student_class_id'
"));

// Include header
include("student_header.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Classes - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .class-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .class-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
        }
        .status-upcoming { background: #ffc107; color: #000; }
        .status-ongoing { background: #28a745; color: #fff; }
        .status-completed { background: #6c757d; color: #fff; }
        .status-cancelled { background: #dc3545; color: #fff; }
        .btn-join {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 8px 20px;
            border-radius: 5px;
            border: none;
        }
        .btn-join:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .attendance-card {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .attendance-stats {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <?php include("student_sidebar.php"); ?>
            
            <!-- Main Content -->
            <div class="col-md-10 main-content">
                <h2 class="mb-4" style="color: rgb(8, 58, 8);">
                    <i class="fas fa-video"></i> Online Classes
                </h2>
                
                <!-- Attendance Summary -->
                <div class="attendance-card">
                    <h5><i class="fas fa-chart-line"></i> Your Attendance Summary</h5>
                    <div class="row mt-3">
                        <div class="col-md-3">
                            <div class="attendance-stats">
                                <h3><?php echo $attendance_summary['total_classes']; ?></h3>
                                <small>Total Classes</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="attendance-stats">
                                <h3><?php echo $attendance_summary['present_count']; ?></h3>
                                <small>Present</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="attendance-stats">
                                <h3><?php echo $attendance_summary['absent_count']; ?></h3>
                                <small>Absent</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="attendance-stats">
                                <h3><?php 
                                    $percentage = $attendance_summary['total_classes'] > 0 ? 
                                        round(($attendance_summary['present_count'] / $attendance_summary['total_classes']) * 100) : 0;
                                    echo $percentage . '%';
                                ?></h3>
                                <small>Attendance Rate</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Classes List -->
                <div class="card">
                    <div class="card-header" style="background-color: rgb(8, 58, 8); color: white;">
                        <i class="fas fa-list"></i> All Online Classes
                    </div>
                    <div class="card-body">
                        <?php if(mysqli_num_rows($classes_query) > 0): ?>
                            <?php while($class = mysqli_fetch_assoc($classes_query)): 
                                $class_date = $class['scheduled_date'];
                                $current_date = date('Y-m-d');
                                $start_time = $class['start_time'];
                                $current_time = date('H:i:s');
                                
                                // Determine class status
                                if ($class['status'] == 'cancelled') {
                                    $status = 'cancelled';
                                    $status_text = 'Cancelled';
                                } elseif ($class_date > $current_date) {
                                    $status = 'upcoming';
                                    $status_text = 'Upcoming';
                                } elseif ($class_date == $current_date && $start_time <= $current_time) {
                                    $status = 'ongoing';
                                    $status_text = 'Ongoing';
                                } else {
                                    $status = 'completed';
                                    $status_text = 'Completed';
                                }
                            ?>
                                <div class="class-card">
                                    <div class="row align-items-center">
                                        <div class="col-md-7">
                                            <h5><?php echo htmlspecialchars($class['title']); ?></h5>
                                            <p class="text-muted mb-2"><?php echo htmlspecialchars($class['description']); ?></p>
                                            <small class="text-muted">
                                                <i class="fas fa-user"></i> Teacher: <?php echo htmlspecialchars($class['fname'] . ' ' . $class['lname']); ?><br>
                                                <i class="fas fa-calendar-alt"></i> Date: <?php echo date('F d, Y', strtotime($class['scheduled_date'])); ?><br>
                                                <i class="fas fa-clock"></i> Time: <?php echo date('h:i A', strtotime($class['start_time'])); ?> - <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                                                <?php if($class['duration_minutes']): ?>
                                                    (<?php echo $class['duration_minutes']; ?> minutes)
                                                <?php endif; ?>
                                            </small>
                                        </div>
                                        <div class="col-md-3 text-center">
                                            <span class="status-badge status-<?php echo $status; ?>">
                                                <?php echo $status_text; ?>
                                            </span>
                                            <?php if($class['attended'] > 0): ?>
                                                <div class="mt-2">
                                                    <span class="badge bg-success">Attended</span>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        <div class="col-md-2 text-end">
                                            <?php if($status == 'ongoing'): ?>
                                                <form method="POST" class="d-inline">
                                                    <input type="hidden" name="class_id" value="<?php echo $class['class_id']; ?>">
                                                    <button type="submit" name="join_class" class="btn-join">
                                                        <i class="fas fa-video"></i> Join Now
                                                    </button>
                                                </form>
                                            <?php elseif($class['meeting_link'] && $status == 'completed'): ?>
                                                <a href="<?php echo $class['meeting_link']; ?>" target="_blank" class="btn btn-outline-secondary">
                                                    <i class="fas fa-play-circle"></i> Recording
                                                </a>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <div class="text-center p-5">
                                <i class="fas fa-video-slash fa-3x text-muted mb-3"></i>
                                <h4>No Online Classes Available</h4>
                                <p>Check back later for scheduled online classes.</p>
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