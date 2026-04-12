<?php
// save_mark_api.php
include("connection.php");
session_start();

// Set JSON header immediately
header('Content-Type: application/json');

// Turn off error reporting to prevent output
error_reporting(0);

if (!isset($_SESSION['tid'])) {
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['mark_data'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$class = $_SESSION['cl'];
$me = $_SESSION['tid'];
$module = $_SESSION['module'];
$year = $_SESSION['year'];
$total = $_SESSION['total'];
$tearm = $_SESSION['tearm'];
$type = $_SESSION['type'];
$date = date('y-m-d');

$mark_data = $_POST['mark_data'];
$student_id = mysqli_real_escape_string($conn, $_POST['student_id']);

$response = ['success' => false, 'message' => ''];

if (!empty($mark_data) && !empty($student_id)) {
    $mark = floatval($mark_data);
    
    // Validate mark range
    if ($mark >= 0 && $mark <= $total) {
        if ($type == 1) {
            // Check if test mark already exists
            $existing_query = "SELECT * FROM marks WHERE sid='$student_id' AND mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'";
            $existing_result = mysqli_query($conn, $existing_query);
            
            if ($existing_result && mysqli_num_rows($existing_result) > 0) {
                // Update existing record
                $update_query = "UPDATE marks SET test='$mark', ttotal='$total', date='$date' 
                                WHERE sid='$student_id' AND mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'";
                if (mysqli_query($conn, $update_query)) {
                    $response = ['success' => true, 'message' => 'Mark updated successfully!'];
                } else {
                    $response = ['success' => false, 'message' => 'Error updating mark'];
                }
            } else {
                // Insert new record
                $insert_query = "INSERT INTO marks(cid, sid, test, ttotal, mid, year, tid, team, date) 
                                VALUES('$class','$student_id','$mark','$total','$module','$year','$me','$tearm','$date')";
                if (mysqli_query($conn, $insert_query)) {
                    $response = ['success' => true, 'message' => 'Mark saved successfully!'];
                } else {
                    $response = ['success' => false, 'message' => 'Error saving mark'];
                }
            }
        } elseif ($type == 2) {
            // Update exam mark
            $update_query = "UPDATE marks SET exam='$mark', etotal='$total' 
                            WHERE sid='$student_id' AND team='$tearm' AND year='$year' AND mid='$module' AND cid='$class'";
            if (mysqli_query($conn, $update_query)) {
                $response = ['success' => true, 'message' => 'Exam mark updated successfully!'];
            } else {
                $response = ['success' => false, 'message' => 'Error updating exam mark'];
            }
        }
    } else {
        $response = ['success' => false, 'message' => "Mark must be between 0 and $total"];
    }
} else {
    $response = ['success' => false, 'message' => 'No mark data received'];
}

echo json_encode($response);
exit;
?>