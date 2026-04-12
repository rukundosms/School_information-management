<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['tcode'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated. Please login again.']);
    exit();
}

$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);
$teacher_query = mysqli_query($conn, "SELECT tid FROM teacher WHERE tcode='$tcode'");
if (!$teacher_query || mysqli_num_rows($teacher_query) == 0) {
    echo json_encode(['success' => false, 'message' => 'Teacher not found.']);
    exit();
}
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

$action = isset($_POST['action']) ? $_POST['action'] : '';

if ($action == 'add_question') {
    // Get form data
    $assessment_id = isset($_POST['assessment_id']) ? intval($_POST['assessment_id']) : 0;
    $question_type = isset($_POST['question_type']) ? mysqli_real_escape_string($conn, $_POST['question_type']) : '';
    $question_text = isset($_POST['question_text']) ? mysqli_real_escape_string($conn, $_POST['question_text']) : '';
    $marks = isset($_POST['marks']) ? floatval($_POST['marks']) : 0;
    $required = isset($_POST['required']) ? 1 : 0;
    $points = isset($_POST['points']) ? intval($_POST['points']) : 1;
    
    // Get options
    $option_a = isset($_POST['option_a']) ? mysqli_real_escape_string($conn, $_POST['option_a']) : '';
    $option_b = isset($_POST['option_b']) ? mysqli_real_escape_string($conn, $_POST['option_b']) : '';
    $option_c = isset($_POST['option_c']) ? mysqli_real_escape_string($conn, $_POST['option_c']) : '';
    $option_d = isset($_POST['option_d']) ? mysqli_real_escape_string($conn, $_POST['option_d']) : '';
    $option_e = isset($_POST['option_e']) ? mysqli_real_escape_string($conn, $_POST['option_e']) : '';
    
    // Get correct answer based on question type
    $correct_answer = '';
    if ($question_type == 'multiple_choice_single') {
        $correct_answer = isset($_POST['correct_answer_single']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_single']) : '';
    } elseif ($question_type == 'multiple_choice_multiple') {
        $correct_answers = isset($_POST['correct_answers']) ? $_POST['correct_answers'] : [];
        $correct_answer = implode(',', $correct_answers);
    } elseif ($question_type == 'true_false') {
        $correct_answer = isset($_POST['correct_answer_tf']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_tf']) : 'True';
    } elseif ($question_type == 'short_answer') {
        $correct_answer = isset($_POST['correct_answer_short']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_short']) : '';
    } elseif ($question_type == 'essay') {
        $correct_answer = isset($_POST['model_answer']) ? mysqli_real_escape_string($conn, $_POST['model_answer']) : '';
    }
    
    // Validate required fields
    if (empty($assessment_id) || empty($question_type) || empty($question_text) || $marks <= 0) {
        echo json_encode(['success' => false, 'message' => 'Please fill all required fields']);
        exit();
    }
    
    // Handle image upload
    $image_url = '';
    if (isset($_FILES['question_image']) && $_FILES['question_image']['error'] == 0) {
        $upload_dir = 'uploads/questions/';
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $ext = strtolower(pathinfo($_FILES['question_image']['name'], PATHINFO_EXTENSION));
        
        if (in_array($ext, $allowed)) {
            $filename = 'q_' . time() . '_' . uniqid() . '.' . $ext;
            $destination = $upload_dir . $filename;
            
            if (move_uploaded_file($_FILES['question_image']['tmp_name'], $destination)) {
                $image_url = $destination;
            }
        }
    }
    
    // Check if display_order column exists
    $check_column = mysqli_query($conn, "SHOW COLUMNS FROM assessment_questions LIKE 'display_order'");
    $has_display_order = mysqli_num_rows($check_column) > 0;
    
    if ($has_display_order) {
        $max_order_query = mysqli_query($conn, "SELECT COALESCE(MAX(display_order), 0) + 1 as new_order FROM assessment_questions WHERE assessment_id = '$assessment_id'");
        $max_order = mysqli_fetch_assoc($max_order_query);
        $display_order = $max_order['new_order'];
        
        $insert = mysqli_query($conn, "
            INSERT INTO assessment_questions (
                assessment_id, question_type, question_text, 
                option_a, option_b, option_c, option_d, option_e, 
                correct_answer, marks, required, points_per_answer, 
                image_url, display_order
            ) VALUES (
                '$assessment_id', '$question_type', '$question_text', 
                '$option_a', '$option_b', '$option_c', '$option_d', '$option_e', 
                '$correct_answer', '$marks', '$required', '$points', 
                '$image_url', '$display_order'
            )
        ");
    } else {
        $insert = mysqli_query($conn, "
            INSERT INTO assessment_questions (
                assessment_id, question_type, question_text, 
                option_a, option_b, option_c, option_d, option_e, 
                correct_answer, marks, required, points_per_answer, 
                image_url
            ) VALUES (
                '$assessment_id', '$question_type', '$question_text', 
                '$option_a', '$option_b', '$option_c', '$option_d', '$option_e', 
                '$correct_answer', '$marks', '$required', '$points', 
                '$image_url'
            )
        ");
    }
    
    if ($insert) {
        echo json_encode(['success' => true, 'message' => 'Question added successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . mysqli_error($conn)]);
    }
    
} elseif ($action == 'edit_question') {
    $question_id = isset($_POST['question_id']) ? intval($_POST['question_id']) : 0;
    $assessment_id = isset($_POST['assessment_id']) ? intval($_POST['assessment_id']) : 0;
    $question_type = isset($_POST['question_type']) ? mysqli_real_escape_string($conn, $_POST['question_type']) : '';
    $question_text = isset($_POST['question_text']) ? mysqli_real_escape_string($conn, $_POST['question_text']) : '';
    $marks = isset($_POST['marks']) ? floatval($_POST['marks']) : 0;
    $required = isset($_POST['required']) ? 1 : 0;
    $points = isset($_POST['points']) ? intval($_POST['points']) : 1;
    
    $option_a = isset($_POST['option_a']) ? mysqli_real_escape_string($conn, $_POST['option_a']) : '';
    $option_b = isset($_POST['option_b']) ? mysqli_real_escape_string($conn, $_POST['option_b']) : '';
    $option_c = isset($_POST['option_c']) ? mysqli_real_escape_string($conn, $_POST['option_c']) : '';
    $option_d = isset($_POST['option_d']) ? mysqli_real_escape_string($conn, $_POST['option_d']) : '';
    $option_e = isset($_POST['option_e']) ? mysqli_real_escape_string($conn, $_POST['option_e']) : '';
    
    $correct_answer = '';
    if ($question_type == 'multiple_choice_single') {
        $correct_answer = isset($_POST['correct_answer_single']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_single']) : '';
    } elseif ($question_type == 'multiple_choice_multiple') {
        $correct_answers = isset($_POST['correct_answers']) ? $_POST['correct_answers'] : [];
        $correct_answer = implode(',', $correct_answers);
    } elseif ($question_type == 'true_false') {
        $correct_answer = isset($_POST['correct_answer_tf']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_tf']) : 'True';
    } elseif ($question_type == 'short_answer') {
        $correct_answer = isset($_POST['correct_answer_short']) ? mysqli_real_escape_string($conn, $_POST['correct_answer_short']) : '';
    } elseif ($question_type == 'essay') {
        $correct_answer = isset($_POST['model_answer']) ? mysqli_real_escape_string($conn, $_POST['model_answer']) : '';
    }
    
    $update = mysqli_query($conn, "
        UPDATE assessment_questions 
        SET question_type = '$question_type',
            question_text = '$question_text',
            option_a = '$option_a',
            option_b = '$option_b',
            option_c = '$option_c',
            option_d = '$option_d',
            option_e = '$option_e',
            correct_answer = '$correct_answer',
            marks = '$marks',
            required = '$required',
            points_per_answer = '$points'
        WHERE question_id = '$question_id' AND assessment_id = '$assessment_id'
    ");
    
    if ($update) {
        echo json_encode(['success' => true, 'message' => 'Question updated successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . mysqli_error($conn)]);
    }
    
} elseif ($action == 'delete_question') {
    $question_id = isset($_POST['question_id']) ? intval($_POST['question_id']) : 0;
    $assessment_id = isset($_POST['assessment_id']) ? intval($_POST['assessment_id']) : 0;
    
    $delete = mysqli_query($conn, "DELETE FROM assessment_questions WHERE question_id = '$question_id' AND assessment_id = '$assessment_id'");
    
    if ($delete) {
        echo json_encode(['success' => true, 'message' => 'Question deleted successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . mysqli_error($conn)]);
    }
    
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>