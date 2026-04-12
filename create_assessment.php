<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");

if (!$teacher_query || mysqli_num_rows($teacher_query) == 0) {
    header("location:sign.php");
    exit();
}

$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get classes for dropdown - using cid
$classes_query = mysqli_query($conn, "
    SELECT DISTINCT c.cid, c.class_name, c.class_code 
    FROM permision p
    INNER JOIN class c ON p.cid = c.cid
    WHERE p.tid = '$tid'
    ORDER BY c.class_name
");

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $cid = mysqli_real_escape_string($conn, $_POST['cid']);
    $title = mysqli_real_escape_string($conn, $_POST['title']);
    $description = mysqli_real_escape_string($conn, $_POST['description']);
    $assessment_type = mysqli_real_escape_string($conn, $_POST['assessment_type']);
    $total_marks = mysqli_real_escape_string($conn, $_POST['total_marks']);
    $passing_marks = mysqli_real_escape_string($conn, $_POST['passing_marks']);
    $duration = !empty($_POST['duration']) ? mysqli_real_escape_string($conn, $_POST['duration']) : 'NULL';
    $start_date = mysqli_real_escape_string($conn, $_POST['start_date']);
    $start_time = mysqli_real_escape_string($conn, $_POST['start_time']);
    $end_date = mysqli_real_escape_string($conn, $_POST['end_date']);
    $end_time = mysqli_real_escape_string($conn, $_POST['end_time']);
    $instructions = mysqli_real_escape_string($conn, $_POST['instructions']);
    $allow_late = isset($_POST['allow_late']) ? 1 : 0;
    $show_results = isset($_POST['show_results']) ? 1 : 0;
    
    $start_datetime = strtotime($start_date . ' ' . $start_time);
    $end_datetime = strtotime($end_date . ' ' . $end_time);
    
    if ($end_datetime <= $start_datetime) {
        $error = "End date and time must be after start date and time.";
    } else {
        $duration_sql = ($duration != 'NULL') ? "'$duration'" : "NULL";
        
        $insert = mysqli_query($conn, "
            INSERT INTO assessments (cid, tid, title, description, assessment_type, total_marks, 
            passing_marks, duration_minutes, start_date, start_time, end_date, end_time, 
            instructions, status, allow_late_submission, show_results_immediately) 
            VALUES ('$cid', '$tid', '$title', '$description', '$assessment_type', '$total_marks', 
            '$passing_marks', $duration_sql, '$start_date', '$start_time', '$end_date', '$end_time', 
            '$instructions', 'draft', '$allow_late', '$show_results')
        ");
        
        if ($insert) {
            $assessment_id = mysqli_insert_id($conn);
            $_SESSION['assessment_created'] = "Assessment created successfully! Now add questions.";
            header("location:add_questions.php?id=$assessment_id");
            exit();
        } else {
            $error = "Failed to create assessment: " . mysqli_error($conn);
        }
    }
}

$has_classes = mysqli_num_rows($classes_query);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Assessment</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .form-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .form-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            margin-bottom: 25px;
        }
        .card-header {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            padding: 25px 30px;
        }
        .card-header h2 {
            margin: 0;
            font-size: 1.8rem;
        }
        .card-body {
            padding: 30px;
        }
        .form-group {
            margin-bottom: 25px;
        }
        .form-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            display: block;
        }
        .required-field::after {
            content: " *";
            color: #dc3545;
        }
        .form-control, .form-select {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px 15px;
        }
        .btn-create {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            padding: 14px 30px;
            font-size: 1.1rem;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            width: 100%;
        }
        .btn-create:hover {
            transform: translateY(-2px);
            color: white;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.4s;
            border-radius: 24px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: rgb(8, 58, 8);
        }
        input:checked + .slider:before {
            transform: translateX(26px);
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="form-card">
            <div class="card-header">
                <h2><i class="fas fa-plus-circle"></i> Create New Assessment</h2>
                <p>Design your assessment with questions, set rules, and publish</p>
            </div>
            <div class="card-body">
                <?php if(isset($error)): ?>
                    <div class="alert alert-danger"><?php echo $error; ?></div>
                <?php endif; ?>
                
                <?php if($has_classes == 0): ?>
                    <div class="alert alert-warning">No classes assigned. Contact administrator.</div>
                <?php endif; ?>
                
                <form method="POST">
                    <div class="form-group">
                        <label class="form-label required-field"><i class="fas fa-chalkboard"></i> Select Class</label>
                        <select name="cid" class="form-select" required <?php echo ($has_classes == 0) ? 'disabled' : ''; ?>>
                            <option value="">-- Select Class --</option>
                            <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
                                <option value="<?php echo $class['cid']; ?>">
                                    <?php echo htmlspecialchars($class['class_name']); ?> (ID: <?php echo $class['cid']; ?>)
                                </option>
                            <?php endwhile; ?>
                        </select>
                        <small class="text-muted">Select the class that will take this assessment</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label required-field"><i class="fas fa-heading"></i> Assessment Title</label>
                        <input type="text" name="title" class="form-control" required placeholder="e.g., Mid-Term Examination 2024">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-align-left"></i> Description</label>
                        <textarea name="description" class="form-control" rows="3" placeholder="Describe what this assessment covers..."></textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-tag"></i> Assessment Type</label>
                                <select name="assessment_type" class="form-select" required>
                                    <option value="quiz">📝 Quiz</option>
                                    <option value="assignment">📚 Assignment</option>
                                    <option value="exam">📖 Exam</option>
                                    <option value="project">🎯 Project</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label"><i class="fas fa-clock"></i> Duration (minutes)</label>
                                <input type="number" name="duration" class="form-control" placeholder="Optional">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-star"></i> Total Marks</label>
                                <input type="number" name="total_marks" class="form-control" required min="1" id="totalMarks">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-check-circle"></i> Passing Marks</label>
                                <input type="number" name="passing_marks" class="form-control" required min="0" id="passingMarks">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-calendar"></i> Start Date</label>
                                <input type="date" name="start_date" class="form-control" required id="startDate">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-clock"></i> Start Time</label>
                                <input type="time" name="start_time" class="form-control" required id="startTime">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-calendar-check"></i> End Date</label>
                                <input type="date" name="end_date" class="form-control" required id="endDate">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label required-field"><i class="fas fa-clock"></i> End Time</label>
                                <input type="time" name="end_time" class="form-control" required id="endTime">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Allow Late Submission</label>
                                <div>
                                    <label class="switch">
                                        <input type="checkbox" name="allow_late" value="1">
                                        <span class="slider"></span>
                                    </label>
                                    <span class="ms-2">Yes, allow late submissions</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label class="form-label">Show Results Immediately</label>
                                <div>
                                    <label class="switch">
                                        <input type="checkbox" name="show_results" value="1" checked>
                                        <span class="slider"></span>
                                    </label>
                                    <span class="ms-2">Show scores after submission</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-info-circle"></i> Instructions</label>
                        <textarea name="instructions" class="form-control" rows="4" 
                                  placeholder="Provide instructions for students..."></textarea>
                    </div>
                    
                    <button type="submit" class="btn-create" <?php echo ($has_classes == 0) ? 'disabled' : ''; ?>>
                        <i class="fas fa-arrow-right"></i> Continue to Add Questions
                    </button>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        document.getElementById('startDate').value = today.toISOString().split('T')[0];
        document.getElementById('endDate').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('startTime').value = '09:00';
        document.getElementById('endTime').value = '17:00';
        
        function validatePassingMarks() {
            const total = parseInt(document.getElementById('totalMarks').value) || 0;
            const passing = parseInt(document.getElementById('passingMarks').value) || 0;
            if (passing > total) {
                alert('Passing marks cannot exceed total marks');
                document.getElementById('passingMarks').value = total;
            }
        }
        
        document.getElementById('totalMarks').addEventListener('change', validatePassingMarks);
        document.getElementById('passingMarks').addEventListener('change', validatePassingMarks);
    </script>
</body>
</html>