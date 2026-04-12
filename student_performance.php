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
    
    // Get students with their performance
    $students_query = mysqli_query($conn, "
        SELECT s.*,
               (SELECT AVG(obtained_marks) FROM assessment_submissions sub 
                JOIN assessments a ON sub.assessment_id = a.assessment_id 
                WHERE sub.sid = s.sid AND a.cid = '$selected_class') as avg_marks,
               (SELECT COUNT(*) FROM assessment_submissions sub 
                JOIN assessments a ON sub.assessment_id = a.assessment_id 
                WHERE sub.sid = s.sid AND a.cid = '$selected_class') as total_assessments,
               (SELECT COUNT(CASE WHEN status = 'present' THEN 1 END) FROM attendance 
                WHERE sid = s.sid AND cid = '$selected_class') as present_days,
               (SELECT COUNT(*) FROM attendance 
                WHERE sid = s.sid AND cid = '$selected_class') as total_days
        FROM student s
        WHERE s.class = '$class_name'
        ORDER BY s.firstname
    ");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Performance</title>
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
        .performance-table th {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .student-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .grade-A { color: #2e7d32; font-weight: bold; }
        .grade-B { color: #f57c00; font-weight: bold; }
        .grade-C { color: #c62828; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-chart-line"></i> Student Performance
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
                            <i class="fas fa-search"></i> View
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <?php if($selected_class): ?>
            <div class="card">
                <div class="card-header">
                    <h5>Student Performance Report</h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-bordered mb-0">
                        <thead class="performance-table">
                            <tr>
                                <th>#</th>
                                <th>Student Name</th>
                                <th>Reg Number</th>
                                <th>Avg Score</th>
                                <th>Grade</th>
                                <th>Assessments</th>
                                <th>Attendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $count = 1;
                            while($student = mysqli_fetch_assoc($students_query)): 
                                $avg = $student['avg_marks'] ?: 0;
                                $grade = '';
                                $grade_class = '';
                                
                                if ($avg >= 80) {
                                    $grade = 'A';
                                    $grade_class = 'grade-A';
                                } elseif ($avg >= 70) {
                                    $grade = 'B';
                                    $grade_class = 'grade-B';
                                } elseif ($avg >= 50) {
                                    $grade = 'C';
                                    $grade_class = 'grade-C';
                                } else {
                                    $grade = 'D';
                                    $grade_class = 'grade-C';
                                }
                                
                                $attendance_percent = $student['total_days'] > 0 ? 
                                    round(($student['present_days'] / $student['total_days']) * 100, 1) : 0;
                            ?>
                                <tr>
                                    <td><?php echo $count++; ?></td>
                                    <td><?php echo htmlspecialchars($student['firstname']." ".$student['lastname']); ?></td>
                                    <td><?php echo $student['reg']; ?></td>
                                    <td><?php echo round($avg, 2); ?>%</td>
                                    <td class="<?php echo $grade_class; ?>"><?php echo $grade; ?></td>
                                    <td><?php echo $student['total_assessments']; ?></td>
                                    <td><?php echo $attendance_percent; ?>%</td>
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