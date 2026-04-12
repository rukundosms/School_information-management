<?php
include("connection.php");
session_start();

// Set content type to JSON for API responses early
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['mark_data'])) {
    header('Content-Type: application/json');
}

if (!isset($_SESSION['tid'])) {
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['mark_data'])) {
        echo json_encode(['success' => false, 'message' => 'Session expired']);
        exit;
    } else {
        header("location:index.html");
        exit;
    }
}

$class = $_SESSION['cl'];
$me = $_SESSION['tid'];
$module = $_SESSION['module'];
$year = $_SESSION['year'];
$total = $_SESSION['total'];
$tearm = $_SESSION['tearm'];
$type = $_SESSION['type'];
$date = date('y-m-d');

// Auto-save functionality with enhanced validation
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['mark_data'])) {
    error_reporting(0);
    $mark_data = $_POST['mark_data'];
    $student_id = mysqli_real_escape_string($conn, $_POST['student_id']);
    
    $response = ['success' => false, 'message' => ''];
    
    // Check if mark data is provided
    if ($mark_data !== '' && $mark_data !== null) {
        $mark = floatval($mark_data);
        
        // STRONG VALIDATION: Check if mark is within valid range (0 to total)
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
                        $response = ['success' => false, 'message' => 'Error updating mark: ' . mysqli_error($conn)];
                    }
                } else {
                    // Insert new record
                    $insert_query = "INSERT INTO marks(cid, sid, test, ttotal, mid, year, tid, team, date) 
                                    VALUES('$class','$student_id','$mark','$total','$module','$year','$me','$tearm','$date')";
                    if (mysqli_query($conn, $insert_query)) {
                        $response = ['success' => true, 'message' => 'Mark saved successfully!'];
                    } else {
                        $response = ['success' => false, 'message' => 'Error saving mark: ' . mysqli_error($conn)];
                    }
                }
            } elseif ($type == 2) {
                // First check if record exists for exam update
                $existing_query = "SELECT * FROM marks WHERE sid='$student_id' AND mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'";
                $existing_result = mysqli_query($conn, $existing_query);
                
                if ($existing_result && mysqli_num_rows($existing_result) > 0) {
                    // Update existing record
                    $update_query = "UPDATE marks SET exam='$mark', etotal='$total' 
                                    WHERE sid='$student_id' AND mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'";
                    if (mysqli_query($conn, $update_query)) {
                        $response = ['success' => true, 'message' => 'Exam mark updated successfully!'];
                    } else {
                        $response = ['success' => false, 'message' => 'Error updating exam mark'];
                    }
                } else {
                    // Insert new record with exam mark
                    $insert_query = "INSERT INTO marks(cid, sid, exam, etotal, mid, year, tid, team, date) 
                                    VALUES('$class','$student_id','$mark','$total','$module','$year','$me','$tearm','$date')";
                    if (mysqli_query($conn, $insert_query)) {
                        $response = ['success' => true, 'message' => 'Exam mark saved successfully!'];
                    } else {
                        $response = ['success' => false, 'message' => 'Error saving exam mark'];
                    }
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
}

// Rest of the page logic (only executed for GET requests)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Check if marks exist - modified to check for existing records without filtering by value
if ($type == 1) {
    $check_query = "SELECT * FROM marks WHERE mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'";
    $check = mysqli_query($conn, $check_query);
    
    if (mysqli_num_rows($check) > 0) {
        // Check if test marks already exist for any student
        $test_check = "SELECT * FROM marks WHERE mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND test IS NOT NULL";
        $test_result = mysqli_query($conn, $test_check);
        
        if (mysqli_num_rows($test_result) > 0) {
            echo "<div class='fail'><div class='error'>Test marks for this assessment already exist! Tap to 'view assessment'!!!</div>";
            echo "<form method='post'><button name='view'>View Assessment</button></form></div>";
            if (isset($_POST['view'])) {
                header("location:list.php");
            }
            exit;
        }
    }
}

if ($type == 2) {
    // Check if test marks exist first (required for exam)
    $test_check = "SELECT * FROM marks WHERE mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND test IS NOT NULL";
    $test_result = mysqli_query($conn, $test_check);
    
    if (mysqli_num_rows($test_result) <= 0) {
        echo "<div class='fail'><div class='error'>Test marks must be entered first before exams!</div>";
        echo "<form method='post'><button name='back'>Back to Test Entry</button></form></div>";
        if (isset($_POST['back'])) {
            header("location:marks.php");
        }
        exit;
    }
    
    // Check if exam marks already exist
    $exam_check = "SELECT * FROM marks WHERE mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND exam IS NOT NULL";
    $exam_result = mysqli_query($conn, $exam_check);
    
    if (mysqli_num_rows($exam_result) > 0) {
        echo "<div class='fail'><div class='error'>Exam marks for this assessment already exist! Tap to 'view assessment'!!!</div>";
        echo "<form method='post'><button name='view'>View Assessment</button></form></div>";
        if (isset($_POST['view'])) {
            header("location:list.php");
        }
        exit;
    }
}

// Get current active academic year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year_data = mysqli_fetch_assoc($current_year_query);
$current_academic_year = $current_year_data['year_id'];

// Try multiple query approaches to find students
$queries = [
    // Query 1: Using student_promotion_log
    "SELECT s.sid, s.firstname, s.lastname, s.reg, s.class as current_class 
     FROM student s 
     INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
     WHERE spl.to_class = '$class' AND spl.to_year = '$year' 
     AND s.status = 'active'
     ORDER BY s.firstname ASC",
     
    // Query 2: Direct from student table (current class)
    "SELECT sid, firstname, lastname, reg, class as current_class 
     FROM student 
     WHERE class = '$class' AND status = 'active'
     ORDER BY firstname ASC",
     
    // Query 3: More flexible promotion log query
    "SELECT DISTINCT s.sid, s.firstname, s.lastname, s.reg 
     FROM student s 
     LEFT JOIN student_promotion_log spl ON s.sid = spl.sid 
     WHERE (spl.to_class = '$class' OR s.class = '$class') 
     AND (spl.to_year = '$year' OR spl.to_year IS NULL)
     AND s.status = 'active'
     ORDER BY s.firstname ASC"
];

$students_found = false;
$students_data = [];

foreach ($queries as $query) {
    $result = mysqli_query($conn, $query);
    if ($result && mysqli_num_rows($result) > 0) {
        $students_found = true;
        $students_data = $result;
        break;
    }
}

// Get assessment type name
$assessment_type = ($type == 1) ? 'Test' : 'Exam';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload <?php echo $assessment_type; ?> Marks</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        body {
            padding: 10px;
            background-color: #f5f5f5;
        }
        button {
            width: fit-content;
            height: fit-content;
            background-color: rgb(71, 231, 71);
            border: none;
            margin-top: 0.4rem;
            border-radius: 3px;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            color: #fff;
        }
        button:hover {
            background-color: rgb(50, 200, 50);
        }
        .fail button {
            margin: 8px auto;
        }
        .error {
            width: 100%;
            background-color: rgb(243, 202, 208);
            color: black;
            font-size: 14px;
            height: fit-content;
            border-radius: 5px;
            font-weight: bold;
            padding: 12px;
            margin: auto;
            text-align: center;
        }
        .fail {
            width: 100%;
            max-width: 500px;
            height: fit-content;
            padding: 12px;
            margin: 15px auto;
            border-radius: 5px;
            text-align: center;
        }
        #notification-bar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            max-width: 400px;
            height: 35px;
            text-align: center;
            line-height: 35px;
            color: white;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            left: 50%;
            transform: translateX(-50%);
            border-radius: 0 0 5px 5px;
            font-weight: bold;
        }
        .notification-success {
            background-color: #28a745;
        }
        .notification-error {
            background-color: #dc3545;
        }
        .notification-warning {
            background-color: #ffc107;
            color: #000;
        }
        .cont {
            width: 100%;
            overflow-x: auto;
            margin: 15px 0;
        }
        table {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border-collapse: collapse;
            background-color: white;
            box-shadow: 0 0 8px rgba(0,0,0,0.1);
        }
        caption {
            font-size: 18px;
            font-weight: bold;
            padding: 15px;
            background-color: #4CAF50;
            color: white;
            border-radius: 5px 5px 0 0;
        }
        th, td {
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        input[type="number"] {
            width: 100px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        input[type="number"]:focus {
            border-color: #4CAF50;
            outline: none;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
        }
        /* Styling for invalid input */
        input[type="number"].invalid {
            border-color: #dc3545;
            background-color: #f8d7da;
        }
        input[type="number"].valid {
            border-color: #28a745;
            background-color: #d4edda;
        }
        .auto-save-notice {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 12px;
            margin: 15px 0;
            border-radius: 5px;
            color: #0c5460;
            text-align: center;
            font-size: 14px;
        }
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 5px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status-indicator {
            font-size: 12px;
            margin-left: 5px;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .status-saved {
            background: #d4edda;
            color: #155724;
        }
        .status-error {
            background: #f8d7da;
            color: #721c24;
        }
        .status-saving {
            background: #fff3cd;
            color: #856404;
        }
        .status-pending {
            background: #e2e3e5;
            color: #383d41;
        }
        .no-students {
            text-align: center;
            padding: 20px;
            color: #dc3545;
            background: #f8d7da;
            margin: 10px 0;
            border-radius: 5px;
        }
        .info-bar {
            background-color: #e7f3ff;
            border: 1px solid #b8daff;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 5px;
            text-align: center;
            font-size: 14px;
        }
        .info-bar span {
            font-weight: bold;
            color: #004085;
        }
        .validation-hint {
            font-size: 11px;
            color: #6c757d;
            margin-top: 4px;
        }
        .progress-bar {
            width: 100%;
            height: 4px;
            background-color: #e0e0e0;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1001;
            display: none;
        }
        .progress-bar-fill {
            width: 0%;
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="progress-bar" id="progressBar">
        <div class="progress-bar-fill" id="progressBarFill"></div>
    </div>

    <!-- Notification Bar -->
    <div id="notification-bar" style="display: none;"></div>

    <div class="info-bar">
        <span><?php echo $assessment_type; ?></span> | 
        Term: <?php echo $tearm; ?> | 
        Total Marks: <?php echo $total; ?> | 
        <span style="color: #856404;">* Marks cannot exceed <?php echo $total; ?></span>
    </div>

    <div class="cont">
        <table>
            <caption>Enter <?php echo $assessment_type; ?> Marks (0 - <?php echo $total; ?>)</caption>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Marks (0 - <?php echo $total; ?>)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            <?php
            if (!$students_found) {
                echo "<tr><td colspan='4' class='no-students'>";
                echo "<strong>No students found for this class in the selected year.</strong><br>";
                echo "Please check if students are properly assigned to this class.";
                echo "</td></tr>";
            } else {
                $no = 0;
                while ($student = mysqli_fetch_array($students_data)) {
                    $student_id = $student['sid'];
                    $no++;
                    
                    // Get existing mark if any
                    $existing_mark = '';
                    $existing_query = mysqli_query($conn, "SELECT * FROM marks WHERE sid='$student_id' AND mid='$module' AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year'");
                    if (mysqli_num_rows($existing_query) > 0) {
                        $existing_data = mysqli_fetch_assoc($existing_query);
                        $existing_mark = ($type == 1) ? $existing_data['test'] : $existing_data['exam'];
                    }
                    
                    // Determine initial status class
                    $initial_status = '';
                    if ($existing_mark !== '' && $existing_mark !== null) {
                        $initial_status = 'status-saved';
                        $status_text = 'Saved (' . $existing_mark . ')';
                    } else {
                        $initial_status = 'status-pending';
                        $status_text = 'Not saved';
                    }
            ?>
                <tr>
                    <td><?php echo $no; ?></td>
                    <td><?php echo htmlspecialchars(($student['firstname'] ?? '') . " " . ($student['lastname'] ?? '')); ?></td>
                    <td>
                        <input type="number" 
                               name="mark<?php echo $no; ?>" 
                               class="mark-input"
                               data-student-id="<?php echo $student_id; ?>"
                               value="<?php echo $existing_mark; ?>"
                               step="0.1" 
                               min="0" 
                               max="<?php echo $total; ?>"
                               placeholder="0-<?php echo $total; ?>"
                               oninput="validateMark(this, <?php echo $total; ?>)">
                        <div class="validation-hint" id="hint-<?php echo $student_id; ?>"></div>
                    </td>
                    <td>
                        <span class="status-indicator <?php echo $initial_status; ?>" id="status-<?php echo $student_id; ?>">
                            <?php echo $status_text; ?>
                        </span>
                    </td>
                </tr>
            <?php 
                }
            }
            ?>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" style="text-align: center; font-size: 12px; color: #666;">
                        <i class="fas fa-info-circle"></i> Marks are automatically saved when valid. Maximum allowed: <?php echo $total; ?>
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>

    <script>
        // Progress bar functions
        let progressInterval = null;
        
        function showProgressBar() {
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressBarFill');
            progressBar.style.display = 'block';
            let width = 0;
            progressInterval = setInterval(() => {
                if (width >= 90) {
                    clearInterval(progressInterval);
                } else {
                    width += 10;
                    progressFill.style.width = width + '%';
                }
            }, 100);
        }
        
        function hideProgressBar() {
            clearInterval(progressInterval);
            const progressFill = document.getElementById('progressBarFill');
            progressFill.style.width = '100%';
            setTimeout(() => {
                const progressBar = document.getElementById('progressBar');
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }, 500);
        }
        
        // Validation function for client-side
        function validateMark(inputElement, maxMark) {
            const value = parseFloat(inputElement.value);
            const studentId = inputElement.getAttribute('data-student-id');
            const hintElement = document.getElementById('hint-' + studentId);
            
            if (isNaN(value)) {
                inputElement.classList.remove('valid');
                inputElement.classList.add('invalid');
                if (hintElement) {
                    hintElement.innerHTML = '<span style="color: #dc3545;">Please enter a valid number</span>';
                }
                return false;
            }
            
            if (value < 0) {
                inputElement.classList.remove('valid');
                inputElement.classList.add('invalid');
                if (hintElement) {
                    hintElement.innerHTML = '<span style="color: #dc3545;">Mark cannot be negative! Minimum is 0</span>';
                }
                return false;
            }
            
            if (value > maxMark) {
                inputElement.classList.remove('valid');
                inputElement.classList.add('invalid');
                if (hintElement) {
                    hintElement.innerHTML = '<span style="color: #dc3545;">Mark cannot exceed ' + maxMark + '!</span>';
                }
                return false;
            }
            
            // Valid mark
            inputElement.classList.remove('invalid');
            inputElement.classList.add('valid');
            if (hintElement) {
                hintElement.innerHTML = '<span style="color: #28a745;">✓ Valid (0-' + maxMark + ')</span>';
                setTimeout(() => {
                    if (hintElement.innerHTML === '<span style="color: #28a745;">✓ Valid (0-' + maxMark + ')</span>') {
                        hintElement.innerHTML = '';
                    }
                }, 2000);
            }
            return true;
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            const notificationBar = document.getElementById('notification-bar');
            let saveTimeouts = {};
            let pendingSaves = new Map(); // Track pending saves for each student
            
            function showNotification(message, type = 'success') {
                notificationBar.textContent = message;
                notificationBar.className = `notification-${type}`;
                notificationBar.style.display = 'block';
                notificationBar.style.opacity = '1';
                
                setTimeout(() => {
                    notificationBar.style.opacity = '0';
                    setTimeout(() => {
                        notificationBar.style.display = 'none';
                    }, 300);
                }, 4000);
            }
            
            function saveMark(inputElement) {
                const studentId = inputElement.getAttribute('data-student-id');
                const markValue = inputElement.value.trim();
                const statusElement = document.getElementById('status-' + studentId);
                const maxMark = parseFloat(inputElement.getAttribute('max'));
                
                // Clear previous timeout for this student
                if (saveTimeouts[studentId]) {
                    clearTimeout(saveTimeouts[studentId]);
                }
                
                // Validate before saving - mark cannot be empty (zero is allowed)
                if (markValue === '') {
                    statusElement.innerHTML = '<span class="status-error">Empty</span>';
                    statusElement.className = 'status-indicator status-error';
                    return;
                }
                
                const mark = parseFloat(markValue);
                
                // Client-side validation
                if (isNaN(mark)) {
                    statusElement.innerHTML = '<span class="status-error">Invalid number</span>';
                    statusElement.className = 'status-indicator status-error';
                    return;
                }
                
                // Check if mark exceeds maximum (STRONG VALIDATION)
                if (mark > maxMark) {
                    statusElement.innerHTML = '<span class="status-error">Exceeds max (' + maxMark + ')</span>';
                    statusElement.className = 'status-indicator status-error';
                    showNotification('Mark ' + mark + ' exceeds maximum ' + maxMark + '!', 'error');
                    // Reset to last valid value or empty
                    inputElement.classList.add('invalid');
                    return;
                }
                
                if (mark < 0) {
                    statusElement.innerHTML = '<span class="status-error">Cannot be negative</span>';
                    statusElement.className = 'status-indicator status-error';
                    return;
                }
                
                // Valid mark - show saving status
                statusElement.innerHTML = '<span class="status-saving">Saving...</span>';
                statusElement.className = 'status-indicator status-saving';
                inputElement.classList.remove('invalid');
                inputElement.classList.add('valid');
                
                // Show progress bar for first save
                if (pendingSaves.size === 0) {
                    showProgressBar();
                }
                
                // Track pending save
                pendingSaves.set(studentId, true);
                
                // Set timeout to save after user stops typing (1 second delay)
                saveTimeouts[studentId] = setTimeout(() => {
                    const formData = new FormData();
                    formData.append('mark_data', markValue);
                    formData.append('student_id', studentId);
                    
                    fetch(window.location.href, {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        pendingSaves.delete(studentId);
                        
                        if (pendingSaves.size === 0) {
                            hideProgressBar();
                        }
                        
                        if (data.success) {
                            statusElement.innerHTML = '<span class="status-saved">Saved (' + markValue + ')</span>';
                            statusElement.className = 'status-indicator status-saved';
                            showNotification(data.message, 'success');
                        } else {
                            statusElement.innerHTML = '<span class="status-error">Error: ' + data.message + '</span>';
                            statusElement.className = 'status-indicator status-error';
                            showNotification('Save error: ' + data.message, 'error');
                        }
                    })
                    .catch(error => {
                        pendingSaves.delete(studentId);
                        if (pendingSaves.size === 0) {
                            hideProgressBar();
                        }
                        statusElement.innerHTML = '<span class="status-error">Failed</span>';
                        statusElement.className = 'status-indicator status-error';
                        showNotification('Save failed: ' + error.message, 'error');
                        console.error('Save error:', error);
                    });
                }, 1000);
            }
            
            // Add event listeners to all mark inputs
            const markInputs = document.querySelectorAll('.mark-input');
            const maxMark = <?php echo $total; ?>;
            
            markInputs.forEach(input => {
                // Validate on input
                input.addEventListener('input', function() {
                    validateMark(this, maxMark);
                    saveMark(this);
                });
                
                // Save on blur as well
                input.addEventListener('blur', function() {
                    if (this.value.trim() !== '') {
                        const isValid = validateMark(this, maxMark);
                        if (isValid) {
                            saveMark(this);
                        }
                    }
                });
                
                // Prevent entering values above max
                input.addEventListener('keydown', function(e) {
                    const currentValue = parseFloat(this.value);
                    const maxValue = parseFloat(this.getAttribute('max'));
                    
                    // If trying to type a number that would exceed max
                    if (e.key >= '0' && e.key <= '9') {
                        const newValue = parseFloat((this.value || '0') + e.key);
                        if (newValue > maxValue) {
                            e.preventDefault();
                            showNotification('Maximum marks allowed is ' + maxValue, 'warning');
                        }
                    }
                });
                
                // Initial validation for existing values
                if (input.value !== '') {
                    validateMark(input, maxMark);
                }
            });
            
            // Warn before leaving page if there are pending saves
            window.addEventListener('beforeunload', function(e) {
                if (pendingSaves.size > 0) {
                    e.preventDefault();
                    e.returnValue = 'Marks are still being saved. Are you sure you want to leave?';
                    return e.returnValue;
                }
            });
        });
    </script>
</body>
</html>