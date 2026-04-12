<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$attempt_id = isset($_GET['attempt_id']) ? intval($_GET['attempt_id']) : 0;
$assessment_id = isset($_GET['aid']) ? intval($_GET['aid']) : 0;
$print = isset($_GET['print']) ? $_GET['print'] : false;
$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);

// Get attempt and student info
$attempt_query = mysqli_query($conn, "
    SELECT att.*, s.firstname, s.lastname, s.reg, s.class
    FROM assessment_attempts att
    INNER JOIN student s ON att.sid = s.sid
    WHERE att.attempt_id = '$attempt_id'
");
$attempt = mysqli_fetch_assoc($attempt_query);

if (!$attempt) {
    header("location:view_submissions.php?aid=$assessment_id");
    exit();
}

// Get assessment info
$assessment_query = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE a.assessment_id = '$assessment_id'
");
$assessment = mysqli_fetch_assoc($assessment_query);

// Get all questions
$questions_query = mysqli_query($conn, "
    SELECT * FROM assessment_questions 
    WHERE assessment_id = '$assessment_id' 
    ORDER BY display_order ASC, question_id ASC
");
$questions = [];
while($q = mysqli_fetch_assoc($questions_query)) {
    $questions[$q['question_id']] = $q;
}

// Get responses
$responses_query = mysqli_query($conn, "
    SELECT * FROM assessment_responses 
    WHERE attempt_id = '$attempt_id'
");
$responses = [];
$total_auto_score = 0;
while($r = mysqli_fetch_assoc($responses_query)) {
    $responses[$r['question_id']] = $r;
    $total_auto_score += $r['marks_awarded'];
}

// Calculate percentage and grade
$percentage = ($total_auto_score / $assessment['total_marks']) * 100;
$grade = $percentage >= 80 ? 'A' : ($percentage >= 70 ? 'B' : ($percentage >= 60 ? 'C' : ($percentage >= 50 ? 'D' : 'F')));

// Handle grade submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['save_grades'])) {
    $total_obtained = 0;
    
    foreach($questions as $qid => $question) {
        $obtained = isset($_POST['marks_' . $qid]) ? floatval($_POST['marks_' . $qid]) : 0;
        $total_obtained += $obtained;
        
        mysqli_query($conn, "
            INSERT INTO assessment_responses (attempt_id, question_id, answer, marks_awarded, is_correct)
            VALUES ('$attempt_id', '$qid', 
                    '{$responses[$qid]['answer']}', 
                    '$obtained', 
                    " . ($obtained >= $question['marks'] * 0.5 ? '1' : '0') . ")
            ON DUPLICATE KEY UPDATE 
            marks_awarded = '$obtained',
            is_correct = " . ($obtained >= $question['marks'] * 0.5 ? '1' : '0')
        );
    }
    
    mysqli_query($conn, "
        UPDATE assessment_attempts 
        SET status = 'submitted', submitted_at = NOW()
        WHERE attempt_id = '$attempt_id'
    ");
    
    $new_percentage = ($total_obtained / $assessment['total_marks']) * 100;
    $new_grade = $new_percentage >= 80 ? 'A' : ($new_percentage >= 70 ? 'B' : ($new_percentage >= 60 ? 'C' : ($new_percentage >= 50 ? 'D' : 'F')));
    
    mysqli_query($conn, "
        INSERT INTO notifications (sid, title, message, link, created_at) 
        VALUES ('{$attempt['sid']}', 'Assessment Graded: {$assessment['title']}', 
        'Your submission has been graded. Score: $total_obtained/{$assessment['total_marks']} (" . round($new_percentage, 1) . "%) - Grade: $new_grade', 
        'student_results.php?attempt_id=$attempt_id', NOW())
    ");
    
    $_SESSION['success'] = "Grades saved successfully! Student has been notified.";
    header("location:view_submissions.php?aid=$assessment_id");
    exit();
}

// Handle approve/reject
if (isset($_POST['approve_submission'])) {
    mysqli_query($conn, "
        UPDATE assessment_attempts 
        SET status = 'approved'
        WHERE attempt_id = '$attempt_id'
    ");
    
    mysqli_query($conn, "
        INSERT INTO notifications (sid, title, message, link, created_at) 
        VALUES ('{$attempt['sid']}', 'Assessment Approved', 
        'Your submission for \"{$assessment['title']}\" has been approved.', 
        'student_results.php?attempt_id=$attempt_id', NOW())
    ");
    
    $_SESSION['success'] = "Submission approved successfully!";
    header("location:view_submissions.php?aid=$assessment_id");
    exit();
}

$total_possible = array_sum(array_column($questions, 'marks'));

// If print mode, show print-friendly version
if ($print == 'true') {
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print Answered Paper - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            background: white;
            padding: 20px;
        }
        .print-container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
        }
        .school-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .assessment-title {
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0 5px;
        }
        .student-info {
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #ccc;
        }
        .student-info table {
            width: 100%;
        }
        .student-info td {
            padding: 5px;
        }
        .question-block {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .question-text {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .student-answer {
            margin: 10px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 3px solid #333;
        }
        .correct-answer {
            margin: 10px 0;
            padding: 10px;
            background: #e8f5e9;
            border-left: 3px solid #4caf50;
        }
        .marks-box {
            margin-top: 10px;
            text-align: right;
            border-top: 1px dashed #ccc;
            padding-top: 5px;
        }
        .score-summary {
            margin-top: 30px;
            padding: 15px;
            border: 2px solid #000;
            text-align: center;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        @media print {
            body {
                padding: 0;
            }
            .no-print {
                display: none;
            }
            .question-block {
                page-break-inside: avoid;
            }
        }
        .print-btn {
            background: #1a73e8;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .print-btn:hover {
            background: #1557b0;
        }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" class="print-btn">
                <i class="fas fa-print"></i> Print / Save as PDF
            </button>
            <button onclick="window.close()" class="print-btn" style="background: #6c757d;">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
        
        <div class="header">
            <div class="school-name">FUTURE KING SCHOOLS</div>
            <div>Excellence in Education</div>
            <div class="assessment-title"><?php echo strtoupper(htmlspecialchars($assessment['title'])); ?></div>
            <div>Answered Answer Sheet</div>
        </div>
        
        <div class="student-info">
            <table>
                <tr>
                    <td width="30%"><strong>Student Name:</strong></td>
                    <td><?php echo htmlspecialchars($attempt['firstname'] . ' ' . $attempt['lastname']); ?></td>
                    <td width="30%"><strong>Registration No:</strong></td>
                    <td><?php echo htmlspecialchars($attempt['reg']); ?></td>
                </tr>
                <tr>
                    <td><strong>Class:</strong></td>
                    <td><?php echo htmlspecialchars($attempt['class']); ?></td>
                    <td><strong>Date:</strong></td>
                    <td><?php echo date('F d, Y', strtotime($attempt['submitted_at'])); ?></td>
                </tr>
                <tr>
                    <td><strong>Assessment Type:</strong></td>
                    <td><?php echo ucfirst($assessment['assessment_type']); ?></td>
                    <td><strong>Total Marks:</strong></td>
                    <td><?php echo $assessment['total_marks']; ?> marks</td>
                </tr>
            </table>
        </div>
        
        <?php 
        $q_counter = 1;
        foreach($questions as $qid => $question): 
            $response = $responses[$qid] ?? null;
            $student_answer = $response ? $response['answer'] : '';
            $obtained_marks = $response ? $response['marks_awarded'] : 0;
        ?>
            <div class="question-block">
                <div class="question-text">
                    <?php echo $q_counter; ?>. <?php echo nl2br(htmlspecialchars($question['question_text'])); ?>
                    <span style="float: right;">[<?php echo $question['marks']; ?> marks]</span>
                </div>
                
                <?php if($question['question_type'] == 'multiple_choice_single' || $question['question_type'] == 'multiple_choice_multiple'): ?>
                    <div style="margin: 10px 0 10px 20px;">
                        <?php if($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>'; ?>
                        <?php if($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>'; ?>
                        <?php if($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>'; ?>
                        <?php if($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>'; ?>
                    </div>
                <?php endif; ?>
                
                <div class="student-answer">
                    <strong>Student's Answer:</strong><br>
                    <?php echo !empty($student_answer) ? nl2br(htmlspecialchars($student_answer)) : '<em>No answer provided</em>'; ?>
                </div>
                
                <div class="correct-answer">
                    <strong>Model/Correct Answer:</strong><br>
                    <?php 
                    if($question['question_type'] == 'multiple_choice_single') {
                        echo 'Correct option: ' . $question['correct_answer'] . '<br>';
                        if($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>';
                        if($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>';
                        if($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>';
                        if($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>';
                    } elseif($question['question_type'] == 'true_false') {
                        echo 'Correct answer: ' . $question['correct_answer'];
                    } else {
                        echo nl2br(htmlspecialchars($question['correct_answer']));
                    }
                    ?>
                </div>
                
                <div class="marks-box">
                    <strong>Marks Obtained:</strong> <?php echo $obtained_marks; ?> / <?php echo $question['marks']; ?> marks
                </div>
            </div>
        <?php 
            $q_counter++;
        endforeach; 
        ?>
        
        <div class="score-summary">
            <table style="width: 100%; text-align: center;">
                <tr>
                    <td><strong>Total Score:</strong> <?php echo $total_auto_score; ?> / <?php echo $assessment['total_marks']; ?> marks</td>
                    <td><strong>Percentage:</strong> <?php echo round($percentage, 1); ?>%</td>
                    <td><strong>Grade:</strong> <?php echo $grade; ?></td>
                </tr>
                <tr>
                    <td colspan="3">
                        <strong>Status:</strong> 
                        <?php echo ($total_auto_score >= $assessment['passing_marks']) ? '<span style="color: green;">PASSED</span>' : '<span style="color: red;">FAILED</span>'; ?>
                    </td>
                </tr>
            </table>
        </div>
        
        <div class="footer">
            <div>This is a computer-generated document. No signature required.</div>
            <div>Generated on: <?php echo date('F d, Y h:i A'); ?></div>
        </div>
    </div>
</body>
</html>
<?php
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grade Submission - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        .header-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
        .student-info { background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .question-card { background: white; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .question-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; }
        .question-body { padding: 20px; }
        .student-answer { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #1a73e8; }
        .correct-answer { background: #e6f4ea; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #34a853; }
        .marks-input { width: 120px; display: inline-block; }
        .btn-save { background: #34a853; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; }
        .btn-save:hover { background: #2d8e47; color: white; }
        .score-summary { background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .answer-correct { background: #d4edda; color: #155724; padding: 3px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
        .answer-wrong { background: #f8d7da; color: #721c24; padding: 3px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
        .btn-print { background: #f9ab00; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; margin-right: 10px; }
        .btn-print:hover { background: #e69500; color: white; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="header-card">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2><i class="fas fa-graduation-cap"></i> Grade Submission</h2>
                    <p class="mb-0"><?php echo htmlspecialchars($assessment['title']); ?></p>
                </div>
                <div>
                    <a href="view_submissions.php?aid=<?php echo $assessment_id; ?>" class="btn btn-light">
                        <i class="fas fa-arrow-left"></i> Back to Submissions
                    </a>
                </div>
            </div>
        </div>
        
        <!-- Student Info -->
        <div class="student-info">
            <div class="row">
                <div class="col-md-4">
                    <strong><i class="fas fa-user"></i> Student Name:</strong><br>
                    <?php echo htmlspecialchars($attempt['firstname'] . ' ' . $attempt['lastname']); ?>
                </div>
                <div class="col-md-3">
                    <strong><i class="fas fa-id-card"></i> Registration:</strong><br>
                    <?php echo htmlspecialchars($attempt['reg']); ?>
                </div>
                <div class="col-md-3">
                    <strong><i class="fas fa-chalkboard"></i> Class:</strong><br>
                    <?php echo htmlspecialchars($attempt['class']); ?>
                </div>
                <div class="col-md-2">
                    <strong><i class="fas fa-calendar"></i> Submitted:</strong><br>
                    <?php echo date('M d, H:i', strtotime($attempt['submitted_at'])); ?>
                </div>
            </div>
        </div>
        
        <!-- Score Summary -->
        <div class="score-summary">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h3>Current Score: <span id="totalScore"><?php echo $total_auto_score; ?></span> / <?php echo $total_possible; ?></h3>
                    <div class="progress mt-2" style="height: 8px;">
                        <div class="progress-bar bg-success" id="scoreProgress" style="width: <?php echo ($total_auto_score / $total_possible) * 100; ?>%"></div>
                    </div>
                </div>
                <div class="col-md-6 text-end">
                    <button type="button" class="btn btn-outline-success btn-sm me-2" onclick="markAllFull()">
                        <i class="fas fa-check-double"></i> Mark All Full Marks
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="markAllZero()">
                        <i class="fas fa-times"></i> Mark All Zero
                    </button>
                </div>
            </div>
        </div>
        
        <?php if(isset($_SESSION['success'])): ?>
            <div class="alert alert-success"><?php echo $_SESSION['success']; unset($_SESSION['success']); ?></div>
        <?php endif; ?>
        
        <form method="POST">
            <?php 
            $q_counter = 1;
            foreach($questions as $qid => $question): 
                $response = $responses[$qid] ?? null;
                $student_answer = $response ? $response['answer'] : '';
                $current_marks = $response ? $response['marks_awarded'] : 0;
                $is_auto_graded = in_array($question['question_type'], ['multiple_choice_single', 'multiple_choice_multiple', 'true_false']);
            ?>
                <div class="question-card">
                    <div class="question-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Question <?php echo $q_counter; ?> (<?php echo $question['marks']; ?> marks)</h5>
                            <?php if($is_auto_graded && $current_marks > 0): ?>
                                <span class="answer-correct"><i class="fas fa-robot"></i> Auto-graded</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="question-body">
                        <p><strong><?php echo nl2br(htmlspecialchars($question['question_text'])); ?></strong></p>
                        
                        <?php if($question['question_type'] == 'multiple_choice_single' || $question['question_type'] == 'multiple_choice_multiple'): ?>
                            <div class="mb-2">
                                <small class="text-muted">Options:</small><br>
                                <?php if($question['option_a']) echo '<span>A. ' . htmlspecialchars($question['option_a']) . '</span><br>'; ?>
                                <?php if($question['option_b']) echo '<span>B. ' . htmlspecialchars($question['option_b']) . '</span><br>'; ?>
                                <?php if($question['option_c']) echo '<span>C. ' . htmlspecialchars($question['option_c']) . '</span><br>'; ?>
                                <?php if($question['option_d']) echo '<span>D. ' . htmlspecialchars($question['option_d']) . '</span><br>'; ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="student-answer">
                            <strong><i class="fas fa-user-edit"></i> Student's Answer:</strong><br>
                            <?php if(!empty($student_answer)): ?>
                                <?php echo nl2br(htmlspecialchars($student_answer)); ?>
                            <?php else: ?>
                                <em class="text-muted">No answer provided</em>
                            <?php endif; ?>
                        </div>
                        
                        <div class="correct-answer">
                            <strong><i class="fas fa-check-double"></i> Correct/Model Answer:</strong><br>
                            <?php 
                            if($question['question_type'] == 'multiple_choice_single') {
                                echo 'Correct answer: ' . $question['correct_answer'] . '<br>';
                                if($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>';
                                if($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>';
                                if($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>';
                                if($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>';
                            } elseif($question['question_type'] == 'true_false') {
                                echo 'Correct answer: ' . $question['correct_answer'];
                            } else {
                                echo nl2br(htmlspecialchars($question['correct_answer']));
                            }
                            ?>
                        </div>
                        
                        <div class="mt-3">
                            <label><strong><i class="fas fa-star"></i> Marks Awarded:</strong></label>
                            <input type="number" 
                                   name="marks_<?php echo $qid; ?>" 
                                   class="form-control marks-input" 
                                   step="0.5" 
                                   min="0" 
                                   max="<?php echo $question['marks']; ?>"
                                   value="<?php echo $current_marks; ?>"
                                   onchange="updateTotal()"
                                   id="marks_<?php echo $qid; ?>">
                            <small class="text-muted ms-2">Max: <?php echo $question['marks']; ?> marks</small>
                        </div>
                    </div>
                </div>
            <?php 
                $q_counter++;
            endforeach; 
            ?>
            
            <div class="d-flex justify-content-between gap-3 mt-4">
                <div>
                    <a href="?attempt_id=<?php echo $attempt_id; ?>&aid=<?php echo $assessment_id; ?>&print=true" target="_blank" class="btn btn-print">
                        <i class="fas fa-print"></i> Print Answered Paper
                    </a>
                </div>
                <div>
                    <button type="submit" name="save_grades" class="btn btn-save">
                        <i class="fas fa-save"></i> Save Grades & Submit to Student
                    </button>
                    <button type="submit" name="approve_submission" class="btn btn-success ms-2" onclick="return confirm('Approve this submission?')">
                        <i class="fas fa-check-circle"></i> Approve Submission
                    </button>
                </div>
            </div>
        </form>
    </div>
    
    <script>
        function updateTotal() {
            const marksInputs = document.querySelectorAll('input[name^="marks_"]');
            let total = 0;
            marksInputs.forEach(input => {
                let val = parseFloat(input.value);
                if (isNaN(val)) val = 0;
                const max = parseFloat(input.getAttribute('max'));
                if (val > max) {
                    val = max;
                    input.value = max;
                }
                if (val < 0) {
                    val = 0;
                    input.value = 0;
                }
                total += val;
            });
            document.getElementById('totalScore').textContent = total;
            const percentage = (total / <?php echo $total_possible; ?>) * 100;
            document.getElementById('scoreProgress').style.width = percentage + '%';
        }
        
        function markAllFull() {
            const marksInputs = document.querySelectorAll('input[name^="marks_"]');
            marksInputs.forEach(input => {
                const max = parseFloat(input.getAttribute('max'));
                input.value = max;
            });
            updateTotal();
        }
        
        function markAllZero() {
            const marksInputs = document.querySelectorAll('input[name^="marks_"]');
            marksInputs.forEach(input => {
                input.value = 0;
            });
            updateTotal();
        }
    </script>
</body>
</html>