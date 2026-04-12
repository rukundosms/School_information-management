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
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Handle download request
if (isset($_GET['download'])) {
    $assessment_id = intval($_GET['download']);
    $format = isset($_GET['format']) ? $_GET['format'] : 'pdf';
    $student_id = isset($_GET['student_id']) ? intval($_GET['student_id']) : null;
    
    downloadAnsweredPaper($conn, $assessment_id, $student_id, $format);
    exit();
}

// Get all assessments for this teacher
$assessments_query = mysqli_query($conn, "
    SELECT DISTINCT a.*, c.class_name,
           (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.assessment_id AND status = 'submitted') as total_submissions,
           (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE a.tid = '$tid'
    ORDER BY a.created_at DESC
");

function downloadAnsweredPaper($conn, $assessment_id, $student_id, $format) {
    // Get assessment details
    $assessment_query = mysqli_query($conn, "
        SELECT a.*, c.class_name 
        FROM assessments a 
        INNER JOIN class c ON a.cid = c.cid 
        WHERE a.assessment_id = '$assessment_id'
    ");
    $assessment = mysqli_fetch_assoc($assessment_query);
    
    if (!$assessment) {
        die("Assessment not found.");
    }
    
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
    
    // Get submissions
    if ($student_id) {
        $submissions_query = mysqli_query($conn, "
            SELECT att.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
            FROM assessment_attempts att
            INNER JOIN student s ON att.sid = s.sid
            WHERE att.assessment_id = '$assessment_id' AND att.sid = '$student_id' AND att.status = 'submitted'
            ORDER BY s.lastname ASC
        ");
    } else {
        $submissions_query = mysqli_query($conn, "
            SELECT att.*, s.firstname, s.lastname, s.reg, s.class, s.program_id
            FROM assessment_attempts att
            INNER JOIN student s ON att.sid = s.sid
            WHERE att.assessment_id = '$assessment_id' AND att.status = 'submitted'
            ORDER BY s.lastname ASC
        ");
    }
    
    if ($format == 'excel') {
        exportToExcel($assessment, $questions, $submissions_query);
    } else {
        exportToPDF($assessment, $questions, $submissions_query);
    }
}

function exportToPDF($assessment, $questions, $submissions_query) {
    header('Content-Type: text/html');
    header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9\-]/', '_', $assessment['title']) . '_answers.pdf"');
    
    echo '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>' . htmlspecialchars($assessment['title']) . ' - Student Answer Sheets</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body { 
                font-family: "Times New Roman", Times, serif; 
                background: white;
                padding: 20px;
            }
            .page {
                max-width: 900px;
                margin: 0 auto;
                page-break-after: always;
            }
            .page:last-child {
                page-break-after: auto;
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
                padding: 15px;
                border: 1px solid #ccc;
                background: #f9f9f9;
            }
            .student-info table {
                width: 100%;
                border-collapse: collapse;
            }
            .student-info td {
                padding: 8px;
            }
            .question-block {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }
            .question-text {
                font-weight: bold;
                margin-bottom: 10px;
                padding: 10px;
                background: #e8f4fd;
                border-left: 4px solid #4CAF50;
            }
            .student-answer {
                margin: 10px 0;
                padding: 12px;
                background: #f8f9fa;
                border-left: 3px solid #1a73e8;
            }
            .correct-answer {
                margin: 10px 0;
                padding: 12px;
                background: #e6f4ea;
                border-left: 3px solid #34a853;
            }
            .marks-box {
                margin-top: 10px;
                text-align: right;
                border-top: 1px dashed #ccc;
                padding-top: 8px;
            }
            .score-summary {
                margin-top: 30px;
                padding: 15px;
                border: 2px solid #000;
                text-align: center;
                background: #f0f0f0;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                border-top: 1px solid #ccc;
                padding-top: 10px;
            }
            .tick {
                color: green;
                font-weight: bold;
                display: inline-block;
                background: #d4edda;
                padding: 2px 8px;
                border-radius: 4px;
            }
            .cross {
                color: red;
                font-weight: bold;
                display: inline-block;
                background: #f8d7da;
                padding: 2px 8px;
                border-radius: 4px;
            }
            .answer-status {
                margin-top: 8px;
            }
            .options {
                margin: 10px 0 10px 20px;
                font-size: 14px;
            }
            @media print {
                body {
                    padding: 0;
                    margin: 0;
                }
                .no-print {
                    display: none;
                }
            }
        </style>
    </head>
    <body>';
    
    $student_count = mysqli_num_rows($submissions_query);
    $student_counter = 1;
    
    while($sub = mysqli_fetch_assoc($submissions_query)) {
        // Get responses for this attempt
        $responses_query = mysqli_query($GLOBALS['conn'], "
            SELECT * FROM assessment_responses 
            WHERE attempt_id = '{$sub['attempt_id']}'
        ");
        $responses = [];
        $total_score = 0;
        while($r = mysqli_fetch_assoc($responses_query)) {
            $responses[$r['question_id']] = $r;
            $total_score += $r['marks_awarded'];
        }
        
        $percentage = ($total_score / $assessment['total_marks']) * 100;
        $grade = $percentage >= 80 ? 'A' : ($percentage >= 70 ? 'B' : ($percentage >= 60 ? 'C' : ($percentage >= 50 ? 'D' : 'F')));
        
        echo '<div class="page">';
        
        // Header
        echo '<div class="header">';
        echo '<div class="school-name">FUTURE KING SCHOOLS</div>';
        echo '<div>Excellence in Education</div>';
        echo '<div class="assessment-title">' . strtoupper(htmlspecialchars($assessment['title'])) . '</div>';
        echo '<div>Student Answer Sheet</div>';
        echo '</div>';
        
        // Student Information
        echo '<div class="student-info">';
        echo '<h4>STUDENT INFORMATION</h4>';
        echo '<table>';
        echo '<tr><td width="30%"><strong>Student Name:</strong></td><td>' . htmlspecialchars($sub['firstname'] . ' ' . $sub['lastname']) . '</td>';
        echo '<td width="30%"><strong>Registration No:</strong></td><td>' . htmlspecialchars($sub['reg']) . '</td></tr>';
        echo '<tr><td><strong>Class:</strong></td><td>' . htmlspecialchars($sub['class']) . '</td>';
        echo '<td><strong>Program ID:</strong></td><td>' . htmlspecialchars($sub['program_id']) . '</td></tr>';
        echo '<tr><td><strong>Submitted Date:</strong></td><td>' . date('F d, Y h:i A', strtotime($sub['submitted_at'])) . '</td>';
        echo '<td><strong>Attempt No:</strong></td><td>' . $sub['attempt_number'] . '</td></tr>';
        echo '</table>';
        echo '</div>';
        
        // Assessment Info
        echo '<div class="student-info" style="background:#e8f4fd;">';
        echo '<h4>ASSESSMENT INFORMATION</h4>';
        echo '<table>';
        echo '<tr><td width="30%"><strong>Assessment Title:</strong></td><td>' . htmlspecialchars($assessment['title']) . '</td>';
        echo '<td width="30%"><strong>Class:</strong></td><td>' . htmlspecialchars($assessment['class_name']) . '</td></tr>';
        echo '<tr><td><strong>Total Marks:</strong></td><td>' . $assessment['total_marks'] . '</td>';
        echo '<td><strong>Passing Marks:</strong></td><td>' . $assessment['passing_marks'] . '</td></tr>';
        echo '<tr><td><strong>Duration:</strong></td><td>' . ($assessment['duration_minutes'] ?: 'No limit') . ' minutes</td>';
        echo '<td><strong>Assessment Type:</strong></td><td>' . ucfirst($assessment['assessment_type']) . '</td></tr>';
        echo '</table>';
        echo '</div>';
        
        // Questions and Answers
        echo '<h3>QUESTIONS AND ANSWERS</h3>';
        
        $q_num = 1;
        foreach($questions as $qid => $question) {
            $response = isset($responses[$qid]) ? $responses[$qid] : null;
            $student_answer = $response ? $response['answer'] : '';
            $obtained_marks = $response ? $response['marks_awarded'] : 0;
            $is_correct = $response ? $response['is_correct'] : false;
            
            echo '<div class="question-block">';
            echo '<div class="question-text">';
            echo '<strong>Question ' . $q_num . '</strong> (' . $question['marks'] . ' marks)<br>';
            echo nl2br(htmlspecialchars($question['question_text']));
            
            // Show options for multiple choice
            if ($question['question_type'] == 'multiple_choice_single' || $question['question_type'] == 'multiple_choice_multiple') {
                echo '<div class="options">';
                if ($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>';
                if ($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>';
                if ($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>';
                if ($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>';
                echo '</div>';
            }
            echo '</div>';
            
            // Student's Answer
            echo '<div class="student-answer">';
            echo '<strong>✍️ STUDENT\'S ANSWER:</strong><br>';
            if (!empty($student_answer)) {
                echo nl2br(htmlspecialchars($student_answer));
                echo '<div class="answer-status">';
                if ($is_correct) {
                    echo '<span class="tick">✓ CORRECT</span>';
                } else {
                    echo '<span class="cross">✗ WRONG</span>';
                }
                echo '</div>';
            } else {
                echo '<em>No answer provided</em>';
                echo '<div class="answer-status"><span class="cross">✗ NO ANSWER</span></div>';
            }
            echo '</div>';
            
            // Correct Answer
            echo '<div class="correct-answer">';
            echo '<strong>✓ CORRECT/MODEL ANSWER:</strong><br>';
            if ($question['question_type'] == 'multiple_choice_single') {
                echo 'Correct option: ' . $question['correct_answer'] . '<br>';
                if ($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>';
                if ($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>';
                if ($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>';
                if ($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>';
            } elseif ($question['question_type'] == 'true_false') {
                echo 'Correct answer: ' . $question['correct_answer'];
            } else {
                echo nl2br(htmlspecialchars($question['correct_answer']));
            }
            echo '</div>';
            
            // Marks
            echo '<div class="marks-box">';
            echo '<strong>Marks Obtained:</strong> ' . $obtained_marks . ' / ' . $question['marks'];
            echo '</div>';
            
            echo '</div>';
            $q_num++;
        }
        
        // Score Summary
        echo '<div class="score-summary">';
        echo '<table style="width:100%; text-align:center;">';
        echo '<tr>';
        echo '<td><strong>Total Score:</strong><br>' . $total_score . ' / ' . $assessment['total_marks'] . '</td>';
        echo '<td><strong>Percentage:</strong><br>' . round($percentage, 1) . '%</td>';
        echo '<td><strong>Grade:</strong><br>' . $grade . '</td>';
        echo '</tr>';
        echo '<tr>';
        echo '<td colspan="3"><strong>Status:</strong> ' . ($total_score >= $assessment['passing_marks'] ? '<span style="color:green;">✓ PASSED</span>' : '<span style="color:red;">✗ FAILED</span>') . '</td>';
        echo '</tr>';
        echo '</table>';
        echo '</div>';
        
        // Feedback
        if (!empty($sub['feedback'])) {
            echo '<div style="margin-top:20px; padding:15px; background:#fff3cd; border-left:4px solid #ffc107;">';
            echo '<strong>📝 EXAMINER FEEDBACK:</strong><br>';
            echo nl2br(htmlspecialchars($sub['feedback']));
            echo '</div>';
        }
        
        // Signature
        echo '<div class="footer">';
        echo '<table style="width:100%; margin-top:40px;">';
        echo '<tr>';
        echo '<td style="border-top:1px solid #000; padding-top:10px;">Examiner\'s Signature: _________________</td>';
        echo '<td style="border-top:1px solid #000; padding-top:10px;">Date: ' . date('F d, Y') . '</td>';
        echo '</tr>';
        echo '</table>';
        echo '<div>This is a computer-generated document. No signature required.</div>';
        echo '<div>Generated on: ' . date('F d, Y h:i A') . '</div>';
        echo '</div>';
        
        echo '</div>';
        $student_counter++;
    }
    
    echo '<script>
        window.onload = function() {
            window.print();
        }
    </script>';
    echo '</body></html>';
}

function exportToExcel($assessment, $questions, $submissions_query) {
    header('Content-Type: application/vnd.ms-excel');
    header('Content-Disposition: attachment; filename="' . preg_replace('/[^A-Za-z0-9\-]/', '_', $assessment['title']) . '_answers.xls"');
    
    echo '<html>';
    echo '<head>';
    echo '<meta charset="UTF-8">';
    echo '<style>';
    echo 'body { font-family: Arial, sans-serif; }';
    echo 'th { background: #4CAF50; color: white; padding: 8px; }';
    echo 'td { padding: 6px; border: 1px solid #ddd; }';
    echo '.correct { background: #d4edda; }';
    echo '.wrong { background: #f8d7da; }';
    echo '</style>';
    echo '</head>';
    echo '<body>';
    
    while($sub = mysqli_fetch_assoc($submissions_query)) {
        // Get responses
        $responses_query = mysqli_query($GLOBALS['conn'], "
            SELECT * FROM assessment_responses 
            WHERE attempt_id = '{$sub['attempt_id']}'
        ");
        $responses = [];
        $total_score = 0;
        while($r = mysqli_fetch_assoc($responses_query)) {
            $responses[$r['question_id']] = $r;
            $total_score += $r['marks_awarded'];
        }
        
        $percentage = ($total_score / $assessment['total_marks']) * 100;
        
        // Student Header
        echo '<h2>' . htmlspecialchars($assessment['title']) . ' - Student Answer Sheet</h2>';
        echo '<h3>Student: ' . htmlspecialchars($sub['firstname'] . ' ' . $sub['lastname']) . ' (' . htmlspecialchars($sub['reg']) . ')</h3>';
        echo '<table border="1" cellpadding="5" cellspacing="0">';
        echo '<tr><th colspan="2">Student Information</th></tr>';
        echo '<tr><td width="30%"><strong>Name:</strong></td><td>' . htmlspecialchars($sub['firstname'] . ' ' . $sub['lastname']) . '</td></tr>';
        echo '<tr><td><strong>Registration:</strong></td><td>' . htmlspecialchars($sub['reg']) . '</td></tr>';
        echo '<tr><td><strong>Class:</strong></td><td>' . htmlspecialchars($sub['class']) . '</td></tr>';
        echo '<tr><td><strong>Submitted Date:</strong></td><td>' . date('F d, Y h:i A', strtotime($sub['submitted_at'])) . '</td></tr>';
        echo '</table><br>';
        
        // Questions Table
        echo '<table border="1" cellpadding="8" cellspacing="0" style="width:100%;">';
        echo '<tr style="background:#4CAF50; color:white;">';
        echo '<th>#</th>';
        echo '<th>Question</th>';
        echo '<th>Student Answer</th>';
        echo '<th>Correct Answer</th>';
        echo '<th>Marks<br>Obtained</th>';
        echo '<th>Max<br>Marks</th>';
        echo '<th>Status</th>';
        echo '</tr>';
        
        $q_num = 1;
        foreach($questions as $qid => $question) {
            $response = isset($responses[$qid]) ? $responses[$qid] : null;
            $student_answer = $response ? $response['answer'] : '';
            $obtained_marks = $response ? $response['marks_awarded'] : 0;
            $is_correct = $response ? $response['is_correct'] : false;
            
            $row_class = $is_correct ? 'correct' : ($student_answer ? 'wrong' : '');
            echo '<tr class="' . $row_class . '">';
            echo '<td>' . $q_num . '</td>';
            echo '<td>' . nl2br(htmlspecialchars($question['question_text'])) . '</td>';
            echo '<td>' . (!empty($student_answer) ? nl2br(htmlspecialchars($student_answer)) : '<em>No answer</em>') . '</td>';
            echo '<td>' . nl2br(htmlspecialchars($question['correct_answer'])) . '</td>';
            echo '<td>' . $obtained_marks . '</td>';
            echo '<td>' . $question['marks'] . '</td>';
            echo '<td>' . ($is_correct ? '✓ Correct' : ($student_answer ? '✗ Wrong' : '⚬ No Answer')) . '</td>';
            echo '</tr>';
            $q_num++;
        }
        
        // Summary Row
        echo '<tr style="background:#f0f0f0; font-weight:bold;">';
        echo '<td colspan="4" style="text-align:right;"><strong>TOTAL:</strong></td>';
        echo '<td><strong>' . $total_score . '</strong></td>';
        echo '<td><strong>' . $assessment['total_marks'] . '</strong></td>';
        echo '<td><strong>' . round($percentage, 1) . '%</strong></td>';
        echo '</tr>';
        echo '</table><br><br>';
        
        // Feedback
        if (!empty($sub['feedback'])) {
            echo '<div style="margin-top:20px;">';
            echo '<strong>Examiner Feedback:</strong><br>';
            echo nl2br(htmlspecialchars($sub['feedback']));
            echo '</div>';
        }
        
        echo '<hr style="margin: 40px 0;">';
    }
    
    echo '</body></html>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download Assessment Responses</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .dashboard-header {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .assessment-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
            height: 100%;
        }
        .assessment-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .btn-download {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            margin: 5px;
        }
        .btn-download:hover {
            background: rgb(5, 40, 5);
            color: white;
        }
        .stats {
            font-size: 0.85rem;
            color: #666;
            margin-top: 10px;
        }
        .stats i {
            width: 20px;
            color: rgb(8, 58, 8);
        }
        .student-list {
            margin-top: 15px;
            border-top: 1px solid #eee;
            padding-top: 12px;
        }
        .student-badge {
            display: inline-block;
            background: #f0f2f5;
            padding: 5px 10px;
            margin: 3px;
            border-radius: 20px;
            font-size: 0.75rem;
        }
        .student-badge a {
            color: #333;
            text-decoration: none;
        }
        .student-badge a:hover {
            color: #1a73e8;
        }
        .badge-count {
            background: #1a73e8;
            color: white;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 0.7rem;
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="dashboard-header">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2 style="color: rgb(8, 58, 8);">
                        <i class="fas fa-download"></i> Download Student Answers
                    </h2>
                    <p class="text-muted mb-0">Download answered papers for each assessment</p>
                </div>
                <div>
                    <a href="teacher_dashboard.php" class="btn btn-outline-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
        
        <div class="row">
            <?php if(mysqli_num_rows($assessments_query) > 0): ?>
                <?php while($assessment = mysqli_fetch_assoc($assessments_query)): ?>
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="assessment-card">
                            <h5 class="mb-2"><?php echo htmlspecialchars($assessment['title']); ?></h5>
                            <p class="text-muted small">
                                <i class="fas fa-chalkboard"></i> <?php echo htmlspecialchars($assessment['class_name']); ?>
                            </p>
                            
                            <div class="stats">
                                <div><i class="fas fa-question-circle"></i> Questions: <?php echo $assessment['total_questions']; ?></div>
                                <div><i class="fas fa-users"></i> Submissions: <?php echo $assessment['total_submissions']; ?></div>
                                <div><i class="fas fa-star"></i> Total Marks: <?php echo $assessment['total_marks']; ?></div>
                                <div><i class="fas fa-calendar"></i> Created: <?php echo date('M d, Y', strtotime($assessment['created_at'])); ?></div>
                            </div>
                            
                            <div class="mt-3">
                                <div class="btn-group w-100 mb-2">
                                    <a href="?download=<?php echo $assessment['assessment_id']; ?>&format=pdf" 
                                       class="btn btn-download btn-sm" target="_blank">
                                        <i class="fas fa-file-pdf"></i> Download All (PDF)
                                    </a>
                                    <a href="?download=<?php echo $assessment['assessment_id']; ?>&format=excel" 
                                       class="btn btn-download btn-sm">
                                        <i class="fas fa-file-excel"></i> Download All (Excel)
                                    </a>
                                </div>
                            </div>
                            
                            <?php
                            // Get students who submitted
                            $students_submitted = mysqli_query($conn, "
                                SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg
                                FROM assessment_attempts att
                                INNER JOIN student s ON att.sid = s.sid
                                WHERE att.assessment_id = '" . $assessment['assessment_id'] . "' AND att.status = 'submitted'
                                ORDER BY s.lastname ASC
                            ");
                            
                            if(mysqli_num_rows($students_submitted) > 0):
                            ?>
                            <div class="student-list">
                                <small class="text-muted">
                                    <i class="fas fa-user-graduate"></i> Individual Student Papers:
                                    <span class="badge-count"><?php echo mysqli_num_rows($students_submitted); ?></span>
                                </small>
                                <div class="mt-2">
                                    <?php while($student = mysqli_fetch_assoc($students_submitted)): ?>
                                        <span class="student-badge">
                                            <a href="?download=<?php echo $assessment['assessment_id']; ?>&format=pdf&student_id=<?php echo $student['sid']; ?>" target="_blank">
                                                <i class="fas fa-file-pdf"></i> 
                                                <?php echo htmlspecialchars($student['firstname'] . ' ' . $student['lastname']); ?>
                                            </a>
                                        </span>
                                    <?php endwhile; ?>
                                </div>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <div class="col-12">
                    <div class="text-center p-5 bg-white rounded">
                        <i class="fas fa-download fa-4x text-muted mb-3"></i>
                        <h4>No Assessments Available</h4>
                        <p>Create assessments first to download student responses.</p>
                        <a href="create_assessment.php" class="btn btn-success">
                            <i class="fas fa-plus"></i> Create Assessment
                        </a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>