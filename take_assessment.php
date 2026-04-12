<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$assessment_id = isset($_GET['id']) ? mysqli_real_escape_string($conn, $_GET['id']) : 0;

if ($assessment_id == 0) {
    $_SESSION['error'] = "No assessment selected.";
    header("location:student_assessments.php");
    exit();
}

// Get current active year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year = mysqli_fetch_assoc($current_year_query);
$current_year_id = $current_year ? $current_year['year_id'] : 0;

// Get student info and class
$student_info_query = mysqli_query($conn, "
    SELECT s.*, sp.to_class as promoted_class, c.cid as class_id, c.class_name
    FROM student s
    LEFT JOIN student_promotion_log sp ON s.sid = sp.sid AND sp.to_year = '$current_year_id'
    LEFT JOIN class c ON sp.to_class = c.cid
    WHERE s.sid = '$sid'
    ORDER BY sp.log_id DESC
    LIMIT 1
");

if (mysqli_num_rows($student_info_query) == 0) {
    $_SESSION['error'] = "Student not found.";
    header("location:student_login.php");
    exit();
}

$student = mysqli_fetch_assoc($student_info_query);
$student_class_id = $student['class_id'] ?? 0;

// Get assessment details
$assessment_query = mysqli_query($conn, "
    SELECT a.*, c.class_name, c.cid as class_cid
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE a.assessment_id = '$assessment_id' AND a.status = 'published'
");

if (mysqli_num_rows($assessment_query) == 0) {
    $_SESSION['error'] = "Assessment not found or not published.";
    header("location:student_assessments.php");
    exit();
}

$assessment = mysqli_fetch_assoc($assessment_query);

// Validate class
if ($student_class_id != $assessment['class_cid']) {
    $_SESSION['error'] = "This assessment is not assigned to your class.";
    header("location:student_assessments.php");
    exit();
}

// Check time availability
$current_time = time();
$start_time = strtotime($assessment['start_date'] . ' ' . $assessment['start_time']);
$end_time = strtotime($assessment['end_date'] . ' ' . $assessment['end_time']);

if ($current_time < $start_time) {
    $_SESSION['error'] = "This assessment starts on " . date('F d, Y \a\t h:i A', $start_time);
    header("location:student_assessments.php");
    exit();
}

if ($current_time > $end_time) {
    $_SESSION['error'] = "This assessment has ended.";
    header("location:student_assessments.php");
    exit();
}

// Create tables if they don't exist
mysqli_query($conn, "
    CREATE TABLE IF NOT EXISTS assessment_attempts (
        attempt_id INT PRIMARY KEY AUTO_INCREMENT,
        assessment_id INT,
        sid INT,
        attempt_number INT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP NULL,
        status ENUM('in_progress', 'submitted', 'abandoned') DEFAULT 'in_progress',
        ip_address VARCHAR(45),
        user_agent TEXT
    )
");

mysqli_query($conn, "
    CREATE TABLE IF NOT EXISTS assessment_autosave (
        autosave_id INT PRIMARY KEY AUTO_INCREMENT,
        attempt_id INT,
        question_id INT,
        answer TEXT,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attempt_question (attempt_id, question_id)
    )
");

mysqli_query($conn, "
    CREATE TABLE IF NOT EXISTS assessment_responses (
        response_id INT PRIMARY KEY AUTO_INCREMENT,
        attempt_id INT,
        question_id INT,
        answer TEXT,
        marks_awarded DECIMAL(10,2),
        is_correct BOOLEAN,
        response_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attempt_question (attempt_id, question_id)
    )
");

// Check attempts
$attempts_query = mysqli_query($conn, "
    SELECT COUNT(*) as attempt_count FROM assessment_attempts 
    WHERE assessment_id = '$assessment_id' AND sid = '$sid' AND status = 'submitted'
");
$attempts_data = mysqli_fetch_assoc($attempts_query);
$limit_attempts = isset($assessment['limit_attempts']) ? $assessment['limit_attempts'] : 1;

if ($attempts_data['attempt_count'] >= $limit_attempts) {
    $_SESSION['error'] = "You have reached the maximum number of attempts for this assessment.";
    header("location:student_assessments.php");
    exit();
}

// Get or create active attempt
$active_attempt_query = mysqli_query($conn, "
    SELECT * FROM assessment_attempts 
    WHERE assessment_id = '$assessment_id' AND sid = '$sid' AND status = 'in_progress'
    ORDER BY attempt_id DESC LIMIT 1
");

if (mysqli_num_rows($active_attempt_query) > 0) {
    $active_attempt = mysqli_fetch_assoc($active_attempt_query);
    $attempt_id = $active_attempt['attempt_id'];
} else {
    $attempt_number = $attempts_data['attempt_count'] + 1;
    mysqli_query($conn, "
        INSERT INTO assessment_attempts (assessment_id, sid, attempt_number, status, ip_address, user_agent)
        VALUES ('$assessment_id', '$sid', '$attempt_number', 'in_progress', 
                '{$_SERVER['REMOTE_ADDR']}', '{$_SERVER['HTTP_USER_AGENT']}')
    ");
    $attempt_id = mysqli_insert_id($conn);
}

// Get questions with all fields
$questions_query = mysqli_query($conn, "
    SELECT * FROM assessment_questions 
    WHERE assessment_id = '$assessment_id' 
    ORDER BY display_order ASC, question_id ASC
");

$questions = [];
while($q = mysqli_fetch_assoc($questions_query)) {
    // Get autosaved answer
    $autosave_query = mysqli_query($conn, "
        SELECT answer FROM assessment_autosave 
        WHERE attempt_id = '$attempt_id' AND question_id = '{$q['question_id']}'
    ");
    $autosave = mysqli_fetch_assoc($autosave_query);
    $q['autosave_answer'] = $autosave['answer'] ?? '';
    
    // Get submitted answer if any
    $response_query = mysqli_query($conn, "
        SELECT answer FROM assessment_responses 
        WHERE attempt_id = '$attempt_id' AND question_id = '{$q['question_id']}'
    ");
    $response = mysqli_fetch_assoc($response_query);
    $q['saved_answer'] = $response['answer'] ?? '';
    
    $questions[] = $q;
}

$total_questions = count($questions);
$total_marks = $assessment['total_marks'];

// Handle AJAX requests
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    header('Content-Type: application/json');
    
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        
        // Auto-save answer
        if ($action == 'autosave') {
            $question_id = mysqli_real_escape_string($conn, $_POST['question_id']);
            $answer = mysqli_real_escape_string($conn, $_POST['answer']);
            
            mysqli_query($conn, "
                INSERT INTO assessment_autosave (attempt_id, question_id, answer, saved_at)
                VALUES ('$attempt_id', '$question_id', '$answer', NOW())
                ON DUPLICATE KEY UPDATE answer = '$answer', saved_at = NOW()
            ");
            
            echo json_encode(['success' => true]);
            exit();
        }
        
        // Final submission
        if ($action == 'submit') {
            $answers = json_decode($_POST['answers'], true);
            $total_obtained = 0;
            
            foreach ($answers as $answer_data) {
                $question_id = $answer_data['question_id'];
                $user_answer = mysqli_real_escape_string($conn, $answer_data['answer']);
                
                $q_query = mysqli_query($conn, "SELECT * FROM assessment_questions WHERE question_id = '$question_id'");
                $question = mysqli_fetch_assoc($q_query);
                
                $marks_obtained = 0;
                $is_correct = null;
                
                if ($question) {
                    if ($question['question_type'] == 'multiple_choice_single') {
                        $correct_answer = trim($question['correct_answer']);
                        $is_correct = (strtoupper(trim($user_answer)) == strtoupper($correct_answer));
                        $marks_obtained = $is_correct ? $question['marks'] : 0;
                    } 
                    elseif ($question['question_type'] == 'multiple_choice_multiple') {
                        $user_answers = is_array($user_answer) ? $user_answer : explode(',', $user_answer);
                        $correct_answers = explode(',', $question['correct_answer']);
                        $correct_count = count(array_intersect($user_answers, $correct_answers));
                        $wrong_count = count(array_diff($user_answers, $correct_answers));
                        $points_per = isset($question['points_per_answer']) ? $question['points_per_answer'] : 1;
                        $marks_obtained = max(0, ($correct_count * $points_per) - ($wrong_count * $points_per));
                        $marks_obtained = min($marks_obtained, $question['marks']);
                        $is_correct = ($marks_obtained == $question['marks']);
                    }
                    elseif ($question['question_type'] == 'true_false') {
                        $is_correct = (strtolower(trim($user_answer)) == strtolower(trim($question['correct_answer'])));
                        $marks_obtained = $is_correct ? $question['marks'] : 0;
                    }
                    else {
                        $marks_obtained = 0;
                        $is_correct = null;
                    }
                }
                
                $total_obtained += $marks_obtained;
                
                mysqli_query($conn, "
                    INSERT INTO assessment_responses (attempt_id, question_id, answer, marks_awarded, is_correct)
                    VALUES ('$attempt_id', '$question_id', '$user_answer', '$marks_obtained', " . ($is_correct ? '1' : '0') . ")
                    ON DUPLICATE KEY UPDATE 
                    answer = '$user_answer', marks_awarded = '$marks_obtained', is_correct = " . ($is_correct ? '1' : '0')
                );
            }
            
            mysqli_query($conn, "
                UPDATE assessment_attempts 
                SET status = 'submitted', submitted_at = NOW()
                WHERE attempt_id = '$attempt_id'
            ");
            
            mysqli_query($conn, "DELETE FROM assessment_autosave WHERE attempt_id = '$attempt_id'");
            
            $percentage = ($total_marks > 0) ? ($total_obtained / $total_marks) * 100 : 0;
            $grade = $percentage >= 80 ? 'A' : ($percentage >= 70 ? 'B' : ($percentage >= 60 ? 'C' : ($percentage >= 50 ? 'D' : 'F')));
            
            mysqli_query($conn, "
                INSERT INTO notifications (sid, title, message, link, created_at) 
                VALUES ('$sid', 'Assessment Submitted: {$assessment['title']}', 
                'You scored $total_obtained/$total_marks marks (" . round($percentage, 1) . "%) - Grade: $grade', 
                'view_result.php?attempt_id=$attempt_id', NOW())
            ");
            
            echo json_encode([
                'success' => true, 
                'message' => 'Assessment submitted successfully!',
                'score' => $total_obtained,
                'total' => $total_marks,
                'percentage' => round($percentage, 1),
                'grade' => $grade
            ]);
            exit();
        }
    }
    exit();
}

$time_limit = isset($assessment['duration_minutes']) ? $assessment['duration_minutes'] : null;
$end_time_js = date('Y-m-d H:i:s', $end_time);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($assessment['title']); ?> - Take Assessment</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f0f2f5; font-family: 'Roboto', sans-serif; padding: 20px; }
        .progress-container { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .progress-bar-custom { height: 4px; background: linear-gradient(90deg, #1a73e8, #34a853); width: 0%; transition: width 0.3s ease; }
        .assessment-header { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); margin-top: 60px; }
        .assessment-title { font-size: 32px; font-weight: 500; color: #202124; margin-bottom: 8px; }
        .question-card { background: white; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); position: relative; }
        .question-header { padding: 20px 24px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border-radius: 8px 8px 0 0; }
        .question-text { font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 0; }
        .required-badge { color: #d93025; font-size: 12px; margin-left: 8px; }
        .marks-badge { background: #e8f0fe; color: #1a73e8; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
        .question-body { padding: 20px 24px; }
        .option-item { display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; transition: background 0.2s; border: 1px solid #e0e0e0; }
        .option-item:hover { background: #f8f9fa; border-color: #1a73e8; }
        .option-input { margin-right: 16px; width: 20px; height: 20px; cursor: pointer; }
        .option-label { font-size: 14px; color: #202124; cursor: pointer; flex: 1; }
        .answer-textarea { width: 100%; padding: 12px; border: 1px solid #dadce0; border-radius: 4px; font-family: 'Roboto', sans-serif; font-size: 14px; resize: vertical; }
        .answer-textarea:focus { outline: none; border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
        .save-indicator { position: absolute; bottom: 12px; right: 24px; font-size: 12px; color: #5f6368; display: flex; align-items: center; gap: 8px; }
        .assessment-footer { background: white; border-radius: 8px; padding: 20px 24px; margin-top: 24px; margin-bottom: 40px; box-shadow: 0 -1px 2px 0 rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; position: sticky; bottom: 0; z-index: 100; }
        .btn-submit { background: #1a73e8; color: white; border: none; padding: 10px 32px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-submit:hover { background: #1557b0; }
        .timer-container { position: fixed; top: 80px; right: 20px; z-index: 999; background: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); text-align: center; min-width: 150px; }
        .timer-value { font-size: 24px; font-weight: 500; font-family: monospace; color: #202124; }
        .timer-warning { color: #d93025; }
        .question-nav { position: fixed; left: 20px; top: 50%; transform: translateY(-50%); background: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-height: 80vh; overflow-y: auto; z-index: 100; }
        .nav-question { width: 40px; height: 40px; margin: 4px; border-radius: 50%; border: 1px solid #dadce0; background: white; cursor: pointer; font-size: 12px; font-weight: 500; }
        .nav-question.answered { background: #34a853; color: white; border-color: #34a853; }
        .modal-custom { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; }
        .modal-content { background: white; border-radius: 8px; max-width: 500px; width: 90%; padding: 24px; }
        @media (max-width: 768px) { .question-nav { display: none; } .timer-container { position: static; margin-bottom: 20px; } .assessment-header { margin-top: 20px; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .question-card { animation: fadeIn 0.3s ease; }
    </style>
</head>
<body>
    <div class="progress-container">
        <div class="progress-bar-custom" id="progressBar"></div>
    </div>
    
    <div class="timer-container">
        <div class="timer-label">Time Remaining</div>
        <div class="timer-value" id="timer">--:--:--</div>
    </div>
    
    <div class="question-nav" id="questionNav"></div>
    
    <div class="container" style="max-width: 800px;">
        <div class="assessment-header">
            <h1 class="assessment-title"><?php echo htmlspecialchars($assessment['title']); ?></h1>
            <p class="assessment-description"><?php echo nl2br(htmlspecialchars($assessment['description'] ?? '')); ?></p>
            <hr class="my-3">
            <div class="row text-center">
                <div class="col-sm-4"><small><i class="fas fa-star"></i> Total: <?php echo $total_marks; ?> marks</small></div>
                <div class="col-sm-4"><small><i class="fas fa-check-circle"></i> Passing: <?php echo $assessment['passing_marks']; ?> marks</small></div>
                <div class="col-sm-4"><small><i class="fas fa-clock"></i> Duration: <?php echo $time_limit ?: 'No limit'; ?> min</small></div>
            </div>
            <div class="mt-3">
                <small><i class="fas fa-user"></i> <strong>Student:</strong> <?php echo htmlspecialchars($student['firstname'] . ' ' . $student['lastname']); ?></small>
                <small class="ms-3"><i class="fas fa-chalkboard"></i> <strong>Class:</strong> <?php echo htmlspecialchars($student['class_name'] ?: 'Not Assigned'); ?></small>
            </div>
            <?php if(!empty($assessment['instructions'])): ?>
                <div class="alert alert-info mt-3"><i class="fas fa-info-circle"></i> <?php echo nl2br(htmlspecialchars($assessment['instructions'])); ?></div>
            <?php endif; ?>
        </div>
        
        <form id="assessmentForm">
            <div id="questionsContainer"></div>
        </form>
        
        <div class="assessment-footer">
            <div><i class="fas fa-save"></i> <span id="saveStatus">All changes saved</span></div>
            <div><button type="button" class="btn-submit" onclick="submitAssessment()"><i class="fas fa-paper-plane"></i> Submit</button></div>
        </div>
    </div>
    
    <div id="confirmModal" class="modal-custom">
        <div class="modal-content">
            <h3>Submit Assessment?</h3>
            <p id="unansweredWarning"></p>
            <div class="mt-3"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button> <button class="btn btn-primary" onclick="confirmSubmit()">Submit</button></div>
        </div>
    </div>
    
    <div id="successModal" class="modal-custom">
        <div class="modal-content">
            <div class="text-center">
                <i class="fas fa-check-circle" style="font-size: 64px; color: #34a853;"></i>
                <h3 class="mt-3" id="successMessage"></h3>
                <p id="scoreDisplay"></p>
                <button class="btn btn-primary mt-3" onclick="redirectToDashboard()">Go to Dashboard</button>
            </div>
        </div>
    </div>
    
    <script>
        const assessmentId = <?php echo $assessment_id; ?>;
        const attemptId = <?php echo $attempt_id; ?>;
        const totalQuestions = <?php echo $total_questions; ?>;
        const totalMarks = <?php echo $total_marks; ?>;
        const timeLimit = <?php echo $time_limit ? $time_limit * 60 : 0; ?>;
        const endDateTime = '<?php echo $end_time_js; ?>';
        
        let questions = <?php echo json_encode($questions); ?>;
        let answers = {};
        let answeredStatus = new Array(totalQuestions).fill(false);
        let timerInterval = null;
        
        // Debug: Log questions to console
        console.log('Questions loaded:', questions);
        
        questions.forEach((question, index) => {
            const answer = question.saved_answer || question.autosave_answer;
            if (answer && answer !== '') {
                answers[question.question_id] = answer;
                answeredStatus[index] = true;
            }
        });
        
        function renderQuestions() {
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';
            
            questions.forEach((question, index) => {
                const div = document.createElement('div');
                div.className = 'question-card';
                div.id = `question-${index}`;
                
                const header = document.createElement('div');
                header.className = 'question-header';
                header.innerHTML = `
                    <div><span class="question-text">Question ${index + 1}. ${escapeHtml(question.question_text)}${question.required ? '<span class="required-badge">*</span>' : ''}</span></div>
                    <div><span class="marks-badge">${question.marks} marks</span></div>
                `;
                
                const body = document.createElement('div');
                body.className = 'question-body';
                
                const inputElement = createInputElement(question, index);
                body.appendChild(inputElement);
                
                const saveIndicator = document.createElement('div');
                saveIndicator.className = 'save-indicator';
                saveIndicator.id = `save-indicator-${question.question_id}`;
                saveIndicator.innerHTML = '<i class="fas fa-check saved-icon" style="display: none;"></i> <span>Saved</span>';
                body.appendChild(saveIndicator);
                
                div.appendChild(header);
                div.appendChild(body);
                container.appendChild(div);
            });
            
            updateProgress();
            createNavigation();
        }
        
        function createInputElement(question, index) {
            const currentAnswer = answers[question.question_id] || '';
            
            // Multiple Choice Single Answer
            if (question.question_type === 'multiple_choice_single') {
                const div = document.createElement('div');
                const options = ['A', 'B', 'C', 'D', 'E'];
                let hasOptions = false;
                
                options.forEach(opt => {
                    const optKey = `option_${opt.toLowerCase()}`;
                    if (question[optKey] && question[optKey].trim() !== '') {
                        hasOptions = true;
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.className = 'option-input';
                        radio.name = `q_${question.question_id}`;
                        radio.value = opt;
                        radio.checked = (currentAnswer === opt);
                        radio.onchange = () => handleAnswerChange(question.question_id, opt, index);
                        
                        const label = document.createElement('label');
                        label.className = 'option-label';
                        label.innerHTML = `<strong>${opt}.</strong> ${escapeHtml(question[optKey])}`;
                        
                        optionDiv.appendChild(radio);
                        optionDiv.appendChild(label);
                        div.appendChild(optionDiv);
                    }
                });
                
                if (!hasOptions) {
                    div.innerHTML = '<div class="alert alert-warning">No options available for this question. Please contact your teacher.</div>';
                }
                return div;
            }
            
            // Multiple Choice Multiple Answer (Checkboxes)
            else if (question.question_type === 'multiple_choice_multiple') {
                const div = document.createElement('div');
                const options = ['A', 'B', 'C', 'D', 'E'];
                const selectedAnswers = currentAnswer ? (Array.isArray(currentAnswer) ? currentAnswer : currentAnswer.split(',')) : [];
                let hasOptions = false;
                
                options.forEach(opt => {
                    const optKey = `option_${opt.toLowerCase()}`;
                    if (question[optKey] && question[optKey].trim() !== '') {
                        hasOptions = true;
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'option-input';
                        checkbox.name = `q_${question.question_id}[]`;
                        checkbox.value = opt;
                        checkbox.checked = selectedAnswers.includes(opt);
                        checkbox.onchange = () => {
                            const checkboxes = document.querySelectorAll(`input[name="q_${question.question_id}[]"]:checked`);
                            const values = Array.from(checkboxes).map(cb => cb.value);
                            handleAnswerChange(question.question_id, values, index);
                        };
                        
                        const label = document.createElement('label');
                        label.className = 'option-label';
                        label.innerHTML = `<strong>${opt}.</strong> ${escapeHtml(question[optKey])}`;
                        
                        optionDiv.appendChild(checkbox);
                        optionDiv.appendChild(label);
                        div.appendChild(optionDiv);
                    }
                });
                
                if (!hasOptions) {
                    div.innerHTML = '<div class="alert alert-warning">No options available for this question. Please contact your teacher.</div>';
                }
                return div;
            }
            
            // True/False
            else if (question.question_type === 'true_false') {
                const div = document.createElement('div');
                ['True', 'False'].forEach(value => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option-item';
                    
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.className = 'option-input';
                    radio.name = `q_${question.question_id}`;
                    radio.value = value;
                    radio.checked = (currentAnswer === value);
                    radio.onchange = () => handleAnswerChange(question.question_id, value, index);
                    
                    const label = document.createElement('label');
                    label.className = 'option-label';
                    label.innerHTML = value === 'True' ? ' True' : 'False';
                    
                    optionDiv.appendChild(radio);
                    optionDiv.appendChild(label);
                    div.appendChild(optionDiv);
                });
                return div;
            }
            
            // Short Answer or Essay
            else {
                const textarea = document.createElement('textarea');
                textarea.className = 'answer-textarea';
                textarea.rows = question.question_type === 'essay' ? 6 : 3;
                textarea.placeholder = question.question_type === 'essay' ? 'Write your essay here...' : 'Type your answer here...';
                textarea.value = currentAnswer;
                textarea.oninput = (e) => handleAnswerChange(question.question_id, e.target.value, index);
                return textarea;
            }
        }
        
        let autosaveTimeout = null;
        
        function handleAnswerChange(questionId, value, index) {
            answers[questionId] = value;
            answeredStatus[index] = value && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
            updateProgress();
            showSaveIndicator(questionId, 'saving');
            
            if (autosaveTimeout) clearTimeout(autosaveTimeout);
            autosaveTimeout = setTimeout(() => {
                autosaveAnswer(questionId, value);
            }, 1000);
        }
        
        function autosaveAnswer(questionId, value) {
            const answerValue = Array.isArray(value) ? value.join(',') : value;
            fetch(window.location.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=autosave&question_id=${questionId}&answer=${encodeURIComponent(answerValue)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) showSaveIndicator(questionId, 'saved');
            })
            .catch(error => console.error('Autosave error:', error));
        }
        
        function showSaveIndicator(questionId, status) {
            const indicator = document.getElementById(`save-indicator-${questionId}`);
            if (!indicator) return;
            
            if (status === 'saving') {
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Saving...</span>';
            } else if (status === 'saved') {
                indicator.innerHTML = '<i class="fas fa-check saved-icon"></i> <span>Saved</span>';
                setTimeout(() => indicator.style.opacity = '0.5', 1000);
                setTimeout(() => indicator.style.opacity = '1', 1500);
            }
        }
        
        function updateProgress() {
            const answeredCount = answeredStatus.filter(s => s === true).length;
            const percentage = (answeredCount / totalQuestions) * 100;
            document.getElementById('progressBar').style.width = `${percentage}%`;
            updateNavigation();
        }
        
        function createNavigation() {
            const nav = document.getElementById('questionNav');
            if (!nav || totalQuestions === 0) return;
            nav.innerHTML = '<h6 style="text-align:center;margin-bottom:10px;">Questions</h6>';
            
            for (let i = 0; i < totalQuestions; i++) {
                const btn = document.createElement('button');
                btn.textContent = i + 1;
                btn.className = 'nav-question';
                if (answeredStatus[i]) btn.classList.add('answered');
                btn.onclick = () => document.getElementById(`question-${i}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
                nav.appendChild(btn);
            }
        }
        
        function updateNavigation() {
            const btns = document.querySelectorAll('.nav-question');
            btns.forEach((btn, i) => {
                if (answeredStatus[i]) btn.classList.add('answered');
                else btn.classList.remove('answered');
            });
        }
        
        function startTimer() {
            const endDateTimeObj = new Date(endDateTime);
            timerInterval = setInterval(() => {
                const now = new Date();
                const diff = endDateTimeObj - now;
                
                if (diff <= 0) {
                    clearInterval(timerInterval);
                    document.getElementById('timer').innerHTML = '00:00:00';
                    alert('Time is up! Submitting...');
                    submitAssessment();
                    return;
                }
                
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                document.getElementById('timer').innerHTML = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
                
                if (minutes < 5 && hours === 0) {
                    document.getElementById('timer').classList.add('timer-warning');
                }
            }, 1000);
        }
        
        function submitAssessment() {
            if (totalQuestions === 0) {
                alert('No questions available for this assessment.');
                return;
            }
            const unanswered = answeredStatus.filter(s => s === false).length;
            if (unanswered > 0) {
                document.getElementById('unansweredWarning').innerHTML = `You have ${unanswered} unanswered question(s). Submit anyway?`;
                document.getElementById('confirmModal').style.display = 'flex';
            } else {
                confirmSubmit();
            }
        }
        
        function confirmSubmit() {
            closeModal();
            fetch(window.location.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=submit&answers=${encodeURIComponent(JSON.stringify(Object.entries(answers).map(([qid, a]) => ({question_id: qid, answer: a}))))}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('successMessage').textContent = data.message;
                    document.getElementById('scoreDisplay').innerHTML = `Score: ${data.score}/${data.total}<br>Percentage: ${data.percentage}%<br>Grade: ${data.grade}`;
                    document.getElementById('successModal').style.display = 'flex';
                    if (timerInterval) clearInterval(timerInterval);
                } else {
                    alert('Submission failed: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Submission error:', error);
                alert('Failed to submit assessment.');
            });
        }
        
        function closeModal() {
            document.getElementById('confirmModal').style.display = 'none';
            document.getElementById('successModal').style.display = 'none';
        }
        
        function redirectToDashboard() {
            window.location.href = 'student_assessments.php';  
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text; 
            return div.innerHTML;
        }
        
        if (totalQuestions > 0) {
            renderQuestions();
            startTimer();
        } else {
            document.getElementById('questionsContainer').innerHTML = '<div class="alert alert-warning">No questions available for this assessment. Please contact your teacher.</div>';
            document.getElementById('timer').innerHTML = '00:00:00';
        }
    </script>
</body>
</html>