<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Get and sanitize session variables
$class = isset($_SESSION['cl']) ? mysqli_real_escape_string($conn, $_SESSION['cl']) : '';
$year = isset($_SESSION['year']) ? mysqli_real_escape_string($conn, $_SESSION['year']) : '';
$term = isset($_SESSION['term']) ? intval($_SESSION['term']) : 0;

// Validate session variables
if (empty($class) || empty($year) || $term < 1 || $term > 3) {
    die("Invalid session data. Please go back and try again.");
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Conduct</title>
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
            padding: 10px;
            text-align: center;
        }
        
        th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        input[type="number"] {
            width: 60px;
            padding: 6px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-align: center;
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
            margin-top: 15px;
        }
        
        button:hover {
            background-color: rgb(50, 200, 50);
        }
        
        .new-record {
            background-color: #e8f5e9;
        }
        
        .existing-record {
            background-color: #fff3e0;
        }
        
        .info-box {
            background-color: #e7f3fe;
            border-left: 4px solid #2196F3;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        
        .status-new {
            color: #28a745;
            font-weight: bold;
        }
        
        .status-existing {
            color: #ff9800;
            font-weight: bold;
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
                width: 50px;
                padding: 5px;
            }
        }
    </style>
</head>

<body>
    <center>
        <div class="cont">
            <form action="" method="post" id="editForm">
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
                
                // Get active students only - UPDATED QUERY
                $active_students_query = "SELECT s.sid, s.firstname, s.lastname 
                                         FROM student s
                                         JOIN student_promotion_log spl ON s.sid = spl.sid
                                         WHERE spl.to_class = '$class' 
                                         AND spl.to_year = '$year'
                                         AND s.status = 'active'  -- ADDED: Filter for active students only
                                         ORDER BY s.firstname ASC";
                
                $active_students = mysqli_query($conn, $active_students_query);
                
                if (!$active_students) {
                    die("Error fetching students: " . mysqli_error($conn));
                }
                
                $active_student_count = mysqli_num_rows($active_students);
                
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
                    <caption><?php echo $class_display; ?> - Conduct Assessment</caption>
                    <tr>
                        <th colspan="5">Term <?php echo $term; ?> - Edit Mode</th>
                    </tr>
                    <tr>
                        <th>No</th>
                        <th>Student Name</th>
                        <th>Marks</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>

                    <?php
                    $no = 0;
                    $list = 0;
                    
                    while ($student = mysqli_fetch_assoc($active_students)) {
                        $no++;
                        $list++;
                        $sid = $student['sid'];
                        $student_name = htmlspecialchars($student['firstname'] . " " . $student['lastname']);
                        
                        // Check if conduct record exists for this student
                        $conduct_query = mysqli_query($conn, "SELECT * FROM conduct WHERE class='$class' AND sid='$sid' AND year='$year'");
                        
                        if (mysqli_num_rows($conduct_query) > 0) {
                            // Conduct record exists - display with current values
                            $a = mysqli_fetch_assoc($conduct_query);
                            $mark_id = $a['marks_id'];
                            
                            // Get current term mark
                            $current_mark = '';
                            switch($term) {
                                case 1: $current_mark = $a['term1']; break;
                                case 2: $current_mark = $a['term2']; break;
                                case 3: $current_mark = $a['term3']; break;
                            }
                            ?>
                            <tr class="existing-record">
                                <td><?php echo $no; ?></td>
                                <td><?php echo $student_name; ?></td>
                                <td>
                                    <input type="number" name="t<?php echo $list; ?>" 
                                           value="<?php echo htmlspecialchars($current_mark); ?>"
                                           min="0" max="100">
                                </td>
                                <td>
                                    <input type="number" name="tt<?php echo $list; ?>" 
                                           value="<?php echo htmlspecialchars($a['total']); ?>"
                                           min="0" max="100">
                                </td>
                                <td class="status-existing">Existing Record</td>
                                <input type="hidden" name="sid<?php echo $list; ?>" value="<?php echo $sid; ?>">
                                <input type="hidden" name="mark<?php echo $list; ?>" value="<?php echo $mark_id; ?>">
                            </tr>
                            <?php
                        } else {
                            // No conduct record exists - display with empty values
                            ?>
                            <tr class="new-record">
                                <td><?php echo $no; ?></td>
                                <td><?php echo $student_name; ?></td>
                                <td>
                                    <input type="number" name="t<?php echo $list; ?>" 
                                           value="" placeholder="0-100"
                                           min="0" max="100">
                                </td>
                                <td>
                                    <input type="number" name="tt<?php echo $list; ?>" 
                                           value="" placeholder="0-100"
                                           min="0" max="100">
                                </td>
                                <td class="status-new">New Record</td>
                                <input type="hidden" name="sid<?php echo $list; ?>" value="<?php echo $sid; ?>">
                                <input type="hidden" name="mark<?php echo $list; ?>" value="new">
                            </tr>
                            <?php
                        }
                    }
                    ?>
                </table>

                <input type="hidden" name="student_count" value="<?php echo $list; ?>">
                <button type="submit" name="edit">Save Changes</button>
            </form>
        </div>
    </center>
    
    <script>
        // Form validation
        document.getElementById('editForm').addEventListener('submit', function(e) {
            const markInputs = document.querySelectorAll('input[type="number"][name^="t"]:not([name^="tt"])');
            const totalInputs = document.querySelectorAll('input[type="number"][name^="tt"]');
            
            // Validate marks (0-100)
            let allValid = true;
            
            markInputs.forEach(input => {
                const mark = parseInt(input.value);
                if (input.value !== '' && (isNaN(mark) || mark < 0 || mark > 100)) {
                    alert('Marks must be between 0 and 100 or empty');
                    input.focus();
                    allValid = false;
                    e.preventDefault();
                }
            });
            
            // Validate totals (0-100)
            totalInputs.forEach(input => {
                const total = parseInt(input.value);
                if (input.value !== '' && (isNaN(total) || total < 0 || total > 100)) {
                    alert('Total must be between 0 and 100 or empty');
                    input.focus();
                    allValid = false;
                    e.preventDefault();
                }
            });
            
            // Check if at least one field is filled
            let hasData = false;
            markInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    hasData = true;
                }
            });
            
            totalInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    hasData = true;
                }
            });
            
            if (!hasData) {
                alert('Please enter at least one mark or total value');
                e.preventDefault();
                allValid = false;
            }
            
            if (!allValid) {
                e.preventDefault();
                return false;
            }
            
            // Confirm submission
            if (!confirm('Are you sure you want to save these changes?')) {
                e.preventDefault();
                return false;
            }
            
            return true;
        });
        
        // Auto-focus first input
        document.addEventListener('DOMContentLoaded', function() {
            const firstInput = document.querySelector('input[type="number"]');
            if (firstInput) {
                firstInput.focus();
            }
        });
    </script>
</body>

</html>

<?php
// Process form submission
if (isset($_POST['edit'])) {
    $student_count = isset($_POST['student_count']) ? intval($_POST['student_count']) : 0;
    
    if ($student_count > 0) {
        $success_count = 0;
        $error_count = 0;
        $errors = [];
        
        for ($i = 1; $i <= $student_count; $i++) {
            if (isset($_POST["t$i"]) && isset($_POST["sid$i"]) && isset($_POST["tt$i"]) && isset($_POST["mark$i"])) {
                $mark_value = mysqli_real_escape_string($conn, $_POST["t$i"]);
                $total_value = mysqli_real_escape_string($conn, $_POST["tt$i"]);
                $sid = mysqli_real_escape_string($conn, $_POST["sid$i"]);
                $mark_id = mysqli_real_escape_string($conn, $_POST["mark$i"]);
                
                // Skip if both fields are empty
                if (empty($mark_value) && empty($total_value)) {
                    continue;
                }
                
                // Set default values if empty
                $mark_value = empty($mark_value) ? '0' : $mark_value;
                $total_value = empty($total_value) ? '0' : $total_value;
                
                // Validate numeric values
                if (!is_numeric($mark_value) || !is_numeric($total_value)) {
                    $error_count++;
                    $errors[] = "Invalid numeric value for student $i";
                    continue;
                }
                
                if ($mark_id == "new") {
                    // Insert new conduct record
                    $term1_value = ($term == 1) ? $mark_value : '0';
                    $term2_value = ($term == 2) ? $mark_value : '0';
                    $term3_value = ($term == 3) ? $mark_value : '0';
                    
                    $insert_query = "INSERT INTO conduct (sid, class, year, term1, term2, term3, total) 
                                    VALUES ('$sid', '$class', '$year', '$term1_value', '$term2_value', '$term3_value', '$total_value')";
                    
                    $result = mysqli_query($conn, $insert_query);
                    
                    if ($result) {
                        $success_count++;
                    } else {
                        $error_count++;
                        $errors[] = "Insert failed for student $i: " . mysqli_error($conn);
                    }
                } else {
                    // Update existing conduct record
                    $update_field = '';
                    switch($term) {
                        case 1: $update_field = "term1='$mark_value'"; break;
                        case 2: $update_field = "term2='$mark_value'"; break;
                        case 3: $update_field = "term3='$mark_value'"; break;
                    }
                    
                    $update_query = "UPDATE conduct SET $update_field, total='$total_value' WHERE marks_id='$mark_id'";
                    $result = mysqli_query($conn, $update_query);
                    
                    if ($result) {
                        $success_count++;
                    } else {
                        $error_count++;
                        $errors[] = "Update failed for student $i: " . mysqli_error($conn);
                    }
                }
            }
        }
        
        // Redirect with success message
        if ($error_count === 0) {
            echo "<script>
                    alert('Successfully saved changes for $success_count students');
                    window.location.href = 'dodlist.php';
                  </script>";
        } else {
            echo "<script>
                    alert('Saved $success_count out of $student_count students. Errors: " . implode(', ', $errors) . "');
                    window.location.href = 'dodlist.php';
                  </script>";
        }
    } else {
        echo "<script>
                alert('No students found to update');
                window.location.href = 'dodlist.php';
              </script>";
    }
    exit();
}
?>