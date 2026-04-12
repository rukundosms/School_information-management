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

if ($selected_class) {
    $class_info = mysqli_fetch_assoc(mysqli_query($conn, "SELECT class_name FROM class WHERE cid='$selected_class'"));
    $class_name = $class_info['class_name'];
    
    // Get class statistics
    $student_count = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as total FROM student WHERE class='$class_name'"));
    
    // Get assessment performance
    $assessments = mysqli_query($conn, "
        SELECT a.*, 
               AVG(sub.obtained_marks) as avg_marks,
               COUNT(DISTINCT sub.submission_id) as submissions
        FROM assessments a
        LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
        WHERE a.cid='$selected_class'
        GROUP BY a.assessment_id
    ");
    
    // Get attendance statistics
    $attendance_stats = mysqli_query($conn, "
        SELECT 
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
            COUNT(*) as total
        FROM attendance a
        JOIN student s ON a.sid = s.sid
        WHERE a.cid='$selected_class'
    ");
    $attendance = mysqli_fetch_assoc($attendance_stats);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Class Reports</title>
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
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: rgb(8, 58, 8);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-chart-pie"></i> Class Reports
        </h2>
        
        <div class="card mb-4">
            <div class="card-body">
                <form method="GET" class="row">
                    <div class="col-md-6">
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
                    <div class="col-md-2">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn btn-green form-control">
                            <i class="fas fa-chart-line"></i> Generate
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <?php if($selected_class): ?>
            <!-- Statistics -->
            <div class="row">
                <div class="col-md-4">
                    <div class="stat-card">
                        <i class="fas fa-users fa-2x text-muted mb-2"></i>
                        <div class="stat-number"><?php echo $student_count['total']; ?></div>
                        <div>Total Students</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <i class="fas fa-tasks fa-2x text-muted mb-2"></i>
                        <div class="stat-number"><?php echo mysqli_num_rows($assessments); ?></div>
                        <div>Assessments</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card">
                        <i class="fas fa-calendar-check fa-2x text-muted mb-2"></i>
                        <div class="stat-number">
                            <?php 
                            if ($attendance['total'] > 0) {
                                echo round(($attendance['present'] / $attendance['total']) * 100, 1) . '%';
                            } else {
                                echo '0%';
                            }
                            ?>
                        </div>
                        <div>Attendance Rate</div>
                    </div>
                </div>
            </div>
            
            <!-- Assessment Performance -->
            <div class="card mt-4">
                <div class="card-header">
                    <h5>Assessment Performance</h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-bordered mb-0">
                        <thead>
                            <tr style="background-color: rgb(8, 58, 8); color: white;">
                                <th>Assessment</th>
                                <th>Type</th>
                                <th>Total Marks</th>
                                <th>Average Score</th>
                                <th>Submissions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while($assessment = mysqli_fetch_assoc($assessments)): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($assessment['title']); ?></td>
                                    <td><?php echo ucfirst($assessment['assessment_type']); ?></td>
                                    <td><?php echo $assessment['total_marks']; ?></td>
                                    <td>
                                        <?php 
                                        if ($assessment['submissions'] > 0) {
                                            echo round($assessment['avg_marks'], 2) . ' / ' . $assessment['total_marks'];
                                        } else {
                                            echo 'No submissions';
                                        }
                                        ?>
                                    </td>
                                    <td><?php echo $assessment['submissions']; ?></td>
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