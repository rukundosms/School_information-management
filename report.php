<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
}
$class = $_SESSION['cl'];
$term = $_SESSION['term'];
$year = $_SESSION['year']; // This is year_id
$get_year_string = mysqli_query($conn, "SELECT * FROM year where year_id='$year'");
$year_string = mysqli_fetch_array($get_year_string);
$year_lable = $year_string['year'];
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Card</title>
    <style>
    /* Reset for print */
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        margin: 0;
        padding: 20px;
    }

    .space {
        height: 30px;
    }

    .card {
        height: auto;
        min-height: 650px;
        width: 100%;
        padding: 5px;
        margin: auto;
        margin-top: 2%;
        margin-bottom: 20px;
        page-break-after: always;
        position: relative;
        background: white;
        border: 1px solid #ddd;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    #all {
        display: none;
    }

    table u {
        font-weight: bold;
    }

    table {
        width: 100%;
        font-size: 14px;
        border-collapse: collapse;
        margin-top: 10px;
    }

    table th, table td {
        border: 1px solid #000;
        padding: 5px;
    }

    /* Subject cells aligned left */
    table td.subject-cell {
        text-align: left !important;
        padding-left: 10px;
    }

    /* Other cells remain centered */
    table th, 
    table td:not(.subject-cell) {
        text-align: center;
    }

    .signature {
        padding: 20px 0;
        text-align: center;
        height: 80px;
    }

    .observation {
        text-align: left;
        padding: 10px;
        vertical-align: top;
    }

    .top {
        width: 100%;
        min-height: 120px;
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        padding-top: 10px;
    }

    .left {
        width: 40%;
        padding-left: 10px;
    }

    .logo {
        width: 20%;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .right {
        width: 40%;
        text-align: left;
        padding-left: 20px;
    }

    .left p {
        margin-bottom: 2px;
        margin-top: 2px;
        height: fit-content;
        text-align: left;
        font-size: 13px;
        width: 100%;
        line-height: 1.2;
    }

    .right p {
        margin-bottom: 2px;
        margin-top: 2px;
        height: fit-content;
        width: 100%;
        text-align: left;
        font-size: 13px;
        line-height: 1.2;
    }

    img {
        width: 90px;
        height: 90px;
        object-fit: contain;
    }

    .title {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: bold;
    }

    .type {
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        border-top: 2px solid black;
        border-bottom: 2px solid black;
        height: fit-content;
        padding: 5px 0;
        margin: 10px 0;
    }

    .cont {
        width: 100%;
        height: fit-content;
        background-color: #fff;
        padding: 0;
    }

    .info {
        width: 100%;
        min-height: 60px;
        padding: 5px 10px;
        text-align: left;
        display: flex;
        margin-bottom: 10px;
    }

    .left-info {
        width: 60%;
        height: 100%;
    }

    span {
        font-size: 14px;
        font-weight: 500;
    }

    .right-info {
        width: 40%;
        height: 100%;
    }

    h1 {
        color: red;
        text-align: center;
        padding: 50px 0;
    }

    .print-button {
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin: 20px auto;
        display: block;
    }

    .print-button:hover {
        background-color: #45a049;
    }

    #font {
        padding: 5px 10px;
        margin: 10px auto;
        display: block;
        font-size: 14px;
    }

    /* PRINT STYLES - FIX FOR CUT OFF CONTENT */
    @media print {
        @page {
            margin: 0.5in !important;
            size: auto;
        }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-size: 12pt;
            line-height: 1.4;
        }
        
        .print-button,
        #font {
            display: none !important;
        }
        
        .cont {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
        }
        
        .card {
            margin: 0 !important;
            padding: 10px 5px 0 5px !important;
            page-break-inside: avoid;
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            min-height: auto;
            height: auto;
        }
        
        /* Ensure first page has proper top spacing */
        .card:first-child {
            margin-top: 0 !important;
            padding-top: 10px !important;
        }
        
        /* Add top padding to the header */
        .top {
            padding-top: 15px !important;
            margin-top: 0 !important;
        }
        
        /* Adjust font sizes for print */
        .left p, .right p {
            font-size: 11px !important;
        }
        
        .type {
            font-size: 20px !important;
            margin: 5px 0 !important;
        }
        
        span {
            font-size: 12px !important;
        }
        
        table {
            font-size: 11px !important;
            margin-top: 5px !important;
        }
        
        table th, table td {
            padding: 3px !important;
        }
        
        /* Subject cells aligned left in print */
        table td.subject-cell {
            text-align: left !important;
            padding-left: 8px !important;
        }
        
        img {
            width: 80px !important;
            height: 80px !important;
        }
        
        /* Force page breaks */
        .card {
            break-inside: avoid;
        }
        
        /* Ensure no content is cut */
        .signature {
            padding-bottom: 10px !important;
        }
        
        /* Print-specific margins for content */
        .info {
            margin-bottom: 5px !important;
        }
    }

    /* Extra safety margin for the first element */
    @media print {
        body::before {
            content: "";
            display: block;
            height: 0;
            page-break-before: avoid;
        }
        
        /* Add a small top buffer to the first card */
        .card:first-child .top::before {
            content: "";
            display: block;
            height: 5px;
            width: 100%;
        }
    }
    </style>
</head>

<body>
    <div class="cont" id="card">
        <?php
        // Get all active students in the class from promotion logs
        $std = mysqli_query($conn, "
            SELECT DISTINCT s.*, spl.to_class, c.class_name, c.level
            FROM student_promotion_log spl
            INNER JOIN student s ON spl.sid = s.sid
            LEFT JOIN class c ON spl.to_class = c.cid
            WHERE spl.to_year = '$year'
            AND spl.to_class = '$class'
            AND s.status = 'Active'
            ORDER BY s.firstname ASC
        ");
        
        $totalStudents = mysqli_num_rows($std);
        echo "<div id='all'>" . $totalStudents . "</div>";

        $studentScores = []; // Array to store student scores for ranking

        if ($totalStudents > 0) {
            $students_with_marks = 0;
            
            while ($astd = mysqli_fetch_array($std)) {
                $stdnt = $astd['sid'];
                
                // Check if student exists in ranks table FOR THIS YEAR
                $check_students = mysqli_query($conn, "SELECT * FROM ranks where sit='$stdnt' AND year='$year'");
                if(mysqli_num_rows($check_students) < 1){
                    mysqli_query($conn, "INSERT INTO ranks(sit, year) values('$stdnt', '$year')");
                }
                
                // Get marks for this student
                $marks_select = mysqli_query($conn, "
                    SELECT * FROM marks 
                    WHERE sid='$stdnt' 
                    AND year='$year' 
                    AND team='$term' 
                    AND cid='$class'
                ");
                
                // Initialize totals
                $exam1 = 0;
                $test1 = 0;
                $exam_max = 0;
                $test_max = 0;
                $has_marks = false;
                
                if (mysqli_num_rows($marks_select) > 0) {
                    $has_marks = true;
                    $students_with_marks++;
                    
                    while ($wer = mysqli_fetch_array($marks_select)) {
                        // Ensure numeric values
                        $test = is_numeric($wer['test']) ? $wer['test'] : 0;
                        $exam = is_numeric($wer['exam']) ? $wer['exam'] : 0;
                        $ttotal = is_numeric($wer['ttotal']) ? $wer['ttotal'] : 0;
                        $etotal = is_numeric($wer['etotal']) ? $wer['etotal'] : 0;
                        
                        // Calculate totals
                        $ototal = $test + $exam;
                        $mtotal = $ttotal + $etotal;
                        
                        // Update marks record
                        $update_query = "UPDATE marks SET 
                                        ototal = '$ototal',
                                        mtotal = '$mtotal'
                                        WHERE mark_id = '" . $wer['mark_id'] . "'";
                        mysqli_query($conn, $update_query);
                        
                        // Accumulate totals
                        $exam1 += $exam;
                        $test1 += $test;
                        $exam_max += $etotal;
                        $test_max += $ttotal;
                    }
                }
                
                $st1 = $test1 + $exam1;
                $max = $test_max + $exam_max;
                $percentage = ($max > 0) ? ($st1 / $max) * 100 : 0;

                // Store student data
                $studentScores[$stdnt] = [
                    'percentage' => $percentage,
                    'student_data' => $astd,
                    'total_marks' => $st1,
                    'max_marks' => $max,
                    'exam' => $exam1,
                    'test' => $test1,
                    'exam_max' => $exam_max,
                    'test_max' => $test_max,
                    'has_marks' => $has_marks
                ];

                // Update ranks table
                if ($has_marks) {
                    if ($term == 1) {
                        $update_query = "UPDATE ranks SET term1='$st1', term1_max='$max' WHERE sit='$stdnt' AND year='$year'";
                        mysqli_query($conn, $update_query);
                    } elseif ($term == 2) {
                        $update_query = "UPDATE ranks SET term2='$st1', term2_max='$max' WHERE sit='$stdnt' AND year='$year'";
                        mysqli_query($conn, $update_query);
                    } elseif ($term == 3) {
                        $update_query = "UPDATE ranks SET term3='$st1', term3_max='$max' WHERE sit='$stdnt' AND year='$year'";
                        mysqli_query($conn, $update_query);
                        
                        // Calculate annual total
                        $you = mysqli_query($conn, "SELECT * from ranks where sit='$stdnt' AND year='$year'");
                        if (mysqli_num_rows($you) > 0) {
                            $past = mysqli_fetch_array($you);
                            $t1 = $past['term1'] ?? 0;
                            $t2 = $past['term2'] ?? 0;
                            $t3 = $past['term3'] ?? 0;
                            $yt = $t1 + $t2 + $t3;
                            
                            $t1_max = $past['term1_max'] ?? 0;
                            $t2_max = $past['term2_max'] ?? 0;
                            $t3_max = $past['term3_max'] ?? 0;
                            $yt_max = $t1_max + $t2_max + $t3_max;
                            
                            mysqli_query($conn, "UPDATE ranks SET yearl='$yt', yearl_max='$yt_max' WHERE sit='$stdnt' AND year='$year'");
                        }
                    }
                }
            }

            // Only proceed if we have students with marks
            if ($students_with_marks > 0) {
                // Sort students by percentage
                uasort($studentScores, function($a, $b) {
                    // Students with marks first
                    if ($a['has_marks'] != $b['has_marks']) {
                        return $b['has_marks'] <=> $a['has_marks'];
                    }
                    // Then by percentage
                    return $b['percentage'] <=> $a['percentage'];
                });

                $rank = 0;
                $previousScore = null;
                $currentRank = 0;
                $counter = 0;
                $students_with_marks_ranked = 0;

                foreach ($studentScores as $studentId => $studentData) {
                    $counter++;
                    
                    // Only rank students with marks
                    if ($studentData['has_marks']) {
                        $students_with_marks_ranked++;
                        if ($studentData['percentage'] !== $previousScore) {
                            $currentRank = $students_with_marks_ranked;
                            $rank = $currentRank;
                            $previousScore = $studentData['percentage'];
                        } else {
                            $rank = $currentRank;
                        }
                    } else {
                        $rank = '-';
                    }

                    $a = $studentData['student_data'];
                    
                    // Only generate report card if student has marks
                    if ($studentData['has_marks']) {
                        ?>
        <div class="card">
            <div class="top">
                <div class="left">
                    <?php
                            $school = mysqli_query($conn, "SELECT * FROM school");
                            $sc = mysqli_fetch_array($school);
                            ?>
                    <p class="title">Republic of Rwanda</p>
                    <p><?php echo htmlspecialchars($sc['school_name']); ?></p>
                    <p><?php echo htmlspecialchars($sc['district'] . "-" . $sc['secter']); ?></p>
                    <p><?php echo htmlspecialchars($sc['phone']); ?></p>
                </div>
                <div class="logo">
                    <img src="images/logo.jpg" alt="">
                </div>
                <div class="right">
                    <p class="title">Ministry of Education</p>
                    <P>School year: <?php echo htmlspecialchars($year_lable); ?></P>
                    <p>
                        <?php
                                if ($term == 1) {
                                    echo $term . "<sup>st</sup> Term";
                                    mysqli_query($conn, "UPDATE ranks SET term1_rank='$rank', term1_all='$students_with_marks' WHERE sit='$studentId' AND year='$year'");
                                } elseif ($term == 2) {
                                    echo $term . "<sup>nd</sup> Term";
                                    mysqli_query($conn, "UPDATE ranks SET term2_rank='$rank', term2_all='$students_with_marks' WHERE sit='$studentId' AND year='$year'");
                                } elseif ($term == 3) {
                                    echo $term . "<sup>rd</sup> Term";
                                    mysqli_query($conn, "UPDATE ranks SET term3_rank='$rank', term3_all='$students_with_marks' WHERE sit='$studentId' AND year='$year'");
                                }
                                ?>
                    </p>
                </div>
            </div>
            <div class="type">Report Card</div>
            <div class="info">
                <div class="left-info">
                    <span>Student Name:
                        <?php echo htmlspecialchars($a['firstname'] . " " . $a['lastname']); ?></span><br>
                    <span>Class: <?php
                                if (!empty($a['level']) && !empty($a['class_name'])) {
                                    echo htmlspecialchars($a['level'] . $a['class_name']);
                                } else {
                                    echo "Class ID: " . htmlspecialchars($a['to_class']);
                                }
                            ?></span><br>
                </div>
                <div class="right-info">
                    <span>N<sup><u>o</u></sup>: <?php echo $counter; ?></span><br>
                    <span>Conduct: <?php
                                // FIXED: Added year to the conduct query
                                $conduct = mysqli_query($conn, "SELECT * from conduct where sid='$studentId' AND year='$year'");
                                if (mysqli_num_rows($conduct) <= 0) {
                                    echo "Not entered";
                                } else {
                                    $cond = mysqli_fetch_array($conduct);
                                    if ($term == 1) {
                                        echo htmlspecialchars($cond['term1']) . " out of " . htmlspecialchars($cond['total']);
                                    } elseif ($term == 2) {
                                        echo htmlspecialchars($cond['term2']) . " out of " . htmlspecialchars($cond['total']);
                                    } elseif ($term == 3) {
                                        echo htmlspecialchars($cond['term3']) . " out of " . htmlspecialchars($cond['total']);
                                    }
                                }
                            ?></span>
                </div>
            </div>
            <table border="1" id="table<?php echo $counter ?>">
                <tr>
                    <th rowspan="2">All Subjects</th>
                    <th colspan="3">Maximum</th>
                    <th colspan="3">O.P</th>
                </tr>
                <tr>
                    <th>EU</th>
                    <th>ET</th>
                    <th>ToT</th>
                    <th>EU</th>
                    <th>ET</th>
                    <th>ToT</th>
                </tr>
                <?php
                        // Get marks for display
                        $sel = mysqli_query($conn, "
                            SELECT * FROM marks m
                            INNER JOIN module mo ON m.mid = mo.moid
                            WHERE m.sid='$studentId' 
                            AND m.team='$term' 
                            AND m.year='$year'
                            AND m.cid='$class'
                        ");
                        
                        if (mysqli_num_rows($sel) < 1) {
                            echo "<tr><td colspan='8'><center><h1>No marks entered</h1></center></td></tr>";
                        } else {
                            while ($v = mysqli_fetch_array($sel)) {
                        ?>
                <tr>
                    <td class="subject-cell"><?php echo htmlspecialchars($v['mname']); ?></td>
                    <td><?php echo htmlspecialchars($v['ttotal']); ?></td>
                    <td><?php echo htmlspecialchars($v['etotal']); ?></td>
                    <td><?php echo htmlspecialchars($v['ttotal'] + $v['etotal']); ?></td>
                    <td><?php
                                        if ($v['module_type'] == 'specific' || $v['module_type'] == 'general') {
                                            $test_total = $v['ttotal'];
                                            $tes = $v['test'];
                                            $percent = ($test_total > 0) ? ($tes * 100) / $test_total : 0;
                                            if ($percent < 70) {
                                                echo "<u>" . htmlspecialchars($tes) . "</u>";
                                            } else {
                                                echo htmlspecialchars($tes);
                                            }
                                        } elseif ($v['module_type'] == 'complementary') {
                                            $test_total = $v['ttotal'];
                                            $tes = $v['test'];
                                            $percent = ($test_total > 0) ? ($tes * 100) / $test_total : 0;
                                            if ($percent < 50) {
                                                echo "<u>" . htmlspecialchars($tes) . "</u>";
                                            } else {
                                                echo htmlspecialchars($tes);
                                            }
                                        }
                                    ?></td>
                    <td><?php
                                        if ($v['module_type'] == 'specific' || $v['module_type'] == 'general') {
                                            $exam_total = $v['etotal'];
                                            $ex = $v['exam'];
                                            $percentx = ($exam_total > 0) ? ($ex * 100) / $exam_total : 0;
                                            if ($percentx < 70) {
                                                echo "<u>" . htmlspecialchars($ex) . "</u>";
                                            } else {
                                                echo htmlspecialchars($ex);
                                            }
                                        } elseif ($v['module_type'] == 'complementary') {
                                            $exam_total = $v['etotal'];
                                            $ex = $v['exam'];
                                            $percentx = ($exam_total > 0) ? ($ex * 100) / $exam_total : 0;
                                            if ($percentx < 50) {
                                                echo "<u>" . htmlspecialchars($ex) . "</u>";
                                            } else {
                                                echo htmlspecialchars($ex);
                                            }
                                        }
                                    ?></td>
                    <td><?php echo htmlspecialchars($v['test'] + $v['exam']); ?></td>
                </tr>
                <?php
                            }
                        }
                        ?>
                <tr>
                    <th class="subject-cell">Total</th>
                    <th><?php echo htmlspecialchars($studentData['test_max']); ?></th>
                    <th><?php echo htmlspecialchars($studentData['exam_max']); ?></th>
                    <th><?php echo htmlspecialchars($studentData['max_marks']); ?></th>
                    <th><?php echo htmlspecialchars($studentData['test']); ?></th>
                    <th><?php echo htmlspecialchars($studentData['exam']); ?></th>
                    <th><?php echo htmlspecialchars($studentData['total_marks']); ?></th>
                </tr>
                <tr>
                    <th class="subject-cell">Average</th>
                    <th><?php echo round($studentData['percentage'], 2) . "%"; ?></th>
                    <th>Rank</th>
                    <th colspan="5"><?php echo $rank; ?> out of <?php echo $students_with_marks; ?></th>
                </tr>
                <tr>
                    <td colspan="7" class="space"></td>
                </tr>
                <tr>
                    <td rowspan="2" colspan="3" class="observation">
                        <b style="text:left;">Observations</b>
                        <br>EU: End Unit
                        <br>ET: End Term
                        <br> ToT: Total of Term
                    </td>
                    <td colspan='4' class="signature">Teacher Signature</td>
                </tr>
                <tr>
                    <td colspan="4" class="signature">Parent Signature</td>
                </tr>
            </table>
        </div>
        <?php
                    }
                }
            } else {
                echo "<div class='card'>";
                echo "<h1>No students with marks found in this class</h1>";
                echo "<p>Total students in class: $totalStudents</p>";
                echo "<p>Students with marks: 0</p>";
                echo "<p>Please enter marks for students before generating reports.</p>";
                echo "</div>";
            }
        } else {
            echo "<div class='card'><h1>No active students found in this class for year " . htmlspecialchars($year_lable) . "</h1></div>";
        }
        ?>
    </div>
    <button class="print-button" onclick="printPage()">PrintOut</button>
    <select name="" id="font">
        <option value="14px" selected>size</option>
        <option value="8px">8</option>
        <option value="9px">9</option>
        <option value="10px">10</option>
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
            var all = document.getElementById('all');
            var al = all.textContent;
            for (let a = 1; a <= al; a++) {
                var cont = document.getElementById('table' + a);
                if (cont) {
                    cont.style.fontSize = font.value;
                }
            }
        });
    });

    function printPage() {
        // Add a small delay to ensure styles are applied
        setTimeout(function() {
            window.print();
        }, 100);
    }
    
    // Add print-specific styles dynamically
    function beforePrint() {
        // Add a print-specific class to body
        document.body.classList.add('printing');
        
        // Add print-specific padding to ensure content doesn't get cut
        var cards = document.querySelectorAll('.card');
        if (cards.length > 0) {
            cards[0].style.paddingTop = '15px';
        }
    }
    
    function afterPrint() {
        // Remove print-specific class
        document.body.classList.remove('printing');
        
        // Reset padding
        var cards = document.querySelectorAll('.card');
        if (cards.length > 0) {
            cards[0].style.paddingTop = '';
        }
    }
    
    // Add event listeners for print
    window.onbeforeprint = beforePrint;
    window.onafterprint = afterPrint;
    
    // Also handle print via media query listeners
    if (window.matchMedia) {
        var mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(function(mql) {
            if (mql.matches) {
                beforePrint();
            } else {
                afterPrint();
            }
        });
    }
    </script>
</body>
</html>