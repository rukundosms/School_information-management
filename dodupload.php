<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();

include("connection.php");
session_start();

// Check if user is logged in
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Get session variables
$class = isset($_SESSION['cl']) ? $_SESSION['cl'] : '';
$year = isset($_SESSION['year']) ? $_SESSION['year'] : '';
$term = isset($_SESSION['term']) ? $_SESSION['term'] : '';

// Validate required session variables
if (empty($class) || empty($year) || empty($term)) {
    die("Missing required session variables. Please go back and try again.");
}

// Sanitize inputs
$class = mysqli_real_escape_string($conn, $class);
$year = mysqli_real_escape_string($conn, $year);
$term = intval($term);

// Check if assessment already exists for this term
$term_field = '';
switch($term) {
    case 1: $term_field = 'term1'; break;
    case 2: $term_field = 'term2'; break;
    case 3: $term_field = 'term3'; break;
    default:
        die("Invalid term value");
}

$check_query = "SELECT * FROM conduct WHERE class='$class' AND year='$year' AND $term_field > 0 LIMIT 1";
$check = mysqli_query($conn, $check_query);

if (!$check) {
    die("Database error: " . mysqli_error($conn));
}

if (mysqli_num_rows($check) > 0) {
    echo "<div class='fail'>
            <div class='error'>This assessment already exists! Click 'View Assessment' to see it.</div>
            <form method='post'>
                <button name='view'>View Assessment</button>
            </form>
          </div>";
    
    if(isset($_POST['view'])) {
        header("Location: dodlist.php");
        exit();
    }
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Conduct Assessment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        
        .cont {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        caption {
            font-size: 1.5em;
            font-weight: bold;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 5px 5px 0 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        button {
            background-color: rgb(71, 231, 71);
            border: none;
            border-radius: 3px;
            padding: 10px 20px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            color: #fff;
            transition: background-color 0.3s;
        }
        
        button:hover {
            background-color: rgb(50, 200, 50);
        }
        
        .fail {
            width: 80%;
            max-width: 500px;
            margin: 50px auto;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }
        
        .error {
            background-color: rgb(243, 202, 208);
            color: black;
            font-size: 18px;
            border-radius: 5px;
            font-weight: bold;
            padding: 20px;
            margin-bottom: 15px;
        }
        
        .total {
            padding: 10px;
            font-size: 22px;
            font-weight: bold;
        }
        
        .totalinput {
            font-size: 16px;
            padding: 10px;
            font-weight: bold;
            width: 150px;
            text-align: center;
        }
        
        input[type="number"] {
            width: 100px;
            padding: 8px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        input[type="number"]:focus {
            outline: none;
            border-color: #4CAF50;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
        }
        
        .input-error {
            border-color: #ff4444 !important;
            background-color: #ffeaea;
            box-shadow: 0 0 5px rgba(255, 68, 68, 0.5);
        }
        
        .input-valid {
            border-color: #4CAF50 !important;
            background-color: #f0fff0;
        }
        
        .info-box {
            background-color: #e7f3fe;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .validation-summary {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            display: none;
        }
        
        .validation-summary.show {
            display: block;
        }
        
        .validation-summary h4 {
            margin-top: 0;
            color: #856404;
        }
        
        .validation-summary ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
        }
        
        .validation-summary li {
            margin-bottom: 5px;
            color: #856404;
        }
        
        @media (max-width: 768px) {
            .cont {
                padding: 10px;
            }
            
            th, td {
                padding: 8px;
                font-size: 14px;
            }
            
            input[type="number"] {
                width: 80px;
                padding: 6px;
            }
            
            .totalinput {
                width: 120px;
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <center>
        <div class="cont">
            <div class="validation-summary" id="validationSummary">
                <h4>Validation Errors:</h4>
                <ul id="errorList"></ul>
            </div>
            
            <form action="" method="post" id="assessmentForm">
                <?php
                // Get class information
                $sel = mysqli_query($conn, "SELECT * FROM class WHERE cid='$class'");
                if (!$sel) {
                    die("Error fetching class information: " . mysqli_error($conn));
                }
                
                if (mysqli_num_rows($sel) > 0) {
                    $b = mysqli_fetch_assoc($sel);
                    $class_display = htmlspecialchars($b['level'] . $b['class_name']);
                } else {
                    $class_display = "Unknown Class";
                }
                
                // Get active students only
                $student_query = "SELECT s.sid, s.firstname, s.lastname 
                                 FROM student s
                                 JOIN student_promotion_log spl ON s.sid = spl.sid
                                 WHERE spl.to_class = '$class' 
                                 AND spl.to_year = '$year'
                                 AND s.status = 'active'
                                 ORDER BY s.firstname ASC";
                
                $select = mysqli_query($conn, $student_query);
                
                if (!$select) {
                    die("Error fetching students: " . mysqli_error($conn));
                }
                
                $active_student_count = mysqli_num_rows($select);
                
                if ($active_student_count === 0) {
                    echo "<div class='info-box'>
                            <strong>No active students found!</strong><br>
                            There are no active students in this class for the selected academic year.
                          </div>";
                    exit();
                }
                
                echo "<div class='info-box'>
                        <strong>Active Students:</strong> $active_student_count student(s) found.<br>
                        Only students with status='active' are displayed below.
                      </div>";
                ?>
                
                <table border="1">
                    <caption><?php echo $class_display; ?> - Term <?php echo $term; ?> Assessment</caption>
                    <tr>
                        <th colspan="2" class='total'>Max Point</th>
                        <th>
                            <input type="number" name="total" placeholder='Enter max point' 
                                   class='totalinput' required min="40" max="40"
                                   id="maxPointInput" value="40">
                        </th>
                    </tr>
                    <tr>
                        <th>No</th>
                        <th>Student Name</th>
                        <th>Mark (-50 and 40)</th>
                    </tr>
                    
                    <?php
                    $no = 0;
                    $student_counter = 0;
                    $student_data = []; // Store student data for processing
                    
                    while ($a = mysqli_fetch_assoc($select)) {
                        $no++;
                        $student_counter++;
                        $student_id = $a['sid'];
                        $student_name = htmlspecialchars($a['firstname'] . " " . $a['lastname']);
                        
                        // Store student data
                        $student_data[$student_counter] = [
                            'id' => $student_id,
                            'name' => $student_name
                        ];
                        
                        echo "<tr>
                                <td>$no</td>
                                <td>$student_name</td>
                                <td>
                                    <input type='number' name='mark_$student_counter' 
                                           required min='-50' max='40'
                                           placeholder='-50 and 40'
                                           class='mark-input'
                                           data-student-name='$student_name'
                                           data-student-id='$student_counter'>
                                    <input type='hidden' name='sid_$student_counter' value='$student_id'>
                                </td>
                              </tr>";
                    }
                    
                    // Store student count for processing
                    echo '<input type="hidden" name="student_count" value="' . $student_counter . '">';
                    ?>
                </table>
                
                <div style="margin-top: 20px;">
                    <button type="button" onclick="validateAllMarks()" style="background-color: #2196F3; margin-right: 10px;">Validate All Marks</button>
                    <button type="submit" name="upload" id="u">Upload Assessment</button>
                </div>
            </form>
        </div>
    </center>
    
    <script>
        // Global variables
        let maxPoint = 40; // Default max point
        
        // Update max point when user changes it
        document.getElementById('maxPointInput').addEventListener('input', function(e) {
            maxPoint = parseInt(this.value) || 40;
            validateAllMarks();
        });
        
        // Auto-alert validation for individual marks
        document.addEventListener('DOMContentLoaded', function() {
            // Add event listeners to all mark inputs
            const markInputs = document.querySelectorAll('.mark-input');
            
            markInputs.forEach(input => {
                // Validate on input change
                input.addEventListener('input', function() {
                    validateMarkInput(this);
                });
                
                // Validate on blur (when user leaves the field)
                input.addEventListener('blur', function() {
                    validateMarkInput(this, true); // true = show alert
                });
                
                // Validate on keypress (Enter key)
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        validateMarkInput(this, true);
                    }
                });
            });
            
            // Auto-focus max point input
            const maxPointInput = document.getElementById('maxPointInput');
            if (maxPointInput) {
                maxPointInput.focus();
                maxPointInput.select();
            }
        });
        
        // Function to validate individual mark input
        function validateMarkInput(inputElement, showAlert = false) {
            const value = inputElement.value.trim();
            const studentName = inputElement.getAttribute('data-student-name');
            const studentId = inputElement.getAttribute('data-student-id');
            
            // Clear previous validation styles
            inputElement.classList.remove('input-error', 'input-valid');
            
            // If empty, return (required attribute will handle this)
            if (value === '') {
                return true;
            }
            
            const mark = parseInt(value);
            
            // Check if it's a valid number
            if (isNaN(mark)) {
                if (showAlert) {
                    showAlertMessage(`Invalid mark for ${studentName}. Please enter a valid number.`);
                }
                inputElement.classList.add('input-error');
                return false;
            }
            
            // Check if mark is within range (0 to maxPoint)
            if (mark < -50 || mark > maxPoint) {
                if (showAlert) {
                    showAlertMessage(`Mark for ${studentName} must be between -50 and ${maxPoint}. Current: ${mark}`);
                }
                inputElement.classList.add('input-error');
                return false;
            }
            
            // Check for decimal values
            if (!Number.isInteger(mark)) {
                if (showAlert) {
                    showAlertMessage(`Mark for ${studentName} must be a whole number. Decimal values are not allowed.`);
                }
                inputElement.classList.add('input-error');
                return false;
            }
            
            // Valid mark
            inputElement.classList.add('input-valid');
            return true;
        }
        
        // Function to validate all marks at once
        function validateAllMarks() {
            const markInputs = document.querySelectorAll('.mark-input');
            const errors = [];
            const errorList = document.getElementById('errorList');
            const validationSummary = document.getElementById('validationSummary');
            
            // Clear previous validation
            errorList.innerHTML = '';
            markInputs.forEach(input => {
                input.classList.remove('input-error', 'input-valid');
            });
            
            // Get current max point
            const maxPointInput = document.getElementById('maxPointInput');
            maxPoint = parseInt(maxPointInput.value) || 40;
            
            // Validate max point
            if (maxPoint < 40 || maxPoint > 40) {
                showAlertMessage(`Max point must be 40. Current: ${maxPoint}`);
                maxPointInput.classList.add('input-error');
                maxPointInput.focus();
                return false;
            } else {
                maxPointInput.classList.remove('input-error');
                maxPointInput.classList.add('input-valid');
            }
            
            // Validate all marks
            markInputs.forEach(input => {
                const value = input.value.trim();
                const studentName = input.getAttribute('data-student-name');
                
                if (value === '') {
                    errors.push(`Missing mark for ${studentName}`);
                    input.classList.add('input-error');
                    return;
                }
                
                const mark = parseInt(value);
                
                if (isNaN(mark)) {
                    errors.push(`Invalid number for ${studentName}`);
                    input.classList.add('input-error');
                } else if (mark < -50 || mark > maxPoint) {
                    errors.push(`Mark for ${studentName} must be -50 and 40 (current: ${mark})`);
                    input.classList.add('input-error');
                } else if (!Number.isInteger(mark)) {
                    errors.push(`Mark for ${studentName} must be a whole number`);
                    input.classList.add('input-error');
                } else {
                    input.classList.add('input-valid');
                }
            });
            
            // Show validation summary if there are errors
            if (errors.length > 0) {
                errorList.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
                validationSummary.classList.add('show');
                
                // Scroll to validation summary
                validationSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Focus on first error input
                const firstErrorInput = document.querySelector('.input-error');
                if (firstErrorInput) {
                    firstErrorInput.focus();
                    firstErrorInput.select();
                }
                
                showAlertMessage(`Found ${errors.length} validation error(s). Please check the form.`);
                return false;
            } else {
                validationSummary.classList.remove('show');
                showSuccessMessage('All marks are valid!');
                return true;
            }
        }
        
        // Form submission validation
        document.getElementById('assessmentForm').addEventListener('submit', function(e) {
            // Validate all marks before submission
            if (!validateAllMarks()) {
                e.preventDefault();
                showAlertMessage('Cannot submit form. Please fix all validation errors first.');
                return false;
            }
            
            // Confirm submission
            if (!confirm('Are you sure you want to upload this assessment? This action cannot be undone.')) {
                e.preventDefault();
                return false;
            }
            
            return true;
        });
        
        // Helper function to show alert messages
        function showAlertMessage(message) {
            // Create or get alert container
            let alertContainer = document.getElementById('autoAlertContainer');
            if (!alertContainer) {
                alertContainer = document.createElement('div');
                alertContainer.id = 'autoAlertContainer';
                alertContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(alertContainer);
            }
            
            // Create alert element
            const alertElement = document.createElement('div');
            alertElement.style.cssText = `
                background-color: #ff4444;
                color: white;
                padding: 15px 20px;
                margin-bottom: 10px;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease, fadeOut 0.3s ease 4.7s forwards;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            alertElement.innerHTML = `
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 15px;
                    padding: 0 5px;
                ">×</button>
            `;
            
            // Add CSS for animations
            if (!document.querySelector('#alertStyles')) {
                const style = document.createElement('style');
                style.id = 'alertStyles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add to container
            alertContainer.appendChild(alertElement);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertElement.parentElement) {
                    alertElement.remove();
                }
            }, 5000);
        }
        
        // Helper function to show success messages
        function showSuccessMessage(message) {
            // Create or get success container
            let successContainer = document.getElementById('autoSuccessContainer');
            if (!successContainer) {
                successContainer = document.createElement('div');
                successContainer.id = 'autoSuccessContainer';
                successContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(successContainer);
            }
            
            // Create success element
            const successElement = document.createElement('div');
            successElement.style.cssText = `
                background-color: #4CAF50;
                color: white;
                padding: 15px 20px;
                margin-bottom: 10px;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            
            successElement.innerHTML = `
                <span>✓ ${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 15px;
                    padding: 0 5px;
                ">×</button>
            `;
            
            // Add to container
            successContainer.appendChild(successElement);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (successElement.parentElement) {
                    successElement.remove();
                }
            }, 3000);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl + Enter to submit form
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('u').click();
            }
            
            // Ctrl + V to validate all
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                validateAllMarks();
            }
            
            // Escape to clear validation
            if (e.key === 'Escape') {
                const validationSummary = document.getElementById('validationSummary');
                if (validationSummary) {
                    validationSummary.classList.remove('show');
                }
            }
        });
        
        // Add input hints on focus
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('focus', function() {
                this.title = `Enter a value between ${this.min} and ${this.max}`;
            });
        });
    </script>
</body>
</html>

<?php
// Process form submission
if (isset($_POST['upload'])) {
    $total = mysqli_real_escape_string($conn, $_POST['total']);
    $student_count = intval($_POST['student_count']);
    $date = date('Y-m-d');
    
    // Validate total marks
    if ($total < 40 || $total > 40) {
        echo "<script>showAlertMessage('Max point must be 40');</script>";
        exit();
    }
    
    // Process each student's mark
    $success_count = 0;
    $error_count = 0;
    $errors = [];
    
    for ($i = 1; $i <= $student_count; $i++) {
        if (isset($_POST["sid_$i"]) && isset($_POST["mark_$i"])) {
            $sid = mysqli_real_escape_string($conn, $_POST["sid_$i"]);
            $mark = mysqli_real_escape_string($conn, $_POST["mark_$i"]);
            
            // Validate mark
            if ($mark < 0 || $mark > $total) {
                $errors[] = "Mark for student $i is out of range (0-$total)";
                $error_count++;
                continue;
            }
            
            // Check if student already has a record for this year
            $check_student_query = "SELECT * FROM conduct WHERE sid='$sid' AND year='$year' AND class='$class'";
            $check_student_result = mysqli_query($conn, $check_student_query);
            
            if (mysqli_num_rows($check_student_result) > 0) {
                // Update existing record
                $update_query = "UPDATE conduct SET $term_field='$mark', class='$class' 
                                WHERE sid='$sid' AND year='$year'";
                $result = mysqli_query($conn, $update_query);
            } else {
                // Insert new record
                $insert_query = "INSERT INTO conduct (year, $term_field, sid, class, total) 
                                VALUES ('$year', '$mark', '$sid', '$class', '$total')";
                $result = mysqli_query($conn, $insert_query);
            }
            
            if ($result) {
                $success_count++;
            } else {
                $error_count++;
                $errors[] = "Failed to save mark for student $i: " . mysqli_error($conn);
            }
        }
    }
    
    // Show result and redirect
    if ($error_count === 0) {
        echo "<script>
                showSuccessMessage('Successfully saved assessment for $success_count students');
                setTimeout(function() {
                    window.location.href = 'dodlist.php';
                }, 3000);
              </script>";
    } else {
        echo "<script>
                showAlertMessage('Saved $success_count out of $student_count students. Some errors occurred.');
                setTimeout(function() {
                    window.location.href = 'dodlist.php';
                }, 3000);
              </script>";
    }
}

ob_end_flush();
?>