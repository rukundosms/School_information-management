<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Get term and year from session
$term = isset($_SESSION['term']) ? $_SESSION['term'] : 1;
$year_id = isset($_SESSION['year']) ? $_SESSION['year'] : null;

// If year_id is not set, get active year
if (!$year_id) {
    $year_query = mysqli_query($conn, "SELECT year_id FROM year WHERE status = 'active' LIMIT 1");
    if ($year_data = mysqli_fetch_assoc($year_query)) {
        $year_id = $year_data['year_id'];
    }
}

// Determine term field based on term
if ($term == 1) {
    $term_field = "term1";
    $max_field = "term1_max";
    $rank_field = "term1_rank";
    $all_field = "term1_all";
    $term_name = "1st Term";
} elseif ($term == 2) {
    $term_field = "term2";
    $max_field = "term2_max";
    $rank_field = "term2_rank";
    $all_field = "term2_all";
    $term_name = "2nd Term";
} elseif ($term == 3) {
    $term_field = "term3";
    $max_field = "term3_max";
    $rank_field = "term3_rank";
    $all_field = "term3_all";
    $term_name = "3rd Term";
} elseif ($term == "year") {
    $term_field = "yearl";
    $max_field = "yearl_max";
    $rank_field = "yearl_rank";
    $all_field = "year_all";
    $term_name = "Annual";
} else {
    $term_field = "term1";
    $max_field = "term1_max";
    $rank_field = "term1_rank";
    $all_field = "term1_all";
    $term_name = "1st Term";
}

// Get actual year value
$year_query = mysqli_query($conn, "SELECT * FROM year WHERE year_id = '$year_id'");
if ($year_data = mysqli_fetch_assoc($year_query)) {
    $actual_year = $year_data['year'];
} else {
    $actual_year = date('Y');
}

$ranks_year = $year_id;
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Ranking Report - <?php echo $term_name; ?> <?php echo htmlspecialchars($actual_year); ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f5f5f5;
        padding: 20px;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    /* Report Header */
    .report-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 15px;
        border-bottom: 3px solid #4CAF50;
    }

    .school-name {
        font-size: 24px;
        font-weight: bold;
        color: #4CAF50;
        margin-bottom: 5px;
    }

    .report-type {
        font-size: 18px;
        color: #666;
        margin-bottom: 5px;
    }

    .term-year {
        font-size: 14px;
        color: #888;
    }

    /* List Sections */
    .list {
        margin-bottom: 40px;
        page-break-inside: avoid;
    }

    .title {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        color: #4CAF50;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #4CAF50;
    }

    /* Tables */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 13px;
    }

    th {
        background-color: #4CAF50;
        color: white;
        padding: 10px 8px;
        text-align: left;
        font-weight: 600;
    }

    td {
        padding: 8px;
        border-bottom: 1px solid #ddd;
    }

    tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    /* Class Containers */
    .class-container {
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        margin: 20px 0;
        padding: 15px;
        page-break-after: always;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .class-header {
        text-align: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #4CAF50;
    }

    .class-title {
        font-size: 18px;
        color: #4CAF50;
        font-weight: bold;
        margin-bottom: 5px;
    }

    .class-subtitle {
        font-size: 12px;
        color: #666;
    }

    .report-footer {
        text-align: center;
        padding: 10px;
        font-size: 11px;
        color: #666;
        border-top: 1px solid #ddd;
        margin-top: 15px;
    }

    /* Performance Badges */
    .performance-excellent, .performance-very-good, .performance-good, 
    .performance-average, .performance-needs-improvement, .performance-failed {
        padding: 3px 8px;
        border-radius: 4px;
        display: inline-block;
        font-size: 11px;
        font-weight: bold;
    }

    .performance-excellent { color: #198754; background: rgba(25, 135, 84, 0.1); }
    .performance-very-good { color: #0d6efd; background: rgba(13, 110, 253, 0.1); }
    .performance-good { color: #20c997; background: rgba(32, 201, 151, 0.1); }
    .performance-average { color: #ffc107; background: rgba(255, 193, 7, 0.1); }
    .performance-needs-improvement { color: #fd7e14; background: rgba(253, 126, 20, 0.1); }
    .performance-failed { color: #dc3545; background: rgba(220, 53, 69, 0.1); }

    /* Rank Colors */
    .gold { background-color: #FFD700 !important; font-weight: bold; }
    .silver { background-color: #C0C0C0 !important; font-weight: bold; }
    .bronze { background-color: #CD7F32 !important; font-weight: bold; color: white; }
    .warning-row { background-color: #fff3cd !important; }
    .danger-row { background-color: #f8d7da !important; }

    .print-button {
        display: block;
        padding: 12px 24px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin: 20px auto;
        transition: background 0.3s;
    }

    .print-button:hover {
        background-color: #45a049;
    }

    .no-data {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
    }

    /* Print Styles */
    @media print {
        body {
            background: white;
            padding: 0;
            margin: 0;
        }
        
        .container {
            max-width: 100%;
            padding: 0;
            margin: 0;
            box-shadow: none;
        }
        
        .print-button {
            display: none;
        }
        
        .list {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .class-container {
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0;
            padding: 10px;
            border: 1px solid #ddd;
        }
        
        .class-container:last-child {
            page-break-after: auto;
        }
        
        table {
            font-size: 10pt;
        }
        
        th, td {
            padding: 5px;
        }
        
        th {
            background-color: #f0f0f0 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .gold, .silver, .bronze {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        thead {
            display: table-header-group;
        }
        
        .report-header {
            margin-bottom: 15px;
        }
        
        .school-name {
            font-size: 20px;
        }
    }
    
    @page {
        size: A4;
        margin: 1.5cm;
    }
    </style>
</head>

<body>
    <div class="container">
        <!-- Report Header -->
        <div class="report-header">
            <div class="school-name">Collegio Santo Antonio Maria Zaccaria TSS/Gicumbi</div>
            <div class="report-type">STUDENT RANKING REPORT - <?php echo $term_name; ?></div>
            <div class="term-year">Academic Year: <?php echo htmlspecialchars($actual_year); ?></div>
            <div style="font-size: 11px; color: #999; margin-top: 5px;">
                Generated on: <?php echo date('F j, Y'); ?>
            </div>
        </div>

        <!-- Top 20 Best Performers -->
        <div class="list">
            <div class="title">TOP 20 BEST PERFORMERS - <?php echo $term_name; ?> <?php echo htmlspecialchars($actual_year); ?></div>
            <?php
            $top_students_query = "
                SELECT DISTINCT s.sid, s.firstname, s.lastname, 
                       spl.to_class as class_id,
                       c.class_name, c.level,
                       CASE 
                           WHEN r.$max_field > 0 AND r.$max_field IS NOT NULL
                           THEN ROUND((r.$term_field * 100.0) / r.$max_field, 2)
                           ELSE 0 
                       END as percentage
                FROM student_promotion_log spl
                INNER JOIN student s ON spl.sid = s.sid AND s.status = 'Active'
                LEFT JOIN class c ON spl.to_class = c.cid
                INNER JOIN ranks r ON s.sid = r.sit AND r.year = '$ranks_year'
                WHERE spl.to_year = '$year_id'
                AND spl.to_class != 0
                AND spl.to_class IS NOT NULL
                AND r.$term_field IS NOT NULL
                AND r.$term_field > 0
                ORDER BY percentage DESC, s.firstname ASC
                LIMIT 20
            ";
            
            $top_result = mysqli_query($conn, $top_students_query);
            
            if (!$top_result) {
                echo "<div class='no-data'>Query Error: " . mysqli_error($conn) . "</div>";
            } elseif (mysqli_num_rows($top_result) > 0) {
                echo "<table>";
                echo "<thead>";
                echo "<tr>";
                echo "<th width='10%'>Rank</th>";
                echo "<th width='35%'>Student Name</th>";
                echo "<th width='25%'>Class</th>";
                echo "<th width='15%'>Percentage (%)</th>";
                echo "<th width='15%'>Performance</th>";
                echo "</tr>";
                echo "</thead>";
                echo "<tbody>";
                
                $rank = 1;
                $prev_percentage = null;
                $display_rank = 1;
                
                while ($student = mysqli_fetch_assoc($top_result)) {
                    $current_percentage = $student['percentage'];
                    
                    if ($current_percentage != $prev_percentage && $prev_percentage !== null) {
                        $display_rank = $rank;
                    }
                    
                    $row_class = "";
                    if ($display_rank == 1) $row_class = "gold";
                    elseif ($display_rank == 2) $row_class = "silver";
                    elseif ($display_rank == 3) $row_class = "bronze";
                    
                    $class_display = "Unknown";
                    if (!empty($student['level']) && !empty($student['class_name'])) {
                        $class_display = htmlspecialchars($student['level'] . $student['class_name']);
                    } elseif (!empty($student['class_id'])) {
                        $class_display = "Class ID: " . htmlspecialchars($student['class_id']);
                    }
                    
                    $performance = "";
                    $performance_class = "";
                    if ($current_percentage >= 90) {
                        $performance = "Excellent";
                        $performance_class = "performance-excellent";
                    } elseif ($current_percentage >= 80) {
                        $performance = "Very Good";
                        $performance_class = "performance-very-good";
                    } elseif ($current_percentage >= 60) {
                        $performance = "Good";
                        $performance_class = "performance-good";
                    } elseif ($current_percentage >= 50) {
                        $performance = "Average";
                        $performance_class = "performance-average";
                    } elseif ($current_percentage >= 40) {
                        $performance = "Needs Improvement";
                        $performance_class = "performance-needs-improvement";
                    } else {
                        $performance = "Failed";
                        $performance_class = "performance-failed";
                    }
                    
                    echo "<tr class='$row_class'>";
                    echo "<td>" . $display_rank . "</td>";
                    echo "<td>" . htmlspecialchars($student['firstname'] . " " . $student['lastname']) . "</td>";
                    echo "<td>" . $class_display . "</td>";
                    echo "<td>" . min(100, round($current_percentage, 2)) . "%</td>";
                    echo "<td><span class='$performance_class'>$performance</span></td>";
                    echo "</tr>";
                    
                    $rank++;
                    $prev_percentage = $current_percentage;
                }
                
                echo "</tbody>";
                echo "<tfoot>";
                echo "<tr><td colspan='5' style='text-align: center; padding: 8px; font-style: italic; color: #666;'>";
                echo "Top 20 Students based on $term_name performance";
                echo "</td></tr>";
                echo "</tfoot>";
                echo "</table>";
            } else {
                echo "<div class='no-data'>No students have marks data for $term_name to rank.</div>";
            }
            ?>
        </div>

        <!-- Bottom 20 Performers -->
        <div class="list">
            <div class="title">BOTTOM 20 PERFORMERS - <?php echo $term_name; ?> <?php echo htmlspecialchars($actual_year); ?></div>
            <?php
            $total_count_query = "
                SELECT COUNT(DISTINCT s.sid) as total
                FROM student_promotion_log spl
                INNER JOIN student s ON spl.sid = s.sid AND s.status = 'Active'
                INNER JOIN ranks r ON s.sid = r.sit AND r.year = '$ranks_year'
                WHERE spl.to_year = '$year_id'
                AND spl.to_class != 0
                AND spl.to_class IS NOT NULL
                AND r.$term_field IS NOT NULL
                AND r.$term_field > 0
            ";
            
            $total_count_result = mysqli_query($conn, $total_count_query);
            $total_row = mysqli_fetch_assoc($total_count_result);
            $total_students_with_marks = $total_row['total'];
            
            $bottom_students_query = "
                SELECT DISTINCT s.sid, s.firstname, s.lastname, 
                       spl.to_class as class_id,
                       c.class_name, c.level,
                       CASE 
                           WHEN r.$max_field > 0 AND r.$max_field IS NOT NULL
                           THEN ROUND((r.$term_field * 100.0) / r.$max_field, 2)
                           ELSE 0 
                       END as percentage
                FROM student_promotion_log spl
                INNER JOIN student s ON spl.sid = s.sid AND s.status = 'Active'
                LEFT JOIN class c ON spl.to_class = c.cid
                INNER JOIN ranks r ON s.sid = r.sit AND r.year = '$ranks_year'
                WHERE spl.to_year = '$year_id'
                AND spl.to_class != 0
                AND spl.to_class IS NOT NULL
                AND r.$term_field IS NOT NULL
                AND r.$term_field > 0
                ORDER BY percentage ASC, s.firstname ASC
                LIMIT 20
            ";
            
            $bottom_result = mysqli_query($conn, $bottom_students_query);
            
            if (mysqli_num_rows($bottom_result) > 0) {
                echo "<table>";
                echo "<thead>";
                echo "<tr>";
                echo "<th width='15%'>School Rank</th>";
                echo "<th width='35%'>Student Name</th>";
                echo "<th width='25%'>Class</th>";
                echo "<th width='15%'>Percentage (%)</th>";
                echo "<th width='10%'>Performance</th>";
                echo "</tr>";
                echo "</thead>";
                echo "<tbody>";
                
                $rank = 0;
                
                while ($student = mysqli_fetch_assoc($bottom_result)) {
                    $rank++;
                    $current_percentage = $student['percentage'];
                    
                    $class_display = "Unknown";
                    if (!empty($student['level']) && !empty($student['class_name'])) {
                        $class_display = htmlspecialchars($student['level'] . $student['class_name']);
                    } elseif (!empty($student['class_id'])) {
                        $class_display = "Class ID: " . htmlspecialchars($student['class_id']);
                    }
                    
                    $performance = "";
                    $performance_class = "";
                    if ($current_percentage >= 90) {
                        $performance = "Excellent";
                        $performance_class = "performance-excellent";
                    } elseif ($current_percentage >= 80) {
                        $performance = "Very Good";
                        $performance_class = "performance-very-good";
                    } elseif ($current_percentage >= 60) {
                        $performance = "Good";
                        $performance_class = "performance-good";
                    } elseif ($current_percentage >= 50) {
                        $performance = "Average";
                        $performance_class = "performance-average";
                    } elseif ($current_percentage >= 40) {
                        $performance = "Needs Improvement";
                        $performance_class = "performance-needs-improvement";
                    } else {
                        $performance = "Failed";
                        $performance_class = "performance-failed";
                    }
                    
                    $school_rank = $total_students_with_marks - 20 + $rank;
                    
                    $row_class = "";
                    if ($current_percentage < 40) {
                        $row_class = "danger-row";
                    } elseif ($current_percentage < 50) {
                        $row_class = "warning-row";
                    }
                    
                    echo "<tr class='$row_class'>";
                    echo "<td>" . $school_rank . "</td>";
                    echo "<td>" . htmlspecialchars($student['firstname'] . " " . $student['lastname']) . "</td>";
                    echo "<td>" . $class_display . "</td>";
                    echo "<td>" . min(100, round($current_percentage, 2)) . "%</td>";
                    echo "<td><span class='$performance_class'>$performance</span></td>";
                    echo "</tr>";
                }
                
                echo "</tbody>";
                echo "<tfoot>";
                echo "<tr><td colspan='5' style='text-align: center; padding: 8px; font-style: italic; color: #666;'>";
                echo "Bottom 20 Students | Total Students with $term_name Marks: " . $total_students_with_marks;
                echo "</td></tr>";
                echo "</tfoot>";
                echo "</table>";
            } else {
                echo "<div class='no-data'>No students have marks data for $term_name to rank.</div>";
            }
            ?>
        </div>

        <!-- Class-wise Ranking -->
        <div class="list">
            <div class="title">CLASS-WISE RANKING - <?php echo $term_name; ?> <?php echo htmlspecialchars($actual_year); ?></div>
            <?php
            $classes_query = "
                SELECT DISTINCT spl.to_class as class_id, 
                       c.class_name, c.level,
                       COUNT(DISTINCT s.sid) as total_students,
                       SUM(CASE WHEN r.$term_field > 0 THEN 1 ELSE 0 END) as students_with_marks
                FROM student_promotion_log spl
                INNER JOIN student s ON spl.sid = s.sid AND s.status = 'Active'
                LEFT JOIN class c ON spl.to_class = c.cid
                LEFT JOIN ranks r ON s.sid = r.sit AND r.year = '$ranks_year'
                WHERE spl.to_year = '$year_id'
                AND spl.to_class != 0
                AND spl.to_class IS NOT NULL
                GROUP BY spl.to_class, c.class_name, c.level
                ORDER BY c.level, c.class_name
            ";
            
            $classes_result = mysqli_query($conn, $classes_query);
            
            if (mysqli_num_rows($classes_result) > 0) {
                while($class_row = mysqli_fetch_assoc($classes_result)) {
                    $class_id = $class_row['class_id'];
                    $class_name = $class_row['class_name'];
                    $level = $class_row['level'];
                    $students_with_marks = $class_row['students_with_marks'];
                    
                    $class_display_name = "";
                    if (!empty($level) && !empty($class_name)) {
                        $class_display_name = htmlspecialchars($level . $class_name);
                    } elseif (!empty($class_id)) {
                        $class_display_name = "Class ID: $class_id";
                    } else {
                        continue;
                    }
                    
                    echo "<div class='class-container'>";
                    echo "<div class='class-header'>";
                    echo "<div class='class-title'>$class_display_name</div>";
                    echo "<div class='class-subtitle'>";
                    echo "$term_name Performance Ranking | Students with marks: $students_with_marks";
                    echo "</div>";
                    echo "</div>";
                    
                    $class_students_query = "
                        SELECT s.sid, s.firstname, s.lastname,
                               CASE 
                                   WHEN r.$max_field > 0 AND r.$max_field IS NOT NULL
                                   THEN ROUND((r.$term_field * 100.0) / r.$max_field, 2)
                                   ELSE 0 
                               END as percentage
                        FROM student_promotion_log spl
                        INNER JOIN student s ON spl.sid = s.sid AND s.status = 'Active'
                        LEFT JOIN ranks r ON s.sid = r.sit AND r.year = '$ranks_year'
                        WHERE spl.to_year = '$year_id'
                        AND spl.to_class = '$class_id'
                        AND r.$term_field IS NOT NULL
                        AND r.$term_field > 0
                        ORDER BY percentage DESC, s.firstname ASC
                    ";
                    
                    $class_students_result = mysqli_query($conn, $class_students_query);
                    
                    if (mysqli_num_rows($class_students_result) > 0) {
                        echo "<table>";
                        echo "<thead>";
                        echo "<tr>";
                        echo "<th width='15%'>Class Rank</th>";
                        echo "<th width='55%'>Student Name</th>";
                        echo "<th width='15%'>Percentage (%)</th>";
                        echo "<th width='15%'>Performance</th>";
                        echo "</tr>";
                        echo "</thead>";
                        echo "<tbody>";
                        
                        $class_count = 0;
                        $prev_class_percentage = null;
                        $display_class_rank = 1;
                        
                        while ($student = mysqli_fetch_assoc($class_students_result)) {
                            $class_count++;
                            $current_percentage = $student['percentage'];
                            
                            if ($current_percentage != $prev_class_percentage && $prev_class_percentage !== null) {
                                $display_class_rank = $class_count;
                            } else if ($class_count == 1) {
                                $display_class_rank = 1;
                            }
                            
                            $row_class = "";
                            if ($display_class_rank == 1) $row_class = "gold";
                            elseif ($display_class_rank == 2) $row_class = "silver";
                            elseif ($display_class_rank == 3) $row_class = "bronze";
                            
                            $performance = "";
                            $performance_class = "";
                            if ($current_percentage >= 90) {
                                $performance = "Excellent";
                                $performance_class = "performance-excellent";
                            } elseif ($current_percentage >= 80) {
                                $performance = "Very Good";
                                $performance_class = "performance-very-good";
                            } elseif ($current_percentage >= 60) {
                                $performance = "Good";
                                $performance_class = "performance-good";
                            } elseif ($current_percentage >= 50) {
                                $performance = "Average";
                                $performance_class = "performance-average";
                            } elseif ($current_percentage >= 40) {
                                $performance = "Needs Improvement";
                                $performance_class = "performance-needs-improvement";
                            } else {
                                $performance = "Failed";
                                $performance_class = "performance-failed";
                            }
                            
                            echo "<tr class='$row_class'>";
                            echo "<td>" . $display_class_rank . "</td>";
                            echo "<td>" . htmlspecialchars($student['firstname'] . " " . $student['lastname']) . "</td>";
                            echo "<td>" . min(100, round($current_percentage, 2)) . "%</td>";
                            echo "<td><span class='$performance_class'>$performance</span></td>";
                            echo "</tr>";
                            
                            $prev_class_percentage = $current_percentage;
                        }
                        
                        echo "</tbody>";
                        echo "<tfoot>";
                        echo "<tr><td colspan='4' style='text-align: center; padding: 8px; font-style: italic; color: #666;'>";
                        echo "School Manager: _________________________________________ | Date: " . date('d/m/Y');
                        echo "</td></tr>";
                        echo "</tfoot>";
                        echo "</table>";
                    } else {
                        echo "<div class='no-data'>No students in this class have $term_name marks to rank.</div>";
                    }
                    
                    echo "<div class='report-footer'>";
                    echo "End of $class_display_name Ranking Report - $term_name $actual_year";
                    echo "</div>";
                    
                    echo "</div>";
                }
            } else {
                echo "<div class='no-data'>No classes found with students.</div>";
            }
            ?>
        </div>

        <button class="print-button" onclick="window.print();">
            <i class="fas fa-print"></i> Print Report
        </button>
    </div>
    
    <script>
    function printPage() {
        window.print();
    }
    </script>
</body>
</html>