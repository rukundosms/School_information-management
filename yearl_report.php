<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Get parameters - default to session values but allow override
$class = isset($_GET['class']) ? $_GET['class'] : $_SESSION['cl'];
$year_id = isset($_GET['year_id']) ? $_GET['year_id'] : null;

// If year_id is not provided, get the active year
if (!$year_id) {
    $active_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status='active' ORDER BY created_at DESC LIMIT 1");
    if (mysqli_num_rows($active_year_query) > 0) {
        $active_year_row = mysqli_fetch_array($active_year_query);
        $year_id = $active_year_row['year_id'];
        $selected_year = $active_year_row['year'];
    } else {
        die("No academic year found!");
    }
} else {
    $year_query = mysqli_query($conn, "SELECT year FROM year WHERE year_id='$year_id'");
    $year_row = mysqli_fetch_array($year_query);
    $selected_year = $year_row['year'];
}

// --- Step 1: Get students who were in this class during the selected year ---
// FIXED: Get only students who were actually in this class during this specific academic year
$active_students = mysqli_query($conn, "
    SELECT DISTINCT s.sid 
    FROM student s 
    WHERE s.status='Active'
    AND (
        -- Student is currently in this class AND registered in the selected year
        (s.class='$class' AND s.registed_year = '$year_id')
        OR EXISTS (
            -- Student was promoted to/from this class in the selected year
            SELECT 1 FROM student_promotion_log spl 
            WHERE spl.sid = s.sid 
            AND (
                -- Student was in this class in the selected year (to_year)
                (spl.to_year = '$year_id' AND spl.to_class = '$class')
                OR
                -- Student left this class in the selected year (from_year)
                (spl.from_year = '$year_id' AND spl.from_class = '$class')
            )
        )
    )
");

// Create rank records for students who don't have them
while ($student = mysqli_fetch_array($active_students)) {
    $student_id = $student['sid'];
    $rank_check = mysqli_query($conn, "SELECT sit FROM ranks WHERE sit='$student_id' AND year='$year_id'");
    if (mysqli_num_rows($rank_check) == 0) {
        mysqli_query($conn, "INSERT INTO ranks (sit, year) VALUES ('$student_id', '$year_id')");
    }
}

// --- Step 2: Pre-calculate and Update Annual Totals ---
$rank_update_query = mysqli_query($conn, "
    SELECT
        s.sid, 
        COALESCE(r.term1, 0) as term1, 
        COALESCE(r.term2, 0) as term2, 
        COALESCE(r.term3, 0) as term3, 
        COALESCE(r.term1_max, 0) as term1_max, 
        COALESCE(r.term2_max, 0) as term2_max, 
        COALESCE(r.term3_max, 0) as term3_max
    FROM
        student s
    LEFT JOIN
        ranks r ON s.sid = r.sit AND r.year = '$year_id'
    WHERE
        s.status='Active'
        AND (
            -- Student is currently in this class AND registered in the selected year
            (s.class='$class' AND s.registed_year = '$year_id')
            OR EXISTS (
                -- Student was promoted to/from this class in the selected year
                SELECT 1 FROM student_promotion_log spl 
                WHERE spl.sid = s.sid 
                AND (
                    -- Student was in this class in the selected year (to_year)
                    (spl.to_year = '$year_id' AND spl.to_class = '$class')
                    OR
                    -- Student left this class in the selected year (from_year)
                    (spl.from_year = '$year_id' AND spl.from_class = '$class')
                )
            )
        )
");

while ($d = mysqli_fetch_array($rank_update_query)) {
    $student_id = $d['sid'];
    $yearl = (float)$d['term1'] + (float)$d['term2'] + (float)$d['term3'];
    $yearl_max = (float)$d['term1_max'] + (float)$d['term2_max'] + (float)$d['term3_max'];

    mysqli_query($conn, "UPDATE ranks SET yearl='$yearl', yearl_max='$yearl_max' WHERE sit='$student_id' AND year='$year_id'");
}

// --- Step 3: Fetch all necessary data ---
$school_query = mysqli_query($conn, "SELECT * FROM school LIMIT 1");
$sc = mysqli_fetch_array($school_query);

$class_query = mysqli_query($conn, "SELECT * FROM class WHERE cid='$class'");
$aq = mysqli_fetch_array($class_query);

// Get all active students with their rank data for the selected year
// FIXED: Check only for the specific academic year
$select_students = mysqli_query($conn, "
    SELECT
        s.*, 
        COALESCE(r.term1, 0) as term1,
        COALESCE(r.term2, 0) as term2,
        COALESCE(r.term3, 0) as term3,
        COALESCE(r.term1_max, 0) as term1_max,
        COALESCE(r.term2_max, 0) as term2_max,
        COALESCE(r.term3_max, 0) as term3_max,
        COALESCE(r.term1_rank, 0) as term1_rank,
        COALESCE(r.term2_rank, 0) as term2_rank,
        COALESCE(r.term3_rank, 0) as term3_rank,
        COALESCE(r.term1_all, 0) as term1_all,
        COALESCE(r.term2_all, 0) as term2_all,
        COALESCE(r.term3_all, 0) as term3_all,
        COALESCE(r.yearl, 0) as yearl,
        COALESCE(r.yearl_max, 0) as yearl_max,
        CASE
            WHEN COALESCE(r.yearl_max, 0) > 0 THEN (COALESCE(r.yearl, 0) * 100.0 / COALESCE(r.yearl_max, 0))
            ELSE 0
        END AS yearly_percentage
    FROM
        student s
    LEFT JOIN
        ranks r ON s.sid = r.sit AND r.year = '$year_id'
    WHERE
        s.status='Active'
        AND (
            -- Student is currently in this class AND registered in the selected year
            (s.class='$class' AND s.registed_year = '$year_id')
            OR EXISTS (
                -- Student was promoted to/from this class in the selected year
                SELECT 1 FROM student_promotion_log spl 
                WHERE spl.sid = s.sid 
                AND (
                    -- Student was in this class in the selected year (to_year)
                    (spl.to_year = '$year_id' AND spl.to_class = '$class')
                    OR
                    -- Student left this class in the selected year (from_year)
                    (spl.from_year = '$year_id' AND spl.from_class = '$class')
                )
            )
        )
    ORDER BY
        yearly_percentage DESC, COALESCE(r.yearl, 0) DESC
");

$all_students_count = mysqli_num_rows(mysqli_query($conn, "
    SELECT DISTINCT s.sid 
    FROM student s
    WHERE s.status='Active'
    AND (
        -- Student is currently in this class AND registered in the selected year
        (s.class='$class' AND s.registed_year = '$year_id')
        OR EXISTS (
            -- Student was promoted to/from this class in the selected year
            SELECT 1 FROM student_promotion_log spl 
            WHERE spl.sid = s.sid 
            AND (
                -- Student was in this class in the selected year (to_year)
                (spl.to_year = '$year_id' AND spl.to_class = '$class')
                OR
                -- Student left this class in the selected year (from_year)
                (spl.from_year = '$year_id' AND spl.from_class = '$class')
            )
        )
    )
"));

// Fetch conduct data for the selected year and class
$conduct_data = [];
$conduct_query = mysqli_query($conn, "
    SELECT c.* 
    FROM conduct c 
    JOIN student s ON c.sid = s.sid 
    WHERE c.year = '$year_id'
    AND (
        -- Student is currently in this class AND registered in the selected year
        (s.class='$class' AND s.registed_year = '$year_id')
        OR EXISTS (
            -- Student was promoted to/from this class in the selected year
            SELECT 1 FROM student_promotion_log spl 
            WHERE spl.sid = s.sid 
            AND (
                -- Student was in this class in the selected year (to_year)
                (spl.to_year = '$year_id' AND spl.to_class = '$class')
                OR
                -- Student left this class in the selected year (from_year)
                (spl.from_year = '$year_id' AND spl.from_class = '$class')
            )
        )
    )
");
while ($cnd = mysqli_fetch_array($conduct_query)) {
    $conduct_data[$cnd['sid']] = $cnd;
}

// Fetch module data for the class (based on class ID)
$modules_complementary = [];
$modules_general = [];
$modules_specific = [];
$modules_query = mysqli_query($conn, "SELECT * FROM module WHERE class='$class' ORDER BY mcode ASC");
while ($module_row = mysqli_fetch_array($modules_query)) {
    if ($module_row['module_type'] == 'complementary') {
        $modules_complementary[] = $module_row;
    } elseif ($module_row['module_type'] == 'general') {
        $modules_general[] = $module_row;
    } elseif ($module_row['module_type'] == 'specific') {
        $modules_specific[] = $module_row;
    }
}

// Fetch marks data for the selected year
$marks_data = [];
$marks_query = mysqli_query($conn, "
    SELECT m.* 
    FROM marks m 
    JOIN student s ON m.sid = s.sid 
    WHERE m.year = '$year_id'
    AND (
        -- Student is currently in this class AND registered in the selected year
        (s.class='$class' AND s.registed_year = '$year_id')
        OR EXISTS (
            -- Student was promoted to/from this class in the selected year
            SELECT 1 FROM student_promotion_log spl 
            WHERE spl.sid = s.sid 
            AND (
                -- Student was in this class in the selected year (to_year)
                (spl.to_year = '$year_id' AND spl.to_class = '$class')
                OR
                -- Student left this class in the selected year (from_year)
                (spl.from_year = '$year_id' AND spl.from_class = '$class')
            )
        )
    )
");
while ($mark_row = mysqli_fetch_array($marks_query)) {
    $marks_data[$mark_row['sid']][$mark_row['mid']][$mark_row['team']] = $mark_row;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yearly Report - Academic Year: <?php echo htmlspecialchars($selected_year); ?></title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: sans-serif;
            box-sizing: border-box;
        }

        img {
            max-width: 100%;
            height: auto;
        }

        .cont {
            width: 100%;
            margin: 2% auto;
            position: relative;
            min-height: 1020px;
            padding: 10px;
            padding-bottom: 15vh;
            background-color: #fff;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
        }

        .cont .bottom {
            width: 98%;
            height: 12vh;
            position: absolute;
            bottom: 10px;
            left: 1%;
            display: flex;
            text-align: center;
            justify-content: space-between;
            align-items: flex-end;
        }

        .a {
            width: 60%;
            height: 100%;
            text-align: left;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            position: relative;
        }

        .a p {
            font-size: 12px;
            margin-bottom: 2px;
        }

        .a img {
            position: absolute;
            bottom: 0;
            right: 0;
            height: 100%;
            max-height: 100px;
            width: auto;
        }

        .b {
            width: 40%;
            height: 100%;
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            text-align: left;
        }

        .first, .second {
            width: 48%;
            font-size: 12px;
        }

        .first u, .second u {
            font-weight: bold;
            margin-bottom: 5px;
            display: block;
        }

        .first span, .second span {
            display: inline-block;
            margin-right: 5px;
        }

        .first input[type="checkbox"], .second input[type="checkbox"] {
            vertical-align: middle;
        }

        .info {
            height: 135px;
            position: relative;
            width: 98%;
            margin-left: 1%;
        }

        .top {
            width: 100%;
            height: 80px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .school-logo, .rtb {
            width: 10%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .title {
            width: 70%;
            height: 5vh;
            padding-top: 8px;
            margin: 0 2%;
            text-align: center;
            border-radius: 3px;
            border: solid black 2px;
            font-weight: bold;
        }

        p {
            font-size: 12px;
            margin-bottom: 2px;
        }

        p span {
            font-size: 14px;
            font-weight: bold;
        }

        table {
            width: 98%;
            border-collapse: collapse;
            margin: 10px auto;
        }

        th, td {
            border: 1px solid black;
            padding: 5px;
            text-align: center;
            font-size: 10px;
        }

        .type {
            background-color: #f2f2f2;
            font-size: 12px;
            font-weight: bold;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }

            .cont {
                page-break-after: always;
                position: relative;
                height: 29.7cm;
                min-height: unset;
                margin: 0;
                padding-bottom: 15vh;
                box-shadow: none;
            }

            .cont .bottom {
                position: absolute;
                bottom: 10px;
                left: 1%;
                width: 98%;
                height: 12vh;
            }

            .print-button, .selection-form, #font {
                display: none !important;
            }
        }

        .print-button {
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
        }

        .print-button:hover {
            background-color: #0056b3;
        }
        
        .selection-form {
            background-color: #f8f9fa;
            padding: 20px;
            margin: 10px auto;
            width: 98%;
            border-radius: 5px;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        
        .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #0056b3;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #545b62;
        }
        
        .year-notice {
            background-color: #ffeaa7;
            padding: 10px;
            margin: 10px auto;
            width: 98%;
            border-radius: 5px;
            font-size: 14px;
            text-align: center;
            border: 1px solid #fdcb6e;
        }
        
        .no-data {
            text-align: center;
            padding: 50px;
            font-size: 18px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="cr" id='cr'>
        <?php
        if (mysqli_num_rows($select_students) == 0) {
            echo '<div class="no-data">No student records found for the selected academic year and class.</div>';
        } else {
            $count = 0;
            while ($a = mysqli_fetch_array($select_students)) {
                $student_id = $a['sid'];
                $count++;
                $current_conduct = $conduct_data[$student_id] ?? null;
        ?>
            <div class="cont" id='card<?php echo $count; ?>'>
                <div class="top">
                    <div class="school-logo">
                        <img src="images/logo.jpg" alt="School Logo">
                    </div>
                    <div class="title">TRAINEE'S ASSESSMENT REPORT</div>
                    <div class="rtb"><img src="images/rtb.png" alt="RTB Logo"></div>
                </div>
                <div class="info">
                    <p class="school-name"><span> School Name:</span><?php echo htmlspecialchars($sc['code'] . "-" . $sc['school_name']); ?></p>
                    <p class="email"><span> E-mail:</span><?php echo htmlspecialchars($sc['email']); ?></p>
                    <p class="phone"><span> Telephone:</span><?php echo htmlspecialchars($sc['phone']); ?></p>
                    <p class="qualification-code"><span> Qualification Code:</span><?php echo htmlspecialchars($aq['class_code']); ?></p>
                    <p class="qualification-name"><span> Qualification Name:</span><?php echo htmlspecialchars($aq['level'] . ' ' . $aq['class_name']); ?></p>
                    <p class="academic-year"><span> Academic Year:</span><?php echo htmlspecialchars($selected_year); ?></p>
                    <p class="trade"><span> Class:</span><?php echo htmlspecialchars($aq['level'] . ' ' . $aq['class_name']); ?></p>
                    <p class="student-name"><span> Student Name:</span> <?php echo htmlspecialchars($a['firstname'] . " " . $a['lastname']); ?></p>
                </div>
                <div class="table">
                    <table border="1">
                        <tr>
                            <th rowspan="2" colspan="2">Behavior</th><th>MAX</th><th colspan="3">TERM 1</th><th colspan="3">TERM 2</th>
                            <th colspan="3">TERM 3</th><th colspan="4">AVERAGE</th>
                        </tr>
                        <tr>
                            <td>40</td>
                            <td colspan="3">
                                <?php echo $current_conduct ? htmlspecialchars($current_conduct['term1']) : '-'; ?>
                            </td>
                            <td colspan="3">
                                <?php echo $current_conduct ? htmlspecialchars($current_conduct['term2']) : '-'; ?>
                            </td>
                            <td colspan="3">
                                <?php echo $current_conduct ? htmlspecialchars($current_conduct['term3']) : '-'; ?>
                            </td>
                            <td colspan="4">
                                <?php
                                if ($current_conduct) {
                                    $total_conduct_marks = (float)$current_conduct['term1'] + (float)$current_conduct['term2'] + (float)$current_conduct['term3'];
                                    echo round($total_conduct_marks * 40 / 120, 2);
                                } else {
                                    echo "-";
                                }
                                ?>
                            </td>
                        </tr>
                        <tr>
                            <th>N <sup><u>0</u></sup></th><th>MODULE CODE & TITLE</th><th>CREDITS</th><th>S.A</th><th>C.A</th>
                            <th>TOTAL</th><th>S.A</th><th>C.A</th><th>TOTAL</th><th>S.A</th><th>C.A</th><th>TOTAL</th>
                            <th>O.P</th><th>M.P</th><th>PERCENTAGE</th><th>DES</th>
                        </tr>
                        <?php
                        $module_no = 0;
                        $module_categories = [
                            'COMPLEMENTARY' => $modules_complementary,
                            'GENERAL' => $modules_general,
                            'SPECIFIC' => $modules_specific
                        ];

                        foreach ($module_categories as $category_name => $modules_list) {
                            if (count($modules_list) > 0) {
                                echo "<tr><td colspan='16' class='type'><center>" . htmlspecialchars($category_name) . "</center></td></tr>";
                                foreach ($modules_list as $b) {
                                    $module_id = $b['moid'];
                                    $term1_mark = $marks_data[$student_id][$module_id][1] ?? ['test' => '', 'exam' => '', 'ototal' => '', 'ttotal' => '', 'etotal' => ''];
                                    $term2_mark = $marks_data[$student_id][$module_id][2] ?? ['test' => '', 'exam' => '', 'ototal' => '', 'ttotal' => '', 'etotal' => ''];
                                    $term3_mark = $marks_data[$student_id][$module_id][3] ?? ['test' => '', 'exam' => '', 'ototal' => '', 'ttotal' => '', 'etotal' => ''];

                                    $module_no++;
                                    echo "<tr><td>" . $module_no . "</td><td>" . htmlspecialchars($b['mcode']) . "|" . htmlspecialchars($b['mname']) . "</td><td>" . htmlspecialchars($b['credit']) . "</td><td>"
                                        . htmlspecialchars($term1_mark['test']) . "</td><td>" . htmlspecialchars($term1_mark['exam']) . "</td><td>" . htmlspecialchars($term1_mark['ototal']) . "</td><td>"
                                        . htmlspecialchars($term2_mark['test']) . "</td><td>" . htmlspecialchars($term2_mark['exam']) . "</td><td>" . htmlspecialchars($term2_mark['ototal']) . "</td><td>"
                                        . htmlspecialchars($term3_mark['test']) . "</td><td>" . htmlspecialchars($term3_mark['exam']) . "</td><td>" . htmlspecialchars($term3_mark['ototal']) . "</td>";

                                    $total_obtained_test = 0;
                                    $total_max_test = 0;
                                    $total_obtained_exam = 0;
                                    $total_max_exam = 0;

                                    for ($i = 1; $i <= 3; $i++) {
                                        if (isset($marks_data[$student_id][$module_id][$i])) {
                                            $mark_entry = $marks_data[$student_id][$module_id][$i];
                                            $total_obtained_test += (float)$mark_entry['test'];
                                            $total_max_test += (float)$mark_entry['ttotal'];
                                            $total_obtained_exam += (float)$mark_entry['exam'];
                                            $total_max_exam += (float)$mark_entry['etotal'];
                                        }
                                    }

                                    $overall_obtained_points = $total_obtained_test + $total_obtained_exam;
                                    $maximum_possible_points = $total_max_test + $total_max_exam;

                                    echo "<td>" . htmlspecialchars($overall_obtained_points) . "</td>";
                                    echo "<td>" . htmlspecialchars($maximum_possible_points) . "</td>";
                                    echo "<td>";
                                    if ($maximum_possible_points != 0) {
                                        $module_percentage = round(($overall_obtained_points * 100.0) / $maximum_possible_points, 2);
                                        echo htmlspecialchars($module_percentage) . "%";
                                    } else {
                                        echo "0.00%";
                                    }
                                    echo "</td>";
                                    echo "<td>";
                                    if ($maximum_possible_points != 0) {
                                        $pass_percentage = ($overall_obtained_points * 100.0) / $maximum_possible_points;
                                        if ($b['module_type'] == 'complementary') {
                                            echo ($pass_percentage >= 50) ? "C" : "NYC";
                                        } else {
                                            echo ($pass_percentage >= 70) ? "C" : "NYC";
                                        }
                                    } else {
                                        echo "NYC";
                                    }
                                    echo "</td></tr>";
                                }
                            }
                        }
                        ?>
                        <tr>
                            <th colspan="2">TOTAL</th>
                            <th colspan="4"><?php echo htmlspecialchars($a['term1']) . "/" . htmlspecialchars($a['term1_max']); ?></th>
                            <th colspan="3"><?php echo htmlspecialchars($a['term2']) . "/" . htmlspecialchars($a['term2_max']); ?></th>
                            <th colspan="3"><?php echo htmlspecialchars($a['term3']) . "/" . htmlspecialchars($a['term3_max']); ?></th>
                            <th colspan="4"><?php echo htmlspecialchars($a['yearl']) . "/" . htmlspecialchars($a['yearl_max']); ?></th>
                        </tr>
                        <tr>
                            <th colspan="2">PERCENTAGE</th>
                            <th colspan="4"><?php echo ($a['term1_max'] != 0) ? round($a['term1'] * 100.0 / $a['term1_max'], 2) . "%" : "0.00%"; ?></th>
                            <th colspan="3"><?php echo ($a['term2_max'] != 0) ? round($a['term2'] * 100.0 / $a['term2_max'], 2) . "%" : "0.00%"; ?></th>
                            <th colspan="3"><?php echo ($a['term3_max'] != 0) ? round($a['term3'] * 100.0 / $a['term3_max'], 2) . "%" : "0.00%"; ?></th>
                            <th colspan="4"><?php echo round($a['yearly_percentage'], 2) . "%"; ?></th>
                        </tr>
                        <tr>
                            <th colspan="2">POSITION</th>
                            <th colspan="4"><?php echo htmlspecialchars($a['term1_rank']) . " Out Of " . htmlspecialchars($a['term1_all']); ?></th>
                            <th colspan="3"><?php echo htmlspecialchars($a['term2_rank']) . " Out Of " . htmlspecialchars($a['term2_all']); ?></th>
                            <th colspan="3"><?php echo htmlspecialchars($a['term3_rank']) . " Out Of " . htmlspecialchars($a['term3_all']); ?></th>
                            <th colspan="4"><?php echo $count . " out of " . $all_students_count; ?></th>
                        </tr>
                    </table>
                </div>
                <div class="bottom">
                    <div class="a">
                        <p>Trainer's signature.................</p>
                        <p>Done At <?php echo htmlspecialchars($sc['district'] . ", " . $sc['secter']); ?>, on <?php echo date('d/m/Y'); ?></p><br>
                        <p>HeadTeacher signature + stamp</p>
                        <img src="images/qlcode.jpg" alt="QR Code">
                    </div>
                    <div class="b">
                        <div class="first">
                            <u>First Session Decision</u><br>
                            <span>‣Promotion </span><input type="checkbox"><br>
                            <span>‣Re-assessment </span><input type="checkbox"><br>
                            <span>‣Discontinuation </span><input type="checkbox"><br>
                        </div>
                        <div class="second">
                            <u>Second Session Decision</u><br>
                            <span>‣Promotion </span><input type="checkbox"><br>
                            <span>‣Repeat </span><input type="checkbox"><br>
                        </div>
                    </div>
                </div>
            </div>
        <?php
                // Update rank with yearly position
                mysqli_query($conn, "UPDATE ranks SET yearl_rank='$count', year_all='$all_students_count' WHERE sit='$student_id' AND year='$year_id'");
            }
        }
        ?>
    </div>
    
    <?php if (mysqli_num_rows($select_students) > 0): ?>
    <button class="print-button" onclick="printPage()">PrintOut</button>
    <?php endif; ?>
    
    <select name="" id="font" style="position: fixed; bottom: 20px; right: 20px;">
        <option value="14px" selected>size</option>
        <option value="8px">8</option>
        <option value="9px">9</option>
        <option value="10px">10</option>
        <option value="10.5px">10.5</option>
        <option value="11px">11</option>
        <option value="11.5px">11.5</option>
        <option value="12px">12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
        <option value="22px">22</option>
        <option value="24px">24</option>
        <option value="26px">26</option>
        <option value="28px">28</option>
        <option value="30px">30</option>
    </select>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        var font = document.getElementById('font');
        font.addEventListener("change", function() {
            var reportCards = document.querySelectorAll('.cont');
            
            reportCards.forEach(function(card) {
                var textElements = card.querySelectorAll('*:not(script):not(style)');
                
                textElements.forEach(function(element) {
                    element.style.fontSize = font.value;
                });
                
                var tableCells = card.querySelectorAll('th, td');
                tableCells.forEach(function(cell) {
                    cell.style.fontSize = font.value;
                    cell.style.padding = '3px';
                });
            });
        });
    });

    function printPage() {
        window.print();
    }
</script>
</body>
</html>