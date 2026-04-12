<?php
include("connection.php");
session_start();

// Verify all required session variables
$required_sessions = [
    'tid' => 'Teacher ID',
    'cl' => 'Class ID', 
    'module' => 'Module ID',
    'name' => 'Module Name',
    'tearm' => 'Term',
    'year' => 'Year ID'
];

foreach ($required_sessions as $var => $desc) {
    if (!isset($_SESSION[$var])) {
        error_log("Missing session variable: $var ($desc)");
        header("Location: mymodules.php");
        exit();
    }
}

// Sanitize inputs
$class = mysqli_real_escape_string($conn, $_SESSION['cl']);
$me = mysqli_real_escape_string($conn, $_SESSION['tid']);
$module = mysqli_real_escape_string($conn, $_SESSION['module']);
$term = mysqli_real_escape_string($conn, $_SESSION['tearm']);
$year_id = mysqli_real_escape_string($conn, $_SESSION['year']);
$modules = htmlspecialchars($_SESSION['name']);

// Get academic year name from database
$academic_year_name = "Unknown Year";
if ($year_id) {
    $year_query = mysqli_query($conn, "SELECT year FROM year WHERE year_id = '$year_id'");
    if ($year_query && mysqli_num_rows($year_query) > 0) {
        $year_data = mysqli_fetch_assoc($year_query);
        $academic_year_name = htmlspecialchars($year_data['year']);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marks - <?php echo htmlspecialchars($modules); ?></title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        
        body {
            background-color: #f5f5f5;
            padding: 15px;
        }
        
        .cont {
            max-width: 100%;
            overflow-x: auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin: 0 auto;
        }
        
        .term-header {
            background-color: #e1f5fe;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: bold;
        }
        
        .year-info {
            background-color: #f0f8ff;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            text-align: center;
            font-size: 1.1rem;
            color: #2c3e50;
            border-left: 4px solid #3498db;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        caption {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 10px;
            padding: 8px;
            color: #333;
        }
        
        th, td {
            padding: 12px 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        
        th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        
        .empty-mark {
            color: #999;
            font-style: italic;
            text-align: center;
        }
        
        .button-container {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        button {
            padding: 10px 20px;
            background-color: #4CAF50;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            color: white;
            transition: background-color 0.3s;
            min-width: 120px;
        }
        
        button:hover {
            background-color: #45a049;
        }
        
        .error-message {
            color: red;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid red;
            background-color: #ffeeee;
            border-radius: 4px;
        }
        
        .info-message {
            color: #31708f;
            background-color: #d9edf7;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #bce8f1;
            border-radius: 4px;
        }
        
        @media (max-width: 768px) {
            th, td {
                padding: 8px 5px;
                font-size: 14px;
            }
            
            caption {
                font-size: 1rem;
            }
            
            .cont {
                padding: 10px;
            }
            
            .year-info {
                font-size: 1rem;
                padding: 8px;
            }
        }
        
        @media (max-width: 480px) {
            th, td {
                padding: 6px 3px;
                font-size: 12px;
            }
            
            button {
                padding: 8px 15px;
                font-size: 14px;
                min-width: 100px;
            }
            
            .year-info {
                font-size: 0.9rem;
                padding: 6px;
            }
        }
        
        @media print {
            body {
                padding: 0;
                background-color: white;
            }
            
            .cont {
                box-shadow: none;
                padding: 0;
            }
            
            button {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <form action="" method="post">
            <!-- Academic Year Information -->
            <div class="year-info">
                📅 Academic Year: <strong><?php echo $academic_year_name; ?></strong>
            </div>
            
            <div class="term-header">
                Term <?php echo htmlspecialchars($term); ?>
            </div>
            
            <?php
            // Check if any marks exist for this term
            $check_query = "SELECT COUNT(*) as count FROM marks 
                          WHERE cid = '$class' 
                          AND tid = '$me' 
                          AND mid = '$module'
                          AND team = '$term'
                          AND year = '$year_id'";
            
            $check_result = mysqli_query($conn, $check_query);
            
            if (!$check_result) {
                echo '<div class="error-message">Database error: ' . mysqli_error($conn) . '</div>';
            } else {
                $row = mysqli_fetch_assoc($check_result);
                if ($row['count'] <= 0) {
                    echo '<div class="info-message">No marks have been entered for this term yet. Showing all students with empty marks.</div>';
                }
            }
            
            // Get class/module info
            $sel = mysqli_query($conn, "SELECT class.level, module.mname 
                                     FROM class 
                                     JOIN module ON module.moid = '$module'
                                     WHERE class.cid = '$class'");
            ?>
            
            <table>
                <caption>
                    <?php
                    if ($sel && mysqli_num_rows($sel) > 0) {
                        $b = mysqli_fetch_array($sel);
                        echo htmlspecialchars($b['level']." - ".$b['mname']);
                    } else {
                        echo "Class/Module Information";
                    }
                    ?>
                </caption>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Student Name</th>
                        <th>Test</th>
                        <th>Test Total</th>
                        <th>Exam</th>
                        <th>Exam Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    // FIXED QUERY: Use LEFT JOIN to get ALL students even those without marks
                    $select_query = "SELECT 
                                        s.sid, 
                                        s.firstname, 
                                        s.lastname,
                                        m.test, 
                                        m.ttotal, 
                                        m.exam, 
                                        m.etotal 
                                    FROM student s
                                    INNER JOIN student_promotion_log spl ON s.sid = spl.sid 
                                    LEFT JOIN marks m ON m.sid = s.sid 
                                        AND m.team = '$term'
                                        AND m.year = '$year_id'
                                        AND m.cid = '$class'
                                        AND m.tid = '$me'
                                        AND m.mid = '$module'
                                    WHERE spl.to_class = '$class'
                                    AND spl.to_year = '$year_id'
                                    AND s.status = 'Active'
                                    ORDER BY s.firstname ASC";
                    
                    $select = mysqli_query($conn, $select_query);
                    
                    if (!$select) {
                        echo '<tr><td colspan="6" class="error-message">Error loading marks: ' . mysqli_error($conn) . '</td></tr>';
                        error_log("Query error: " . mysqli_error($conn));
                    } elseif (mysqli_num_rows($select) > 0) {
                        $no = 0;
                        while ($a = mysqli_fetch_array($select)) {
                            $no++;
                            
                            // Check if marks exist for this student
                            $has_test = isset($a['test']) && $a['test'] !== null && $a['test'] !== '';
                            $has_exam = isset($a['exam']) && $a['exam'] !== null && $a['exam'] !== '';
                            
                            echo "<tr>";
                            echo "<td>" . $no . "</td>";
                            echo "<td>" . htmlspecialchars($a['firstname'] . " " . $a['lastname']) . "</td>";
                            
                            // Test column
                            if ($has_test) {
                                echo "<td>" . htmlspecialchars($a['test']) . "</td>";
                            } else {
                                echo "<td class='empty-mark'>-</td>";
                            }
                            
                            // Test Total column
                            if ($has_test && isset($a['ttotal'])) {
                                echo "<td>" . htmlspecialchars($a['ttotal']) . "</td>";
                            } else {
                                echo "<td class='empty-mark'>-</td>";
                            }
                            
                            // Exam column
                            if ($has_exam) {
                                echo "<td>" . htmlspecialchars($a['exam']) . "</td>";
                            } else {
                                echo "<td class='empty-mark'>-</td>";
                            }
                            
                            // Exam Total column
                            if ($has_exam && isset($a['etotal'])) {
                                echo "<td>" . htmlspecialchars($a['etotal']) . "</td>";
                            } else {
                                echo "<td class='empty-mark'>-</td>";
                            }
                            
                            echo "</tr>";
                        }
                        
                        // Add summary row showing statistics
                        echo "<tr style='background-color: #e8f5e8; font-weight: bold;'>";
                        echo "<td colspan='2'>Summary</td>";
                        echo "<td colspan='4'>Total Students: " . $no . " | ";
                        
                        // Count students with marks
                        $marks_count_query = "SELECT COUNT(*) as count FROM marks 
                                            WHERE cid = '$class' 
                                            AND tid = '$me' 
                                            AND mid = '$module'
                                            AND team = '$term'
                                            AND year = '$year_id'";
                        $marks_count_result = mysqli_query($conn, $marks_count_query);
                        if ($marks_count_result) {
                            $marks_count = mysqli_fetch_assoc($marks_count_result);
                            echo "Students with marks: " . $marks_count['count'];
                        }
                        echo "</td></tr>";
                        
                    } else {
                        echo '<tr><td colspan="6" class="empty-mark">No active students found in this class for the selected academic year</td></tr>';
                    }
                    ?>
                </tbody>
            </table>
            
            <div class="button-container">
                <button type="submit" name="edit">Edit Marks</button>
                <button type="button" onclick="window.print()">Print</button>
                <button type="button" onclick="window.location.href='mymodules.php'">Back to Modules</button>
            </div>
            
            <?php
            if (isset($_POST['edit'])) {
                $_SESSION['edit_class'] = $class;
                $_SESSION['edit_module'] = $module;
                $_SESSION['edit_term'] = $term;
                $_SESSION['edit_year'] = $year_id;
                header("Location: edit.php");
                exit();
            }
            ?>
        </form>
    </div>
</body>
</html>