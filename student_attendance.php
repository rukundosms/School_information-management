<?php
session_start();
include("connection.php");

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$student_class_id = $_SESSION['student_class_id'];

// Get attendance records
$attendance_query = mysqli_query($conn, "
    SELECT a.*, oc.title as class_title, oc.start_time, oc.end_time
    FROM attendance a
    LEFT JOIN online_classes oc ON a.cid = oc.cid AND a.class_date = oc.scheduled_date
    WHERE a.sid = '$sid' AND a.cid = '$student_class_id'
    ORDER BY a.class_date DESC
    LIMIT 30
");

// Get monthly summary
$monthly_summary = mysqli_query($conn, "
    SELECT 
        DATE_FORMAT(class_date, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
    FROM attendance
    WHERE sid = '$sid' AND cid = '$student_class_id'
    GROUP BY DATE_FORMAT(class_date, '%Y-%m')
    ORDER BY month DESC
");

include("student_sidebar.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Attendance - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .attendance-card {
            background: white;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .status-present { color: #28a745; }
        .status-absent { color: #dc3545; }
        .status-late { color: #ffc107; }
        .summary-card {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar already included -->
            
            <!-- Main Content -->
            <div class="col-md-10 main-content">
                <h2 class="mb-4" style="color: rgb(8, 58, 8);">
                    <i class="fas fa-calendar-check"></i> My Attendance
                </h2>
                
                <!-- Monthly Summary -->
                <div class="row mb-4">
                    <?php while($month = mysqli_fetch_assoc($monthly_summary)): 
                        $percentage = $month['total'] > 0 ? round(($month['present'] / $month['total']) * 100) : 0;
                    ?>
                        <div class="col-md-4 mb-3">
                            <div class="summary-card">
                                <h5><?php echo date('F Y', strtotime($month['month'] . '-01')); ?></h5>
                                <div class="row mt-3">
                                    <div class="col-6">
                                        <h3><?php echo $month['present']; ?></h3>
                                        <small>Present</small>
                                    </div>
                                    <div class="col-6">
                                        <h3><?php echo $percentage; ?>%</h3>
                                        <small>Rate</small>
                                    </div>
                                </div>
                                <div class="progress mt-2">
                                    <div class="progress-bar bg-success" style="width: <?php echo $percentage; ?>%"></div>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                </div>
                
                <!-- Attendance Records -->
                <div class="card">
                    <div class="card-header" style="background-color: rgb(8, 58, 8); color: white;">
                        <i class="fas fa-list"></i> Attendance Records
                    </div>
                    <div class="card-body">
                        <?php if(mysqli_num_rows($attendance_query) > 0): ?>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Class Title</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Check In</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php while($record = mysqli_fetch_assoc($attendance_query)): ?>
                                            <tr>
                                                <td><?php echo date('M d, Y', strtotime($record['class_date'])); ?></td>
                                                <td><?php echo htmlspecialchars($record['class_title'] ?? 'Regular Class'); ?></td>
                                                <td><?php echo $record['start_time'] ? date('h:i A', strtotime($record['start_time'])) : 'N/A'; ?></td>
                                                <td>
                                                    <?php if($record['status'] == 'present'): ?>
                                                        <span class="status-present"><i class="fas fa-check-circle"></i> Present</span>
                                                    <?php elseif($record['status'] == 'late'): ?>
                                                        <span class="status-late"><i class="fas fa-clock"></i> Late</span>
                                                    <?php else: ?>
                                                        <span class="status-absent"><i class="fas fa-times-circle"></i> Absent</span>
                                                    <?php endif; ?>
                                                </td>
                                                <td><?php echo $record['check_in_time'] ? date('h:i A', strtotime($record['check_in_time'])) : '-'; ?></td>
                                                <td><?php echo htmlspecialchars($record['remarks'] ?? '-'); ?></td>
                                            </tr>
                                        <?php endwhile; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php else: ?>
                            <div class="text-center p-5">
                                <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                                <h4>No Attendance Records</h4>
                                <p>Your attendance records will appear here once you start attending classes.</p>
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