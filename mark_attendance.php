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
$selected_date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

// Get students for selected class
$students = [];
if ($selected_class) {
    $class_info = mysqli_fetch_assoc(mysqli_query($conn, "SELECT class_name FROM class WHERE cid='$selected_class'"));
    $class_name = $class_info['class_name'];
    
    $students_query = mysqli_query($conn, "
        SELECT * FROM student 
        WHERE class='$class_name' 
        ORDER BY firstname
    ");
    
    while($student = mysqli_fetch_assoc($students_query)) {
        // Check if attendance already marked
        $attendance_check = mysqli_query($conn, "
            SELECT * FROM attendance 
            WHERE sid='{$student['sid']}' AND cid='$selected_class' AND class_date='$selected_date'
        ");
        $attendance = mysqli_fetch_assoc($attendance_check);
        
        $student['attendance_status'] = $attendance ? $attendance['status'] : '';
        $students[] = $student;
    }
}

// Handle attendance submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['save_attendance'])) {
    $class_id = $_POST['class_id'];
    $date = $_POST['date'];
    
    foreach ($_POST['attendance'] as $sid => $status) {
        // Check if record exists
        $check = mysqli_query($conn, "
            SELECT * FROM attendance 
            WHERE sid='$sid' AND cid='$class_id' AND class_date='$date'
        ");
        
        if (mysqli_num_rows($check) > 0) {
            // Update existing
            mysqli_query($conn, "
                UPDATE attendance 
                SET status='$status', marked_by='$tid' 
                WHERE sid='$sid' AND cid='$class_id' AND class_date='$date'
            ");
        } else {
            // Insert new
            mysqli_query($conn, "
                INSERT INTO attendance (cid, sid, class_date, status, marked_by) 
                VALUES ('$class_id', '$sid', '$date', '$status', '$tid')
            ");
        }
    }
    
    $success = "Attendance saved successfully!";
    header("location:mark_attendance.php?class=$class_id&date=$date");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mark Attendance</title>
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
        .attendance-table th {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .present-badge {
            background-color: #e8f5e9;
            color: rgb(8, 58, 8);
            padding: 5px 10px;
            border-radius: 5px;
        }
        .absent-badge {
            background-color: #ffebee;
            color: #c62828;
            padding: 5px 10px;
            border-radius: 5px;
        }
        .late-badge {
            background-color: #fff3e0;
            color: #f57c00;
            padding: 5px 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-user-check"></i> Mark Attendance
        </h2>
        
        <?php if(isset($success)): ?>
            <div class="alert alert-success"><?php echo $success; ?></div>
        <?php endif; ?>
        
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
                        <label>Select Date</label>
                        <input type="date" name="date" class="form-control" value="<?php echo $selected_date; ?>" required>
                    </div>
                    <div class="col-md-2">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn btn-green form-control">
                            <i class="fas fa-search"></i> Load Students
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <?php if($selected_class && !empty($students)): ?>
            <form method="POST">
                <input type="hidden" name="class_id" value="<?php echo $selected_class; ?>">
                <input type="hidden" name="date" value="<?php echo $selected_date; ?>">
                
                <div class="card">
                    <div class="card-header">
                        <h5>Attendance for <?php echo date('F d, Y', strtotime($selected_date)); ?></h5>
                    </div>
                    <div class="card-body p-0">
                        <table class="table table-bordered mb-0">
                            <thead class="attendance-table">
                                <tr>
                                    <th>#</th>
                                    <th>Student Name</th>
                                    <th>Reg Number</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $count = 1; foreach($students as $student): ?>
                                    <tr>
                                        <td><?php echo $count++; ?></td>
                                        <td><?php echo htmlspecialchars($student['firstname']." ".$student['lastname']); ?></td>
                                        <td><?php echo $student['reg']; ?></td>
                                        <td>
                                            <select name="attendance[<?php echo $student['sid']; ?>]" class="form-control" required>
                                                <option value="present" <?php echo $student['attendance_status'] == 'present' ? 'selected' : ''; ?>>Present</option>
                                                <option value="absent" <?php echo $student['attendance_status'] == 'absent' ? 'selected' : ''; ?>>Absent</option>
                                                <option value="late" <?php echo $student['attendance_status'] == 'late' ? 'selected' : ''; ?>>Late</option>
                                                <option value="excused" <?php echo $student['attendance_status'] == 'excused' ? 'selected' : ''; ?>>Excused</option>
                                            </select>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <div class="card-footer">
                        <button type="submit" name="save_attendance" class="btn btn-green">
                            <i class="fas fa-save"></i> Save Attendance
                        </button>
                    </div>
                </div>
            </form>
        <?php elseif($selected_class && empty($students)): ?>
            <div class="alert alert-warning">No students found in this class.</div>
        <?php endif; ?>
    </div>
</body>
</html>