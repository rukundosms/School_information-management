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

$assessment_id = isset($_GET['aid']) ? intval($_GET['aid']) : 0;

// Get assessment info
$assessment_query = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    INNER JOIN permision p ON c.cid = p.cid
    WHERE a.assessment_id='$assessment_id' AND p.tid='$tid'
");
$assessment = mysqli_fetch_assoc($assessment_query);

if (!$assessment) {
    header("location:teacher_grade_assessments.php");
    exit();
}

// Get all questions for this assessment
$questions_query = mysqli_query($conn, "
    SELECT * FROM assessment_questions 
    WHERE assessment_id = '$assessment_id' 
    ORDER BY question_id ASC
");

$questions = [];
while($q = mysqli_fetch_assoc($questions_query)) {
    $questions[$q['question_id']] = $q;
}

// Get submissions
$submissions_query = mysqli_query($conn, "
    SELECT sub.*, s.firstname, s.lastname, s.reg
    FROM assessment_submissions sub
    INNER JOIN student s ON sub.sid = s.sid
    WHERE sub.assessment_id = '$assessment_id'
    ORDER BY sub.submission_date ASC
");

// Function to extract letter from correct answer
function extractCorrectLetter($correctAnswer) {
    if (preg_match('/^([A-Z])[\.\s]/', strtoupper($correctAnswer), $matches)) {
        return $matches[1];
    }
    if (strlen(trim($correctAnswer)) == 1 && ctype_alpha($correctAnswer)) {
        return strtoupper(trim($correctAnswer));
    }
    $tf = strtolower(trim($correctAnswer));
    if ($tf == 'true' || $tf == 'false') {
        return ucfirst($tf);
    }
    return trim($correctAnswer);
}

// Process submissions and calculate scores
$submissions_data = [];
while($sub = mysqli_fetch_assoc($submissions_query)) {
    $answers = json_decode($sub['answers'], true);
    $total_auto = 0;
    $correct_count = 0;
    $wrong_count = 0;
    $unanswered_count = 0;
    
    // Calculate scores from stored answers
    foreach($answers as &$answer) {
        $qid = $answer['qid'];
        if(isset($questions[$qid])) {
            $q = $questions[$qid];
            
            // Get user answer
            $user_answer = isset($answer['user_answer']) ? $answer['user_answer'] : (isset($answer['answer']) ? $answer['answer'] : '');
            $user_letter = isset($answer['user_letter']) ? $answer['user_letter'] : '';
            
            // Check if answer exists
            $has_answer = !empty($user_answer);
            if (!$has_answer) {
                $unanswered_count++;
            }
            
            // If answer has stored correctness, use it
            if(isset($answer['is_correct']) && $answer['is_correct'] !== null) {
                $is_correct = $answer['is_correct'];
                if($is_correct) {
                    $correct_count++;
                    $total_auto += isset($answer['obtained']) ? $answer['obtained'] : $q['marks'];
                } else {
                    $wrong_count++;
                }
            } 
            // Otherwise calculate now
            elseif($q['question_type'] == 'multiple_choice' || $q['question_type'] == 'true_false') {
                $is_correct = false;
                
                if($q['question_type'] == 'multiple_choice') {
                    $correct_letter = extractCorrectLetter($q['correct_answer']);
                    $is_correct = ($user_letter == $correct_letter && $has_answer);
                } else {
                    $correct_tf = strtolower(trim($q['correct_answer']));
                    $user_tf = strtolower(trim($user_answer));
                    $is_correct = ($user_tf == $correct_tf && $has_answer);
                }
                
                $answer['is_correct'] = $is_correct;
                $answer['obtained'] = $is_correct ? $q['marks'] : 0;
                
                if($is_correct) {
                    $correct_count++;
                    $total_auto += $answer['obtained'];
                } elseif($has_answer) {
                    $wrong_count++;
                }
            }
        }
    }
    
    $sub['answers_data'] = $answers;
    $sub['auto_score'] = $total_auto;
    $sub['correct_count'] = $correct_count;
    $sub['wrong_count'] = $wrong_count;
    $sub['unanswered_count'] = $unanswered_count;
    $submissions_data[] = $sub;
}

// Handle grade submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['save_grades'])) {
    $submission_id = intval($_POST['submission_id']);
    $feedback = mysqli_real_escape_string($conn, $_POST['feedback']);
    $total_obtained = 0;
    
    // Get existing submission
    $sub_data = mysqli_fetch_assoc(mysqli_query($conn, "SELECT answers FROM assessment_submissions WHERE submission_id = '$submission_id'"));
    $answers = json_decode($sub_data['answers'], true);
    
    // Update marks for each question
    foreach($answers as &$answer) {
        $qid = $answer['qid'];
        if(isset($_POST['marks_' . $qid])) {
            $obtained = floatval($_POST['marks_' . $qid]);
            $answer['obtained'] = $obtained;
            $total_obtained += $obtained;
            
            // Update correctness based on marks
            $max_marks = $questions[$qid]['marks'];
            $answer['is_correct'] = ($obtained >= $max_marks * 0.5); // 50% or more is considered correct for manual grading
        }
    }
    
    $answers_json = mysqli_real_escape_string($conn, json_encode($answers));
    
    // Update submission
    $update = mysqli_query($conn, "
        UPDATE assessment_submissions 
        SET obtained_marks = '$total_obtained',
            answers = '$answers_json',
            feedback = '$feedback',
            status = 'graded',
            graded_by = '$tid',
            graded_date = NOW()
        WHERE submission_id = '$submission_id'
    ");
    
    if ($update) {
        $student_info = mysqli_fetch_assoc(mysqli_query($conn, "SELECT sid FROM assessment_submissions WHERE submission_id = '$submission_id'"));
        
        $pass_status = ($total_obtained >= $assessment['passing_marks']) ? "PASSED" : "FAILED";
        mysqli_query($conn, "
            INSERT INTO notifications (sid, title, message, link, created_at) 
            VALUES ('{$student_info['sid']}', 'Assessment Graded', 
            'Your submission for \"{$assessment['title']}\" has been graded. Score: $total_obtained/{$assessment['total_marks']} - Status: $pass_status', 
            'student_results.php', NOW())
        ");
        
        $_SESSION['success'] = "Grades saved successfully!";
        header("location:grade_submissions.php?aid=$assessment_id");
        exit();
    } else {
        $error = "Failed to save grades: " . mysqli_error($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grade Submissions - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .submission-card {
            background: white;
            border-radius: 10px;
            margin-bottom: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .submission-header {
            background-color: rgb(8, 58, 8);
            color: white;
            padding: 15px 20px;
            cursor: pointer;
        }
        .submission-header:hover {
            background-color: rgb(5, 40, 5);
        }
        .submission-body {
            padding: 20px;
            display: none;
        }
        .question-box {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid rgb(8, 58, 8);
            border-radius: 5px;
        }
        .student-answer {
            background: white;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .correct-answer {
            background: #d4edda;
            padding: 10px;
            margin: 10px 0;
            border-left: 4px solid #28a745;
        }
        .answer-correct {
            background: #d4edda;
            color: #155724;
            padding: 3px 8px;
            border-radius: 5px;
            display: inline-block;
        }
        .answer-wrong {
            background: #f8d7da;
            color: #721c24;
            padding: 3px 8px;
            border-radius: 5px;
            display: inline-block;
        }
        .btn-save {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-save:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .marks-input {
            width: 100px;
            display: inline-block;
        }
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
        }
        .status-submitted { background: #ffc107; color: #000; }
        .status-graded { background: #28a745; color: #fff; }
        .score-summary {
            background: #e8f5e9;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .tick {
            color: green;
            font-weight: bold;
        }
        .cross {
            color: red;
            font-weight: bold;
        }
        .unanswered {
            color: #ffc107;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 style="color: rgb(8, 58, 8);">
                    <i class="fas fa-graduation-cap"></i> Grade Submissions
                </h2>
                <p class="text-muted">
                    Assessment: <strong><?php echo htmlspecialchars($assessment['title']); ?></strong> | 
                    Class: <?php echo htmlspecialchars($assessment['class_name']); ?> |
                    Total Marks: <?php echo $assessment['total_marks']; ?>
                </p>
            </div>
            <div>
                <a href="teacher_grade_assessments.php" class="btn btn-outline-secondary">
                    <i class="fas fa-arrow-left"></i> Back
                </a>
                <a href="teacher_download_responses.php?download=<?php echo $assessment_id; ?>&format=excel" class="btn btn-success">
                    <i class="fas fa-download"></i> Download Results
                </a>
            </div>
        </div>
        
        <?php if(isset($_SESSION['success'])): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle"></i> <?php echo $_SESSION['success']; unset($_SESSION['success']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if(isset($error)): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-circle"></i> <?php echo $error; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if(count($submissions_data) > 0): ?>
            <?php foreach($submissions_data as $sub): ?>
                <div class="submission-card">
                    <div class="submission-header" onclick="toggleSubmission(<?php echo $sub['submission_id']; ?>)">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong><i class="fas fa-user-graduate"></i> <?php echo htmlspecialchars($sub['firstname'] . ' ' . $sub['lastname']); ?></strong>
                                <small class="ms-2">(<?php echo htmlspecialchars($sub['reg']); ?>)</small>
                            </div>
                            <div>
                                <?php if($sub['status'] == 'graded'): ?>
                                    <span class="status-badge status-graded"><i class="fas fa-check-circle"></i> Graded</span>
                                <?php else: ?>
                                    <span class="status-badge status-submitted"><i class="fas fa-clock"></i> Pending</span>
                                <?php endif; ?>
                                <span class="ms-2">
                                    <strong>Score:</strong> <?php echo $sub['obtained_marks'] !== null ? $sub['obtained_marks'] : $sub['auto_score']; ?>/<?php echo $assessment['total_marks']; ?>
                                </span>
                                <span class="ms-2">
                                    <span class="answer-correct"><i class="fas fa-check"></i> ✓ <?php echo $sub['correct_count']; ?> Correct</span>
                                    <span class="answer-wrong"><i class="fas fa-times"></i> ✗ <?php echo $sub['wrong_count']; ?> Wrong</span>
                                    <?php if($sub['unanswered_count'] > 0): ?>
                                        <span class="answer-wrong" style="background: #fff3cd; color: #856404;"><i class="fas fa-question-circle"></i> ⚬ <?php echo $sub['unanswered_count']; ?> Unanswered</span>
                                    <?php endif; ?>
                                </span>
                                <i class="fas fa-chevron-down ms-2"></i>
                            </div>
                        </div>
                        <div class="progress mt-2">
                            <div class="progress-bar bg-success" 
                                 style="width: <?php echo (($sub['obtained_marks'] !== null ? $sub['obtained_marks'] : $sub['auto_score']) / $assessment['total_marks']) * 100; ?>%">
                            </div>
                        </div>
                    </div>
                    
                    <div class="submission-body" id="submission-<?php echo $sub['submission_id']; ?>">
                        <form method="POST" action="">
                            <input type="hidden" name="submission_id" value="<?php echo $sub['submission_id']; ?>">
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong><i class="fas fa-calendar-alt"></i> Submitted:</strong> <?php echo date('M d, Y H:i', strtotime($sub['submission_date'])); ?>
                                </div>
                                <div class="col-md-6 text-end">
                                    <strong><i class="fas fa-robot"></i> Auto-graded Score:</strong> <?php echo $sub['auto_score']; ?>/<?php echo $assessment['total_marks']; ?>
                                </div>
                            </div>
                            
                            <h5><i class="fas fa-list-ol"></i> Student Answers:</h5>
                            
                            <?php 
                            $q_counter = 1;
                            foreach($sub['answers_data'] as $answer):
                                $qid = $answer['qid'];
                                $question = $questions[$qid] ?? null;
                                if(!$question) continue;
                                
                                $student_answer = isset($answer['user_answer']) ? $answer['user_answer'] : (isset($answer['answer']) ? $answer['answer'] : '');
                                $is_correct = isset($answer['is_correct']) ? $answer['is_correct'] : false;
                                $existing_marks = isset($answer['obtained']) ? $answer['obtained'] : ($is_correct ? $question['marks'] : 0);
                                $is_auto = ($question['question_type'] == 'multiple_choice' || $question['question_type'] == 'true_false');
                                $has_answer = !empty($student_answer);
                            ?>
                                <div class="question-box">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <strong>Question <?php echo $q_counter; ?> (<?php echo $question['marks']; ?> marks)</strong>
                                        <?php if($is_auto): ?>
                                            <span class="<?php echo $is_correct ? 'answer-correct' : 'answer-wrong'; ?>">
                                                <?php if($is_correct): ?>
                                                    <i class="fas fa-check-circle"></i> ✓ CORRECT
                                                <?php elseif($has_answer): ?>
                                                    <i class="fas fa-times-circle"></i> ✗ WRONG
                                                <?php else: ?>
                                                    <i class="fas fa-question-circle"></i> ⚬ NO ANSWER
                                                <?php endif; ?>
                                            </span>
                                        <?php endif; ?>
                                    </div>
                                    <p class="mt-2"><strong><?php echo nl2br(htmlspecialchars($question['question_text'])); ?></strong></p>
                                    
                                    <?php if($question['question_type'] == 'multiple_choice'): ?>
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
                                        <?php if($has_answer): ?>
                                            <span class="<?php echo $is_correct ? 'answer-correct' : 'answer-wrong'; ?>" style="display: inline-block; padding: 2px 5px; margin-bottom: 5px;">
                                                <?php echo $is_correct ? '✓' : '✗'; ?> 
                                                <?php echo nl2br(htmlspecialchars($student_answer)); ?>
                                            </span>
                                        <?php else: ?>
                                            <span class="answer-wrong"><i class="fas fa-question-circle"></i> No answer provided</span>
                                        <?php endif; ?>
                                    </div>
                                    
                                    <div class="correct-answer">
                                        <strong><i class="fas fa-check-double"></i> Correct Answer:</strong><br>
                                        <?php 
                                        if($question['question_type'] == 'multiple_choice') {
                                            echo 'Answer: ' . $question['correct_answer'] . '<br>';
                                            if($question['option_a']) echo 'A. ' . htmlspecialchars($question['option_a']) . '<br>';
                                            if($question['option_b']) echo 'B. ' . htmlspecialchars($question['option_b']) . '<br>';
                                            if($question['option_c']) echo 'C. ' . htmlspecialchars($question['option_c']) . '<br>';
                                            if($question['option_d']) echo 'D. ' . htmlspecialchars($question['option_d']) . '<br>';
                                        } elseif($question['question_type'] == 'true_false') {
                                            echo 'Answer: ' . $question['correct_answer'];
                                        } else {
                                            echo nl2br(htmlspecialchars($question['correct_answer']));
                                        }
                                        ?>
                                    </div>
                                    
                                    <div class="mt-3">
                                        <label><strong><i class="fas fa-star"></i> Marks Obtained (max <?php echo $question['marks']; ?>):</strong></label>
                                        <input type="number" 
                                               name="marks_<?php echo $qid; ?>" 
                                               class="form-control marks-input" 
                                               step="0.5" 
                                               min="0" 
                                               max="<?php echo $question['marks']; ?>"
                                               value="<?php echo $existing_marks; ?>"
                                               onchange="updateTotal(this, <?php echo $sub['submission_id']; ?>)">
                                        <?php if($is_auto && $has_answer): ?>
                                            <small class="text-muted ms-2">Auto-graded: <?php echo $existing_marks; ?> marks</small>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            <?php 
                                $q_counter++;
                            endforeach; 
                            ?>
                            
                            <div class="score-summary">
                                <strong><i class="fas fa-chart-line"></i> Total Marks: <span id="total-<?php echo $sub['submission_id']; ?>"><?php echo $sub['obtained_marks'] !== null ? $sub['obtained_marks'] : $sub['auto_score']; ?></span> / <?php echo $assessment['total_marks']; ?></strong>
                                <br>
                                <small>
                                    <span class="answer-correct">✓ Correct: <?php echo $sub['correct_count']; ?></span> | 
                                    <span class="answer-wrong">✗ Wrong: <?php echo $sub['wrong_count']; ?></span>
                                    <?php if($sub['unanswered_count'] > 0): ?>
                                        | <span class="unanswered">⚬ Unanswered: <?php echo $sub['unanswered_count']; ?></span>
                                    <?php endif; ?>
                                </small>
                                <br>
                                <small>Passing Marks: <?php echo $assessment['passing_marks']; ?> | 
                                    Status: <?php echo (($sub['obtained_marks'] !== null ? $sub['obtained_marks'] : $sub['auto_score']) >= $assessment['passing_marks']) ? '<span class="answer-correct">✓ PASS</span>' : '<span class="answer-wrong">✗ FAIL</span>'; ?>
                                </small>
                            </div>
                            
                            <div class="mt-3">
                                <label><strong><i class="fas fa-comment-dots"></i> Feedback to Student:</strong></label>
                                <textarea name="feedback" class="form-control" rows="3" 
                                          placeholder="Provide feedback on the student's performance..."><?php echo htmlspecialchars($sub['feedback'] ?? ''); ?></textarea>
                            </div>
                            
                            <button type="submit" name="save_grades" class="btn btn-save mt-3">
                                <i class="fas fa-save"></i> Save Grades & Submit Feedback
                            </button>
                        </form>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="text-center p-5">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <h4>No Submissions Yet</h4>
                <p>No students have submitted this assessment.</p>
                <a href="teacher_grade_assessments.php" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Back to Assessments
                </a>
            </div>
        <?php endif; ?>
    </div>
    
    <script>
        function toggleSubmission(id) {
            const element = document.getElementById('submission-' + id);
            if (element.style.display === 'none' || element.style.display === '') {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        }
        
        function updateTotal(input, submissionId) {
            let value = parseFloat(input.value) || 0;
            const maxMarks = parseFloat(input.getAttribute('max'));
            
            if (value > maxMarks) {
                value = maxMarks;
                input.value = maxMarks;
            }
            if (value < 0) {
                value = 0;
                input.value = 0;
            }
            
            const card = input.closest('.submission-body');
            const marksInputs = card.querySelectorAll('input[name^="marks_"]');
            let total = 0;
            marksInputs.forEach(input => {
                total += parseFloat(input.value) || 0;
            });
            
            const totalSpan = document.getElementById('total-' + submissionId);
            if (totalSpan) {
                totalSpan.textContent = total.toFixed(1);
            }
        }
        
        // Initialize all submission bodies as hidden
        document.querySelectorAll('.submission-body').forEach(body => {
            body.style.display = 'none';
        });
    </script>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>