<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = $_SESSION['tcode'];
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get classes
$classes_query = mysqli_query($conn, "SELECT * FROM class WHERE tid='$tid'");

$selected_class = isset($_GET['class']) ? $_GET['class'] : 0;
$selected_month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');

if ($selected_class) {
    $class_info = mysqli_fetch_assoc(mysqli_query($conn, "SELECT class_name FROM class WHERE cid='$selected_class'"));
    $class_name = $class_info['class_name'];
    
    // Get attendance summary
    $attendance_summary = mysqli_query($conn, "
        SELECT 
            s.sid,
            s.firstname,
            s.lastname,
            s.reg,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
            COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
            COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_days,
            COUNT(a.attendance_id) as total_days
        FROM student s
        LEFT JOIN attendance a ON s.sid = a.sid AND a.cid = '$selected_class' 
            AND DATE_FORMAT(a.class_date, '%Y-%m') = '$selected_month'
        WHERE s.class = '$class_name'
        GROUP BY s.sid
        ORDER BY s.firstname
    ");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .report-table th {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .attendance-percent {
            font-weight: bold;
        }
        .high-attendance {
            color: rgb(8, 58, 8);
        }
        .low-attendance {
            color: #c62828;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-file-alt"></i> Attendance Report
        </h2>
        
        <div class="card mb-4">
            <div class="card-body">
                <form method="GET" class="row g-3">
                    <div class="col-md-5">
                        <label>Select Class</label>
                        <select name="class" class="form-control" required>
                            <option value="">Select Class</option>
                            <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
                                <option value="<?php echo $class['cid']; ?>" <?php echo $selected_class == $class['cid'] ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($class['class_name']); ?>
                                </option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="col-md-5">
                        <label>Select Month</label>
                        <input type="month" name="month" class="form-control" value="<?php echo $selected_month; ?>" required>
                    </div>
                    <div class="col-md-2">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn btn-green form-control">
                            <i class="fas fa-chart-line"></i> Generate Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <?php if($selected_class && isset($attendance_summary)): ?>
            <div class="card">
                <div class="card-header">
                    <h5>Attendance Report - <?php echo date('F Y', strtotime($selected_month . '-01')); ?></h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-bordered mb-0">
                        <thead class="report-table">
                            <tr>
                                <th>#</th>
                                <th>Student Name</th>
                                <th>Reg Number</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Late</th>
                                <th>Excused</th>
                                <th>Total Days</th>
                                <th>Attendance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $count = 1; while($student = mysqli_fetch_assoc($attendance_summary)): 
                                $percentage = $student['total_days'] > 0 ? 
                                    ($student['present_days'] / $student['total_days']) * 100 : 0;
                                $percent_class = $percentage >= 75 ? 'high-attendance' : 'low-attendance';
                            ?>
                                <tr>
                                    <td><?php echo $count++; ?></td>
                                    <td><?php echo htmlspecialchars($student['firstname']." ".$student['lastname']); ?></td>
                                    <td><?php echo $student['reg']; ?></td>
                                    <td><?php echo $student['present_days']; ?></td>
                                    <td><?php echo $student['absent_days']; ?></td>
                                    <td><?php echo $student['late_days']; ?></td>
                                    <td><?php echo $student['excused_days']; ?></td>
                                    <td><?php echo $student['total_days']; ?></td>
                                    <td class="attendance-percent <?php echo $percent_class; ?>">
                                        <?php echo number_format($percentage, 1); ?>%
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>