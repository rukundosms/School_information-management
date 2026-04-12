<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get assessment ID from URL
$assessment_id = isset($_GET['id']) ? mysqli_real_escape_string($conn, $_GET['id']) : 0;

if ($assessment_id == 0) {
    header("location:teacher_assessments.php");
    exit();
}

// Verify assessment belongs to this teacher
$assessment_check = mysqli_query($conn, "
    SELECT a.*, c.class_name, 
           (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions,
           (SELECT SUM(marks) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_question_marks
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    INNER JOIN permision p ON c.cid = p.cid
    WHERE a.assessment_id = '$assessment_id' AND p.tid = '$tid'
");

if (mysqli_num_rows($assessment_check) == 0) {
    header("location:teacher_assessments.php");
    exit();
}

$assessment = mysqli_fetch_assoc($assessment_check);

// Check if assessment already published
if ($assessment['status'] == 'published') {
    $_SESSION['error'] = "This assessment is already published!";
    header("location:teacher_assessments.php");
    exit();
}

// Check if assessment has questions
if ($assessment['total_questions'] == 0) {
    $_SESSION['error'] = "Cannot publish assessment without questions. Please add questions first.";
    header("location:add_questions.php?id=$assessment_id");
    exit();
}

// Check if total marks match
if ($assessment['total_question_marks'] != $assessment['total_marks']) {
    $_SESSION['warning'] = "Total marks from questions (" . $assessment['total_question_marks'] . 
                           ") do not match assessment total marks (" . $assessment['total_marks'] . 
                           "). Please adjust marks before publishing.";
    header("location:add_questions.php?id=$assessment_id");
    exit();
}

// Handle publish confirmation
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['confirm_publish'])) {
    $publish_date = date('Y-m-d H:i:s');
    
    $update = mysqli_query($conn, "
        UPDATE assessments 
        SET status = 'published', 
            published_at = '$publish_date'
        WHERE assessment_id = '$assessment_id'
    ");
    
    if ($update) {
        // Get all students in the class
        $students_query = mysqli_query($conn, "
            SELECT s.sid, s.firstname, s.lastname 
            FROM student s
            INNER JOIN class c ON s.class = c.cid
            WHERE c.cid = '{$assessment['cid']}' AND s.status = 'active'
        ");
        
        // Send notifications to all students in the class
        while ($student = mysqli_fetch_assoc($students_query)) {
            mysqli_query($conn, "
                INSERT INTO notifications (sid, title, message, link, created_at) 
                VALUES ('{$student['sid']}', 
                        'New Assessment Published', 
                        'A new assessment \"{$assessment['title']}\" has been published for your class. Due date: " . 
                        date('M d, Y', strtotime($assessment['end_date'])) . "', 
                        'take_assessment.php?id=$assessment_id', 
                        NOW())
            ");
        }
        
        $_SESSION['success'] = "Assessment published successfully! Students can now take the assessment.";
        header("location:teacher_assessments.php");
        exit();
    } else {
        $error = "Failed to publish assessment: " . mysqli_error($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Publish Assessment - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .publish-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            overflow: hidden;
        }
        .card-header {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 15px 20px;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 10px 20px;
            border: none;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .warning-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 15px 0;
        }
        .info-box {
            background-color: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 15px 0;
        }
        .success-box {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .detail-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
        .detail-label {
            font-weight: bold;
            color: rgb(8, 58, 8);
            width: 150px;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container publish-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 style="color: rgb(8, 58, 8);">
                <i class="fas fa-cloud-upload-alt"></i> Publish Assessment
            </h2>
            <a href="add_questions.php?id=<?php echo $assessment_id; ?>" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left"></i> Back to Questions
            </a>
        </div>
        
        <?php if(isset($error)): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-circle"></i> <?php echo $error; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <!-- Assessment Details -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-info-circle"></i> Assessment Details</h5>
            </div>
            <div class="card-body">
                <div class="detail-item">
                    <span class="detail-label">Title:</span>
                    <?php echo htmlspecialchars($assessment['title']); ?>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Class:</span>
                    <?php echo htmlspecialchars($assessment['class_name']); ?>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <?php echo ucfirst($assessment['assessment_type']); ?>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Marks:</span>
                    <?php echo $assessment['total_marks']; ?> marks
                </div>
                <div class="detail-item">
                    <span class="detail-label">Questions:</span>
                    <?php echo $assessment['total_questions']; ?> questions
                </div>
                <div class="detail-item">
                    <span class="detail-label">Question Total:</span>
                    <?php echo $assessment['total_question_marks']; ?> marks
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration:</span>
                    <?php echo $assessment['duration_minutes']; ?> minutes
                </div>
                <div class="detail-item">
                    <span class="detail-label">Start Date:</span>
                    <?php echo date('F d, Y H:i', strtotime($assessment['start_date'] . ' ' . $assessment['start_time'])); ?>
                </div>
                <div class="detail-item">
                    <span class="detail-label">End Date:</span>
                    <?php echo date('F d, Y H:i', strtotime($assessment['end_date'] . ' ' . $assessment['end_time'])); ?>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Passing Marks:</span>
                    <?php echo $assessment['passing_marks']; ?> marks
                </div>
            </div>
        </div>
        
        <!-- Validation Checks -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-check-circle"></i> Validation Checks</h5>
            </div>
            <div class="card-body">
                <?php if($assessment['total_questions'] > 0): ?>
                    <div class="success-box">
                        <i class="fas fa-check-circle"></i> 
                        <strong>✓ Questions Added:</strong> <?php echo $assessment['total_questions']; ?> questions have been added.
                    </div>
                <?php else: ?>
                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <strong>⚠ No Questions:</strong> Please add questions before publishing.
                    </div>
                <?php endif; ?>
                
                <?php if($assessment['total_question_marks'] == $assessment['total_marks']): ?>
                    <div class="success-box">
                        <i class="fas fa-check-circle"></i> 
                        <strong>✓ Marks Match:</strong> Total marks (<?php echo $assessment['total_question_marks']; ?>) match assessment total.
                    </div>
                <?php else: ?>
                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <strong>⚠ Marks Mismatch:</strong> Question total (<?php echo $assessment['total_question_marks']; ?>) 
                        does not match assessment total (<?php echo $assessment['total_marks']; ?>).
                    </div>
                <?php endif; ?>
                
                <?php 
                $current_date = date('Y-m-d');
                $start_date = $assessment['start_date'];
                if($start_date >= $current_date): 
                ?>
                    <div class="success-box">
                        <i class="fas fa-check-circle"></i> 
                        <strong>✓ Start Date Valid:</strong> Assessment starts on <?php echo date('F d, Y', strtotime($start_date)); ?>.
                    </div>
                <?php else: ?>
                    <div class="warning-box">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <strong>⚠ Past Start Date:</strong> Start date is in the past. Consider updating the date.
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Publish Confirmation -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-question-circle"></i> Confirm Publication</h5>
            </div>
            <div class="card-body">
                <div class="info-box">
                    <i class="fas fa-info-circle"></i> 
                    <strong>What happens when you publish?</strong>
                    <ul class="mt-2 mb-0">
                        <li>Students will be able to view and take the assessment</li>
                        <li>All students in <?php echo htmlspecialchars($assessment['class_name']); ?> will receive a notification</li>
                        <li>The assessment will be available from the scheduled start date/time</li>
                        <li>You cannot edit the assessment after publishing</li>
                    </ul>
                </div>
                
                <div class="warning-box">
                    <i class="fas fa-exclamation-triangle"></i> 
                    <strong>Important:</strong> Once published, you cannot edit the assessment questions or marks. 
                    Only student submissions can be graded.
                </div>
                
                <form method="POST" onsubmit="return confirmPublish()">
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="confirm_check" required>
                        <label class="form-check-label" for="confirm_check">
                            I confirm that I have reviewed all questions, marks, and dates, and I am ready to publish this assessment.
                        </label>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button type="submit" name="confirm_publish" class="btn btn-green">
                            <i class="fas fa-cloud-upload-alt"></i> Publish Assessment
                        </button>
                        <a href="add_questions.php?id=<?php echo $assessment_id; ?>" class="btn btn-outline-secondary">
                            <i class="fas fa-edit"></i> Edit Questions
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        function confirmPublish() {
            if (!document.getElementById('confirm_check').checked) {
                alert('Please confirm that you have reviewed all details before publishing.');
                return false;
            }
            return confirm('Are you absolutely sure you want to publish this assessment?\n\nOnce published, you cannot edit the questions or marks.');
        }
    </script>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>