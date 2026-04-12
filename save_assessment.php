<?php
session_start();
include("connection.php");

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_assessment') {
    $response = ['success' => false, 'message' => ''];
    
    try {
        $teacher_id = mysqli_real_escape_string($conn, $_POST['teacher_id']);
        $module_id = mysqli_real_escape_string($conn, $_POST['module_id']);
        $class_id = mysqli_real_escape_string($conn, $_POST['class_id']);
        $student_id = mysqli_real_escape_string($conn, $_POST['student_id']);
        $academic_year = mysqli_real_escape_string($conn, $_POST['academic_year']);
        $score_type = mysqli_real_escape_string($conn, $_POST['score_type']);
        $score = mysqli_real_escape_string($conn, $_POST['score']);
        $total = mysqli_real_escape_string($conn, $_POST['total']);
        
        // Check if marks already exist
        $check_query = "SELECT mark_id FROM marks 
                       WHERE tid = '$teacher_id' 
                       AND mid = '$module_id' 
                       AND cid = '$class_id' 
                       AND sid = '$student_id' 
                       AND year = '$academic_year'";
        
        $check_result = mysqli_query($conn, $check_query);
        
        if (mysqli_num_rows($check_result) > 0) {
            // Update existing marks
            $row = mysqli_fetch_assoc($check_result);
            $mark_id = $row['mark_id'];
            
            if ($score_type === 'test') {
                $update_query = "UPDATE marks SET 
                                test = '$score',
                                ttotal = '$total',
                                date = NOW()
                                WHERE mark_id = '$mark_id'";
            } else {
                $update_query = "UPDATE marks SET 
                                exam = '$score',
                                etotal = '$total',
                                date = NOW()
                                WHERE mark_id = '$mark_id'";
            }
            
            if (mysqli_query($conn, $update_query)) {
                $response['success'] = true;
                $response['message'] = 'Assessment updated successfully';
            } else {
                $response['message'] = 'Update failed: ' . mysqli_error($conn);
            }
        } else {
            // Insert new marks
            if ($score_type === 'test') {
                $insert_query = "INSERT INTO marks 
                                (tid, mid, cid, sid, year, test, ttotal, date) 
                                VALUES 
                                ('$teacher_id', '$module_id', '$class_id', '$student_id', '$academic_year', '$score', '$total', NOW())";
            } else {
                $insert_query = "INSERT INTO marks 
                                (tid, mid, cid, sid, year, exam, etotal, date) 
                                VALUES 
                                ('$teacher_id', '$module_id', '$class_id', '$student_id', '$academic_year', '$score', '$total', NOW())";
            }
            
            if (mysqli_query($conn, $insert_query)) {
                $response['success'] = true;
                $response['message'] = 'Assessment saved successfully';
            } else {
                $response['message'] = 'Insert failed: ' . mysqli_error($conn);
            }
        }
        
    } catch (Exception $e) {
        $response['message'] = 'Error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
    exit();
}
?>