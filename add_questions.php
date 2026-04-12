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

$assessment_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

$assessment_query = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE a.assessment_id = '$assessment_id' AND a.tid = '$tid'
");

if (mysqli_num_rows($assessment_query) == 0) {
    header("location:create_assessment.php");
    exit();
}

$assessment = mysqli_fetch_assoc($assessment_query);

// ========== HANDLE SINGLE QUESTION SAVE (DIRECT FORM) ==========
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['save_single_question'])) {
    $question_type = mysqli_real_escape_string($conn, $_POST['question_type']);
    $question_text = mysqli_real_escape_string($conn, $_POST['question_text']);
    $marks = floatval($_POST['marks']);
    $required = isset($_POST['required']) ? 1 : 0;
    
    $option_a = mysqli_real_escape_string($conn, $_POST['option_a'] ?? '');
    $option_b = mysqli_real_escape_string($conn, $_POST['option_b'] ?? '');
    $option_c = mysqli_real_escape_string($conn, $_POST['option_c'] ?? '');
    $option_d = mysqli_real_escape_string($conn, $_POST['option_d'] ?? '');
    $option_e = mysqli_real_escape_string($conn, $_POST['option_e'] ?? '');
    
    $correct_answer = '';
    if ($question_type == 'multiple_choice_single') {
        $correct_answer = mysqli_real_escape_string($conn, $_POST['correct_answer_single'] ?? '');
    } elseif ($question_type == 'multiple_choice_multiple') {
        $correct_answers = isset($_POST['correct_answers']) ? $_POST['correct_answers'] : [];
        $correct_answer = implode(',', $correct_answers);
    } elseif ($question_type == 'true_false') {
        $correct_answer = mysqli_real_escape_string($conn, $_POST['correct_answer_tf'] ?? 'True');
    } elseif ($question_type == 'short_answer') {
        $correct_answer = mysqli_real_escape_string($conn, $_POST['correct_answer_short'] ?? '');
    } elseif ($question_type == 'essay') {
        $correct_answer = mysqli_real_escape_string($conn, $_POST['model_answer'] ?? '');
    }
    
    $points_per_answer = isset($_POST['points_per_answer']) ? intval($_POST['points_per_answer']) : 1;
    
    // Get max display_order
    $max_order_query = mysqli_query($conn, "SELECT COALESCE(MAX(display_order), 0) + 1 as new_order FROM assessment_questions WHERE assessment_id = '$assessment_id'");
    $max_order = mysqli_fetch_assoc($max_order_query);
    $display_order = $max_order['new_order'];
    
    $query = "INSERT INTO assessment_questions (
        assessment_id, question_type, question_text, marks, required,
        option_a, option_b, option_c, option_d, option_e, 
        correct_answer, points_per_answer, display_order
    ) VALUES (
        '$assessment_id', '$question_type', '$question_text', '$marks', '$required',
        '$option_a', '$option_b', '$option_c', '$option_d', '$option_e',
        '$correct_answer', '$points_per_answer', '$display_order'
    )";
    
    if (mysqli_query($conn, $query)) {
        header("location:add_questions.php?id=$assessment_id&msg=added");
        exit();
    } else {
        $error = "Database Error: " . mysqli_error($conn);
    }
}

// ========== HANDLE BULK SAVE QUESTIONS ==========
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['bulk_save'])) {
    $questions_data = json_decode($_POST['questions_json'], true);
    $success_count = 0;
    
    // Get current max display_order
    $max_order_query = mysqli_query($conn, "SELECT COALESCE(MAX(display_order), 0) as max_order FROM assessment_questions WHERE assessment_id = '$assessment_id'");
    $max_order = mysqli_fetch_assoc($max_order_query);
    $current_order = $max_order['max_order'];
    
    foreach ($questions_data as $index => $question_data) {
        $question_type = mysqli_real_escape_string($conn, $question_data['question_type']);
        $question_text = mysqli_real_escape_string($conn, $question_data['question_text']);
        $marks = floatval($question_data['marks']);
        $required = isset($question_data['required']) ? 1 : 0;
        $points_per_answer = isset($question_data['points_per_answer']) ? intval($question_data['points_per_answer']) : 1;
        
        $option_a = mysqli_real_escape_string($conn, $question_data['option_a'] ?? '');
        $option_b = mysqli_real_escape_string($conn, $question_data['option_b'] ?? '');
        $option_c = mysqli_real_escape_string($conn, $question_data['option_c'] ?? '');
        $option_d = mysqli_real_escape_string($conn, $question_data['option_d'] ?? '');
        $option_e = mysqli_real_escape_string($conn, $question_data['option_e'] ?? '');
        
        $correct_answer = '';
        if ($question_type == 'multiple_choice_single') {
            $correct_answer = mysqli_real_escape_string($conn, $question_data['correct_answer'] ?? '');
        } elseif ($question_type == 'multiple_choice_multiple') {
            $correct_answers = $question_data['correct_answers'] ?? [];
            $correct_answer = implode(',', $correct_answers);
        } elseif ($question_type == 'true_false') {
            $correct_answer = mysqli_real_escape_string($conn, $question_data['correct_answer'] ?? 'True');
        } else {
            $correct_answer = mysqli_real_escape_string($conn, $question_data['correct_answer'] ?? '');
        }
        
        $current_order++;
        $display_order = $current_order;
        
        $query = "INSERT INTO assessment_questions (
            assessment_id, question_type, question_text, marks, required,
            option_a, option_b, option_c, option_d, option_e, 
            correct_answer, points_per_answer, display_order
        ) VALUES (
            '$assessment_id', '$question_type', '$question_text', '$marks', '$required',
            '$option_a', '$option_b', '$option_c', '$option_d', '$option_e',
            '$correct_answer', '$points_per_answer', '$display_order'
        )";
        
        if (mysqli_query($conn, $query)) {
            $success_count++;
        } else {
            $error = "Failed on question " . ($index+1) . ": " . mysqli_error($conn);
        }
    }
    
    if ($success_count > 0) {
        header("location:add_questions.php?id=$assessment_id&msg=bulk_added&count=$success_count");
        exit();
    } elseif (isset($error)) {
        $error_msg = $error;
    }
}

// ========== HANDLE DELETE QUESTION ==========
if (isset($_GET['delete'])) {
    $delete_id = intval($_GET['delete']);
    mysqli_query($conn, "DELETE FROM assessment_questions WHERE question_id = '$delete_id' AND assessment_id = '$assessment_id'");
    header("location:add_questions.php?id=$assessment_id&msg=deleted");
    exit();
}

// ========== HANDLE PUBLISH ASSESSMENT ==========
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['publish_assessment'])) {
    mysqli_query($conn, "UPDATE assessments SET status = 'published' WHERE assessment_id = '$assessment_id'");
    header("location:add_questions.php?id=$assessment_id&msg=published");
    exit();
}

// ========== GET ALL QUESTIONS ==========
$questions_result = mysqli_query($conn, "SELECT * FROM assessment_questions WHERE assessment_id = '$assessment_id' ORDER BY display_order ASC, question_id ASC");
$questions = [];
while ($q = mysqli_fetch_assoc($questions_result)) {
    $questions[] = $q;
}
$total_questions = count($questions);
$total_marks_so_far = array_sum(array_column($questions, 'marks'));
$remaining_marks = $assessment['total_marks'] - $total_marks_so_far;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Questions - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        .container-custom { max-width: 1200px; margin: 0 auto; }
        .header-card { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); }
        .stats-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .stat-number { font-size: 32px; font-weight: bold; }
        .question-card { background: white; border-radius: 8px; margin-bottom: 16px; padding: 20px; border-left: 4px solid #1a73e8; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); }
        .type-badge { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
        .badge-mc { background: #e8f0fe; color: #1a73e8; }
        .badge-mc-multi { background: #f3e8fd; color: #9334e6; }
        .badge-tf { background: #e6f4ea; color: #34a853; }
        .badge-short { background: #fef7e0; color: #f9ab00; }
        .badge-essay { background: #fce8e6; color: #d93025; }
        .single-form-container { background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); }
        .option-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
        .option-row input { flex: 1; }
        .btn-save { background: #1a73e8; color: white; padding: 12px 30px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-save:hover { background: #1557b0; }
        .progress-bar-custom { height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; margin-top: 10px; }
        .progress-fill { height: 100%; background: #34a853; border-radius: 4px; width: 0%; }
        .checkbox-group { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container-custom">
        <!-- Header -->
        <div class="header-card">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2><?php echo htmlspecialchars($assessment['title']); ?></h2>
                    <p class="text-muted mb-0">Class: <?php echo htmlspecialchars($assessment['class_name']); ?></p>
                </div>
                <div>
                    <a href="create_assessment.php" class="btn btn-outline-secondary me-2"><i class="fas fa-plus"></i> New Assessment</a>
                    <a href="teacher_dashboard.php" class="btn btn-outline-secondary"><i class="fas fa-arrow-left"></i> Dashboard</a>
                </div>
            </div>
        </div>
        
        <!-- Stats Card -->
        <div class="stats-card">
            <div class="row text-center">
                <div class="col-md-4">
                    <div class="stat-number"><?php echo $total_questions; ?></div>
                    <div>Questions</div>
                </div>
                <div class="col-md-4">
                    <div class="stat-number"><?php echo $total_marks_so_far; ?> / <?php echo $assessment['total_marks']; ?></div>
                    <div>Total Marks</div>
                    <div class="progress-bar-custom"><div class="progress-fill" style="width: <?php echo ($total_marks_so_far / $assessment['total_marks']) * 100; ?>%"></div></div>
                </div>
                <div class="col-md-4">
                    <div class="stat-number"><?php echo $remaining_marks; ?></div>
                    <div>Remaining Marks</div>
                </div>
            </div>
        </div>
        
        <?php if (isset($_GET['msg'])): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <?php 
                    if ($_GET['msg'] == 'added') echo "✓ Question added successfully!";
                    if ($_GET['msg'] == 'deleted') echo "✓ Question deleted successfully!";
                    if ($_GET['msg'] == 'published') echo "✓ Assessment published successfully!";
                    if ($_GET['msg'] == 'bulk_added') echo "✓ " . $_GET['count'] . " questions added successfully!";
                ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if (isset($error_msg)): ?>
            <div class="alert alert-danger"><?php echo $error_msg; ?></div>
        <?php endif; ?>
        
        <!-- Single Question Form (Simplified & Guaranteed to Work) -->
        <div class="single-form-container">
            <h4 class="mb-3"><i class="fas fa-plus-circle"></i> Add Single Question</h4>
            <form method="POST">
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Question Type</label>
                        <select name="question_type" id="questionType" class="form-select" required onchange="toggleQuestionFields()">
                            <option value="multiple_choice_single">Multiple Choice (Single Answer)</option>
                            <option value="multiple_choice_multiple">Multiple Choice (Multiple Answers)</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="essay">Essay</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Marks</label>
                        <input type="number" name="marks" class="form-control" required min="1" value="5">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label"><input type="checkbox" name="required" value="1" checked> Required</label>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Question Text</label>
                    <textarea name="question_text" class="form-control" rows="3" required placeholder="Enter your question..."></textarea>
                </div>
                
                <!-- Multiple Choice Single -->
                <div id="mcSingleSection">
                    <div class="mb-3">
                        <label>Options</label>
                        <div class="option-row"><span style="width:30px;">A.</span><input type="text" name="option_a" class="form-control" placeholder="Option A"></div>
                        <div class="option-row"><span style="width:30px;">B.</span><input type="text" name="option_b" class="form-control" placeholder="Option B"></div>
                        <div class="option-row"><span style="width:30px;">C.</span><input type="text" name="option_c" class="form-control" placeholder="Option C"></div>
                        <div class="option-row"><span style="width:30px;">D.</span><input type="text" name="option_d" class="form-control" placeholder="Option D"></div>
                    </div>
                    <div class="mb-3">
                        <label>Correct Answer</label>
                        <select name="correct_answer_single" class="form-select">
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                        </select>
                    </div>
                </div>
                
                <!-- Multiple Choice Multiple -->
                <div id="mcMultipleSection" style="display:none;">
                    <div class="mb-3">
                        <label>Options</label>
                        <div class="option-row"><span style="width:30px;">A.</span><input type="text" name="option_a" class="form-control" placeholder="Option A"></div>
                        <div class="option-row"><span style="width:30px;">B.</span><input type="text" name="option_b" class="form-control" placeholder="Option B"></div>
                        <div class="option-row"><span style="width:30px;">C.</span><input type="text" name="option_c" class="form-control" placeholder="Option C"></div>
                        <div class="option-row"><span style="width:30px;">D.</span><input type="text" name="option_d" class="form-control" placeholder="Option D"></div>
                    </div>
                    <div class="mb-3">
                        <label>Correct Answers (Select all that apply)</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" name="correct_answers[]" value="A"> Option A</label>
                            <label><input type="checkbox" name="correct_answers[]" value="B"> Option B</label>
                            <label><input type="checkbox" name="correct_answers[]" value="C"> Option C</label>
                            <label><input type="checkbox" name="correct_answers[]" value="D"> Option D</label>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label>Points per correct answer</label>
                        <input type="number" name="points_per_answer" class="form-control" value="1" min="1">
                    </div>
                </div>
                
                <!-- True/False -->
                <div id="tfSection" style="display:none;">
                    <div class="mb-3">
                        <label>Correct Answer</label>
                        <select name="correct_answer_tf" class="form-select">
                            <option value="True">True</option>
                            <option value="False">False</option>
                        </select>
                    </div>
                </div>
                
                <!-- Short Answer -->
                <div id="shortSection" style="display:none;">
                    <div class="mb-3">
                        <label>Expected Answer</label>
                        <textarea name="correct_answer_short" class="form-control" rows="2" placeholder="Enter expected answer"></textarea>
                    </div>
                </div>
                
                <!-- Essay -->
                <div id="essaySection" style="display:none;">
                    <div class="mb-3">
                        <label>Model Answer / Rubric</label>
                        <textarea name="model_answer" class="form-control" rows="3" placeholder="Enter model answer"></textarea>
                    </div>
                </div>
                
                <button type="submit" name="save_single_question" class="btn-save">
                    <i class="fas fa-save"></i> Add Question
                </button>
            </form>
        </div>
        
        <!-- Existing Questions List -->
        <h5 class="mb-3"><i class="fas fa-list"></i> Existing Questions (<?php echo $total_questions; ?> questions, <?php echo $total_marks_so_far; ?> marks)</h5>
        
        <?php if ($total_questions > 0): ?>
            <?php foreach ($questions as $index => $q): ?>
                <div class="question-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div style="flex: 1;">
                            <div class="mb-2">
                                <?php
                                $badge_class = 'badge-mc';
                                $type_label = 'Multiple Choice';
                                if ($q['question_type'] == 'multiple_choice_multiple') { $badge_class = 'badge-mc-multi'; $type_label = 'Multiple Answer'; }
                                elseif ($q['question_type'] == 'true_false') { $badge_class = 'badge-tf'; $type_label = 'True/False'; }
                                elseif ($q['question_type'] == 'short_answer') { $badge_class = 'badge-short'; $type_label = 'Short Answer'; }
                                elseif ($q['question_type'] == 'essay') { $badge_class = 'badge-essay'; $type_label = 'Essay'; }
                                ?>
                                <span class="type-badge <?php echo $badge_class; ?>"><?php echo $type_label; ?></span>
                                <span class="badge bg-secondary ms-2"><?php echo $q['marks']; ?> marks</span>
                            </div>
                            <p><strong><?php echo ($index + 1) . '. ' . htmlspecialchars($q['question_text']); ?></strong></p>
                            <?php if (!empty($q['option_a'])): ?>
                                <div class="ms-4 mt-2">
                                    <div><strong>A.</strong> <?php echo htmlspecialchars($q['option_a']); ?></div>
                                    <?php if (!empty($q['option_b'])): ?><div><strong>B.</strong> <?php echo htmlspecialchars($q['option_b']); ?></div><?php endif; ?>
                                    <?php if (!empty($q['option_c'])): ?><div><strong>C.</strong> <?php echo htmlspecialchars($q['option_c']); ?></div><?php endif; ?>
                                    <?php if (!empty($q['option_d'])): ?><div><strong>D.</strong> <?php echo htmlspecialchars($q['option_d']); ?></div><?php endif; ?>
                                </div>
                            <?php endif; ?>
                            <div class="badge bg-light text-dark mt-2"><i class="fas fa-check-circle text-success"></i> Correct: <?php echo $q['correct_answer']; ?></div>
                        </div>
                        <div>
                            <a href="?id=<?php echo $assessment_id; ?>&delete=<?php echo $q['question_id']; ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Delete this question?')"><i class="fas fa-trash"></i></a>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="alert alert-info">No questions yet. Add your first question using the form above.</div>
        <?php endif; ?>
        
        <!-- Publish Section -->
        <?php if ($assessment['status'] != 'published'): ?>
            <div class="text-center mt-4">
                <?php if ($remaining_marks == 0 && $total_questions > 0): ?>
                    <form method="POST">
                        <button type="submit" name="publish_assessment" class="btn btn-success btn-lg px-5" onclick="return confirm('Publish this assessment?')">
                            <i class="fas fa-globe"></i> Publish Assessment
                        </button>
                    </form>
                <?php else: ?>
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <?php if ($total_questions == 0): ?>
                            Please add at least one question before publishing.
                        <?php elseif ($remaining_marks > 0): ?>
                            Total marks (<?php echo $total_marks_so_far; ?>) is less than required (<?php echo $assessment['total_marks']; ?>). 
                            Add <?php echo $remaining_marks; ?> more marks to publish.
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="alert alert-info text-center">Assessment is published. Students can now take it.</div>
        <?php endif; ?>
    </div>
    
    <script>
        function toggleQuestionFields() {
            const type = document.getElementById('questionType').value;
            document.getElementById('mcSingleSection').style.display = 'none';   
            document.getElementById('mcMultipleSection').style.display = 'none'; 
            document.getElementById('tfSection').style.display = 'none';
            document.getElementById('shortSection').style.display = 'none';
            document.getElementById('essaySection').style.display = 'none';
            
            if (type === 'multiple_choice_single') document.getElementById('mcSingleSection').style.display = 'block';
            else if (type === 'multiple_choice_multiple') document.getElementById('mcMultipleSection').style.display = 'block';
            else if (type === 'true_false') document.getElementById('tfSection').style.display = 'block';
            else if (type === 'short_answer') document.getElementById('shortSection').style.display = 'block';
            else if (type === 'essay') document.getElementById('essaySection').style.display = 'block';
        }
        toggleQuestionFields();
    </script>
</body>
</html>