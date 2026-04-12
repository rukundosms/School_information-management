<?php
session_start();
include("connection.php");

header('Content-Type: application/json');

// Check if it's an AJAX request
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) != 'xmlhttprequest') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

// Verify teacher is logged in
if (!isset($_SESSION['tid'])) {
    echo json_encode(['success' => false, 'error' => 'Session expired']);
    exit;
}

// Get POST data
$sid = mysqli_real_escape_string($conn, $_POST['sid'] ?? '');
$mark_id = mysqli_real_escape_string($conn, $_POST['mark_id'] ?? '');
$test = mysqli_real_escape_string($conn, $_POST['test'] ?? '');
$ttotal = mysqli_real_escape_string($conn, $_POST['ttotal'] ?? '');
$exam = mysqli_real_escape_string($conn, $_POST['exam'] ?? '');
$etotal = mysqli_real_escape_string($conn, $_POST['etotal'] ?? '');
$ototal = mysqli_real_escape_string($conn, $_POST['ototal'] ?? ''); // Hidden calculation
$mtotal = mysqli_real_escape_string($conn, $_POST['mtotal'] ?? ''); // Hidden calculation
$me = mysqli_real_escape_string($conn, $_POST['me'] ?? '');
$module = mysqli_real_escape_string($conn, $_POST['module'] ?? '');
$class = mysqli_real_escape_string($conn, $_POST['class'] ?? '');
$term = mysqli_real_escape_string($conn, $_POST['term'] ?? '');
$year = mysqli_real_escape_string($conn, $_POST['year'] ?? '');
$date = date('y-m-d');

// Validate required fields
if (empty($sid) || empty($me) || empty($module) || empty($class) || empty($term) || empty($year)) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

// Convert empty strings to NULL for database
$test = $test !== '' ? floatval($test) : 'NULL';
$ttotal = $ttotal !== '' ? floatval($ttotal) : 'NULL';
$exam = $exam !== '' ? floatval($exam) : 'NULL';
$etotal = $etotal !== '' ? floatval($etotal) : 'NULL';
$ototal = $ototal !== '' ? floatval($ototal) : 'NULL';
$mtotal = $mtotal !== '' ? floatval($mtotal) : 'NULL';

// Check if record exists using the combination of identifiers
$check_query = "SELECT mark_id FROM marks 
               WHERE sid = '$sid' 
               AND mid = '$module' 
               AND tid = '$me' 
               AND cid = '$class' 
               AND team = '$term' 
               AND year = '$year'";
$check_result = mysqli_query($conn, $check_query);

if (mysqli_num_rows($check_result) > 0) {
    // Record exists, update it
    $existing = mysqli_fetch_assoc($check_result);
    $query = "UPDATE marks SET 
              test = " . ($test !== 'NULL' ? "'$test'" : "NULL") . ",
              ttotal = " . ($ttotal !== 'NULL' ? "'$ttotal'" : "NULL") . ",
              exam = " . ($exam !== 'NULL' ? "'$exam'" : "NULL") . ",
              etotal = " . ($etotal !== 'NULL' ? "'$etotal'" : "NULL") . ",
              ototal = " . ($ototal !== 'NULL' ? "'$ototal'" : "NULL") . ",
              mtotal = " . ($mtotal !== 'NULL' ? "'$mtotal'" : "NULL") . ",
              date = '$date'
              WHERE mark_id = '" . $existing['mark_id'] . "'";
    $mark_id = $existing['mark_id'];
    $action = 'update';
} else {
    // Insert new record
    $query = "INSERT INTO marks (cid, sid, test, ttotal, exam, etotal, ototal, mtotal, mid, year, tid, team, date) 
              VALUES ('$class', '$sid', 
              " . ($test !== 'NULL' ? "'$test'" : "NULL") . ",
              " . ($ttotal !== 'NULL' ? "'$ttotal'" : "NULL") . ",
              " . ($exam !== 'NULL' ? "'$exam'" : "NULL") . ",
              " . ($etotal !== 'NULL' ? "'$etotal'" : "NULL") . ",
              " . ($ototal !== 'NULL' ? "'$ototal'" : "NULL") . ",
              " . ($mtotal !== 'NULL' ? "'$mtotal'" : "NULL") . ",
              '$module', '$year', '$me', '$term', '$date')";
    $action = 'insert';
}

// Execute query
if (mysqli_query($conn, $query)) {
    // Get the mark_id if it was an insert
    if ($action == 'insert') {
        $mark_id = mysqli_insert_id($conn);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Marks saved successfully',
        'mark_id' => $mark_id,
        'action' => $action
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . mysqli_error($conn)
    ]);
}

mysqli_close($conn);
?>