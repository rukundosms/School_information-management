<?php
include("connection.php");
session_start();
if (!isset($_SESSION['tid'])) {
    header("location:index.html");
    exit;
}

// Get session variables
$class = $_SESSION['cl'];
$me = $_SESSION['tid'];
$selected = $_GET['selected'];
$module = $_SESSION['module'];
$year = $_SESSION['year'];
$total = $_SESSION['total'];
$tearm = $_SESSION['tearm'];
$type = $_SESSION['type'];

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['view'])) {
        header("Location: list.php");
        exit;
    }
    if (isset($_POST['back'])) {
        header("Location: marks.php");
        exit;
    }
    if (isset($_POST['save_all'])) {
        // Handle bulk save if needed
    }
}

// Handle auto-saving via AJAX
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['ajax_save'])) {
    $mark = $_POST['mark'];
    $student_id = $_POST['student_id'];
    
    // Validate mark
    if ($mark < 0 || $mark > $total) {
        die(json_encode(['success' => false, 'message' => 'Invalid mark value']));
    }
    
    // Check if record exists
    $check = mysqli_query($conn, "SELECT * FROM marks WHERE mid='$module' AND tid='$me' 
              AND cid='$class' AND team='$tearm' AND year='$year' AND sid='$student_id'");
    
    if (mysqli_num_rows($check) > 0) {
        // Update existing record
        $update = mysqli_query($conn, "UPDATE marks SET test='$mark' WHERE mid='$module' 
                   AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND sid='$student_id'");
    } else {
        // Insert new record
        $insert = mysqli_query($conn, "INSERT INTO marks (mid, tid, cid, sid, team, year, test) 
                   VALUES ('$module', '$me', '$class', '$student_id', '$tearm', '$year', '$mark')");
    }
    
    if (mysqli_affected_rows($conn) > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save mark']);
    }
    exit;
}

// Improved mark existence checking
$has_existing_marks = false;
$has_current_term_marks = false;

// Check all terms for this student (only if test > 0)
$check_all_terms = mysqli_query($conn, "SELECT test FROM marks WHERE mid='$module' 
AND tid='$me' AND cid='$class' AND sid='$selected' AND year='$year' AND test > 0");

if (mysqli_num_rows($check_all_terms) > 0) {
    $has_existing_marks = true;
}

// Check current term for this student (only if test > 0)
$check_current_term = mysqli_query($conn, "SELECT test FROM marks WHERE mid='$module' 
AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND sid='$selected' AND test > 0");

if (mysqli_num_rows($check_current_term) > 0) {
    $has_current_term_marks = true;
}

// Check if this is a second assessment without first assessment existing
$first_assessment_missing = false;
if ($type == 2) {
    $check_first_assessment = mysqli_query($conn, "SELECT test FROM marks WHERE mid='$module' 
    AND tid='$me' AND cid='$class' AND sid='$selected' AND team='$tearm' AND year='$year' AND test > 0");
    $first_assessment_missing = (mysqli_num_rows($check_first_assessment) == 0);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Marks</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f7fa;
            padding: 15px;
            color: #333;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
            padding: 20px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        caption {
            font-size: 1.3rem;
            font-weight: bold;
            padding: 15px;
            color: #2c3e50;
            text-align: center;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #3498db;
            color: white;
            font-weight: 600;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        tr:hover {
            background-color: #f1f8ff;
        }
        
        input[type="number"] {
            width: 80px;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        
        input[type="number"]:focus {
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
            outline: none;
        }
        
        .error-message {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
            border: 1px solid #f5c6cb;
        }
        
        .button-container {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        button {
            padding: 10px 25px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 160px;
        }
        
        button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .saving-status {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 25px;
            background-color: #3498db;
            color: white;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: none;
            z-index: 1000;
            font-weight: 600;
            text-align: center;
            min-width: 250px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .saving-status.show {
            display: block;
            opacity: 1;
        }
        
        .saving-status.success {
            background-color: #2ecc71;
        }
        
        .saving-status.error {
            background-color: #e74c3c;
        }
        
        .mark-saved {
            position: relative;
        }
        
        .mark-saved::after {
            content: '✓';
            position: absolute;
            right: -25px;
            top: 50%;
            transform: translateY(-50%);
            color: #2ecc71;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .mark-saved.saved::after {
            opacity: 1;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            th, td {
                padding: 10px 8px;
                font-size: 14px;
            }
            
            caption {
                font-size: 1.1rem;
                padding: 10px;
            }
            
            input[type="number"] {
                width: 70px;
                padding: 6px 8px;
            }
            
            button {
                padding: 8px 15px;
                font-size: 14px;
                min-width: 120px;
            }
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 10px;
            }
            
            th, td {
                padding: 8px 5px;
                font-size: 13px;
            }
            
            input[type="number"] {
                width: 60px;
                padding: 5px;
                font-size: 14px;
            }
            
            .button-container {
                flex-direction: column;
                align-items: center;
            }
            
            button {
                width: 100%;
                max-width: 200px;
            }
        }
    </style>
</head>
<body>
    <!-- Saving status bar at the top -->
    <div class="saving-status" id="savingStatus"></div>

    <div class="container">
        <?php if ($has_existing_marks): ?>
            <div class="error-message">Marks exist for this student in one or more terms!</div>
            <div class="button-container">
                <form method="post">
                    <button type="submit" name="view">View Assessment</button>
                </form>
            </div>
        
        <?php elseif ($has_current_term_marks): ?>
            <div class="error-message">This assessment already exists!</div>
            <div class="button-container">
                <form method="post">
                    <button type="submit" name="view">View Assessment</button>
                </form>
            </div>
        
        <?php elseif ($first_assessment_missing): ?>
            <div class="error-message">The first assessment does not exist!</div>
            <div class="button-container">
                <form method="post">
                    <button type="submit" name="back">Back</button>
                </form>
            </div>
        
        <?php else: ?>
            <table>
                <caption>
                    <?php
                    $sel = mysqli_query($conn, "SELECT * FROM class, module WHERE module.moid='$module' AND class.cid='$class'");
                    if (mysqli_num_rows($sel) > 0) {
                        $b = mysqli_fetch_array($sel);
                        echo htmlspecialchars($b['level'] . " " . $b['mname']);
                    }
                    ?>
                </caption>
                <thead>
                    <tr>
                        <th colspan="3"><?php echo "Term " . htmlspecialchars($tearm) . " " . htmlspecialchars($year) ?></th>
                    </tr>
                    <tr>
                        <th>No</th>
                        <th>Student Name</th>
                        <th>Mark</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $select = mysqli_query($conn, "SELECT * FROM student WHERE sid='$selected'");
                    $no = 0;
                    
                    while ($a = mysqli_fetch_array($select)) {
                        $no++;
                        // Check if mark already exists
                        $mark_check = mysqli_query($conn, "SELECT test FROM marks WHERE mid='$module' 
                                      AND tid='$me' AND cid='$class' AND team='$tearm' AND year='$year' AND sid='{$a['sid']}'");
                        $existing_mark = '';
                        
                        if (mysqli_num_rows($mark_check) > 0) {
                            $mark_row = mysqli_fetch_assoc($mark_check);
                            $existing_mark = $mark_row['test'];
                        }
                        
                        echo '<tr>
                            <td>' . $no . '</td>
                            <td>' . htmlspecialchars($a['firstname'] . ' ' . $a['lastname']) . '</td>
                            <td class="mark-saved">
                                <input type="number" name="mark" class="mark-input" 
                                value="' . htmlspecialchars($existing_mark) . '" 
                                min="0" max="' . $total . '" 
                                data-student-id="' . $a['sid'] . '">
                            </td>
                        </tr>';
                    }
                    ?>
                </tbody>
            </table>
            
            <div class="button-container">
                <button type="button" id="saveAllBtn">Save Marks</button>
                <button type="button" id="viewMarksBtn">View Marks</button>
            </div>
        <?php endif; ?>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const inputs = document.querySelectorAll('.mark-input');
        const savingStatus = document.getElementById('savingStatus');
        const saveAllBtn = document.getElementById('saveAllBtn');
        const viewMarksBtn = document.getElementById('viewMarksBtn');
        
        // Show status message
        function showStatus(message, isSuccess) {
            savingStatus.textContent = message;
            savingStatus.className = 'saving-status show';
            if (isSuccess) {
                savingStatus.classList.add('success');
            } else {
                savingStatus.classList.add('error');
            }
            
            setTimeout(() => {
                savingStatus.classList.remove('show');
                setTimeout(() => {
                    savingStatus.className = 'saving-status';
                }, 300);
            }, 2000);
        }
        
        // Save a single mark
        function saveMark(input) {
            const mark = input.value;
            const studentId = input.getAttribute('data-student-id');
            
            // Validate mark
            if (mark < 0 || mark > <?php echo $total; ?>) {
                showStatus('Mark must be between 0 and <?php echo $total; ?>', false);
                return;
            }
            
            // Show saving indicator
            const cell = input.parentElement;
            cell.classList.add('saving');
            
            // Send AJAX request
            fetch('', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `ajax_save=1&mark=${encodeURIComponent(mark)}&student_id=${encodeURIComponent(studentId)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cell.classList.remove('saving');
                    cell.classList.add('saved');
                    setTimeout(() => cell.classList.remove('saved'), 2000);
                } else {
                    showStatus(data.message || 'Error saving mark', false);
                }
            })
            .catch(error => {
                showStatus('Error saving mark', false);
                console.error('Error:', error);
            });
        }
        
        // Save all marks
        function saveAllMarks() {
            let hasErrors = false;
            let savedCount = 0;
            const totalCount = inputs.length;
            
            showStatus('Saving all marks...', true);
            
            inputs.forEach(input => {
                const mark = input.value;
                const studentId = input.getAttribute('data-student-id');
                
                if (mark === '') {
                    hasErrors = true;
                    return;
                }
                
                fetch('', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `ajax_save=1&mark=${encodeURIComponent(mark)}&student_id=${encodeURIComponent(studentId)}`
                })
                .then(response => response.json())
                .then(data => {
                    savedCount++;
                    const cell = input.parentElement;
                    if (data.success) {
                        cell.classList.add('saved');
                        setTimeout(() => cell.classList.remove('saved'), 2000);
                    } else {
                        hasErrors = true;
                    }
                    
                    if (savedCount === totalCount) {
                        if (hasErrors) {
                            showStatus('Some marks failed to save', false);
                        } else {
                            showStatus('All marks saved successfully!', true);
                        }
                    }
                })
                .catch(error => {
                    hasErrors = true;
                    savedCount++;
                    console.error('Error:', error);
                });
            });
        }
        
        // Add event listeners
        if (inputs.length > 0) {
            inputs.forEach(input => {
                // Save on blur (when leaving the field)
                input.addEventListener('blur', function() {
                    if (this.value !== '') {
                        saveMark(this);
                    }
                });
                
                // Validate on change
                input.addEventListener('change', function() {
                    const max = parseInt(this.getAttribute('max'));
                    if (this.value > max) {
                        this.value = max;
                        showStatus('Mark cannot exceed ' + max, false);
                    }
                    if (this.value < 0) {
                        this.value = 0;
                        showStatus('Mark cannot be negative', false);
                    }
                });
            });
            
            // Save all button
            saveAllBtn.addEventListener('click', saveAllMarks);
        }
        
        // View marks button
        if (viewMarksBtn) {
            viewMarksBtn.addEventListener('click', function() {
                window.location.href = 'list.php';
            });
        }
        
        // Also save when leaving the page if there are unsaved changes
        window.addEventListener('beforeunload', function(e) {
            const unsavedInputs = Array.from(inputs).filter(input => {
                return input.value !== '' && !input.parentElement.classList.contains('saved');
            });
            
            if (unsavedInputs.length > 0) {
                // Show a message to the user
                showStatus('Saving your changes before leaving...', true);
                
                // Return a confirmation message
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    });
    </script>
</body>
</html>