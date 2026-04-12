<?php
include("connection.php");
session_start();
$me = $_SESSION['tid'];
$class = $_SESSION['cl'];
$module = $_SESSION['module'];


// Get current active academic year
$active_year_query = mysqli_query($conn, "SELECT * FROM year WHERE status='active' LIMIT 1");
$active_year = "";
$active_year_data = mysqli_fetch_array($active_year_query);
$year = $active_year_data['year_id'];


// Get module credit and calculate total marks
$credit_query = mysqli_query($conn, "SELECT credit FROM module WHERE moid = '$module'");
if(mysqli_num_rows($credit_query) > 0) {
    $credit_data = mysqli_fetch_array($credit_query);
    $module_credit = $credit_data['credit'];
    $auto_total = $module_credit * 10; // Calculate total marks (credit × 10)
} else {
    $auto_total = 0; // Default value if credit not found
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marks</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: sans-serif;
            box-sizing: border-box;
        }

        .cont {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: auto;
        }

        .left {
            width: 100%;
            overflow-x: auto;
        }

        .right {
            width: 100%;
            background-color: white;
            border-radius: 5px;
            margin: 20px auto;
            padding: 20px;
            text-align: center;
            box-shadow: 0px 0px 5px 5px rgba(159, 199, 159, 0.5);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            min-width: 800px;
        }

        caption {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }

        th {
            background-color: #f2f2f2;
        }

        select {
            border: 1px solid rgb(30, 139, 30);
            border-radius: 5px;
            font-size: 14px;
            width: 80%;
            padding: 8px;
            margin-bottom: 10px;
        }

        button {
            width: 80%;
            padding: 10px;
            border-radius: 5px;
            border: none;
            background-color: green;
            cursor: pointer;
            color: white;
            font-weight: bold;
            margin-top: 10px;
        }

        input[type="text"], input[type="number"] {
            width: 80%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }

        .info-text {
            font-size: 12px;
            color: #666;
            margin-top: -8px;
            margin-bottom: 10px;
        }

        .year-badge {
            background-color: #e0e0e0;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            margin-left: 5px;
        }

        .empty-cell {
            color: #999;
            font-style: italic;
        }

        @media (min-width: 768px) {
            .cont {
                flex-direction: row;
            }

            .left {
                width: 75%;
                height: 90vh;
            }

            .right {
                width: 25%;
                margin-top: 5%;
                padding: 15px;
            }

            select, button, input[type="text"], input[type="number"] {
                width: 50%;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <div class="left">
            <form action="" method="post">
                <table border="2">
                    <caption><?php
                        $sel = mysqli_query($conn, "SELECT * from class,module where module.moid='$module' and class.cid='$class'");
                        if (mysqli_num_rows($sel) > 0) {
                            $b = mysqli_fetch_array($sel);
                            echo $b['level'] . " " . $b['mname'];
                            echo " - Active Year: " . $active_year_data['year'];
                        }
                        ?></caption>
                    <tr><th colspan="2"></th><th colspan="4">Term1</th><th colspan="4">Term2</th><th colspan="4">Term3</th></tr>
                    <tr><th>N<sup><u>o</u></sup></th><th>Names</th><th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                        <th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                        <th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                    </tr>
                    <?php
                    $students = mysqli_query($conn, "SELECT * from class,student,student_promotion_log where class.cid=student.class and student_promotion_log.sid=student.sid and
                    student_promotion_log.to_year='$year' and student_promotion_log.to_class='$class' and student.status='Active' ORDER BY student.firstname ASC");
           
                    $no = 0;
                    while ($student = mysqli_fetch_array($students)) {
                        $student_id = $student['sid'];
                        $no++;
                        
                        // Initialize marks arrays for each term
                        $marks_by_term = [
                            1 => ['test' => '', 'ttotal' => '', 'exam' => '', 'etotal' => ''],
                            2 => ['test' => '', 'ttotal' => '', 'exam' => '', 'etotal' => ''],
                            3 => ['test' => '', 'ttotal' => '', 'exam' => '', 'etotal' => '']
                        ];
                        
                        // Get all marks for this student
                        $select_marks = mysqli_query($conn, "SELECT * FROM marks where sid='$student_id' and year='$year' and cid='$class' and tid='$me' and mid='$module'");
                        
                        // Populate the marks array with actual data
                        while ($mark = mysqli_fetch_array($select_marks)) {
                            $term = $mark['team'];
                            if (isset($marks_by_term[$term])) {
                                $marks_by_term[$term]['test'] = $mark['test'];
                                $marks_by_term[$term]['ttotal'] = $mark['ttotal'];
                                $marks_by_term[$term]['exam'] = $mark['exam'];
                                $marks_by_term[$term]['etotal'] = $mark['etotal'];
                            }
                        }
                        
                        // Start the row
                        echo "<tr>";
                        echo "<td>" . $no . "</td>";
                        echo "<td>" . $student['firstname'] . " " . $student['lastname'] . "</td>";
                        
                        // Output cells for each term in order
                        for ($term = 1; $term <= 3; $term++) {
                            $marks = $marks_by_term[$term];
                            
                            // Test cell
                            if ($marks['test'] !== '') {
                                echo "<td>" . $marks['test'] . "</td>";
                            } else {
                                echo "<td class='empty-cell'>-</td>";
                            }
                            
                            // Test Total cell
                            if ($marks['ttotal'] !== '') {
                                echo "<td>" . $marks['ttotal'] . "</td>";
                            } else {
                                echo "<td class='empty-cell'>-</td>";
                            }
                            
                            // Exam cell
                            if ($marks['exam'] !== '') {
                                echo "<td>" . $marks['exam'] . "</td>";
                            } else {
                                echo "<td class='empty-cell'>-</td>";
                            }
                            
                            // Exam Total cell
                            if ($marks['etotal'] !== '') {
                                echo "<td>" . $marks['etotal'] . "</td>";
                            } else {
                                echo "<td class='empty-cell'>-</td>";
                            }
                        }
                        
                        echo "</tr>";
                    }
                    ?>
                </table>
            </form>
        </div>
        <div class="right">
            <form action="" method="post" id="uploadForm">
                <p>Class: <?php echo $_SESSION['level'] ?></p><br>
                <p>Subject: <?php echo $_SESSION['name'] ?></p>
                <h1>Upload Marks</h1>
                <span>Academic year<sup>*</sup></span><br>
                <select name="year" id="year">
                    <option value="0" selected>Select Year</option>
                    <?php
                    $select = mysqli_query($conn, "SELECT * FROM year ORDER BY year DESC");
                    while ($a = mysqli_fetch_array($select)) {
                        $selected = ($a['status'] == 'active') ? 'selected' : '';
                        ?>
                        <option value="<?php echo $a['year_id'] ?>" <?php echo $selected ?>>
                            <?php echo $a['year'] ?>
                            <?php echo ($a['status'] == 'active') ? ' (Active)' : ''; ?>
                        </option>
                        <?php
                    }
                    ?>
                </select><br>
                <span>Term<sup>*</sup></span><br>
                <select name="tearm" id="tearm">
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                </select><br>
                <span>Assessment Type<sup>*</sup></span><br>
                <select name="type" id="type">
                    <option value="0" selected>Select Assessment</option>
                    <?php
                    $ass = mysqli_query($conn, "SELECT * from assessment");
                    while ($a = mysqli_fetch_array($ass)) {
                        ?>
                        <option value="<?php echo $a['AssNo'] ?>"><?php echo $a['AssName'] ?></option>
                        <?php
                    }
                    ?>
                </select><br>
                <span>Total marks<sup>*</sup></span><br>
                <input type="number" name="total" id="total" value="<?php echo $auto_total; ?>" readonly required>
                <p class="info-text">Calculated automatically (Credit × 10)</p><br><br>
                <button name="contnue" onclick="return validateForm()">Next</button>
            </form>
        </div>
    </div>
    <script>
        function validateForm() {
            var year = document.getElementById("year").value;
            var type = document.getElementById("type").value;
            var total = document.getElementById("total").value;

            if (year == "0" || type == "0" || total == "") {
                alert("Please fill in all required fields.");
                return false;
            }
            return true;
        }
    </script>
</body>
</html>
<?php
include("connection.php");
if (isset($_POST['contnue'])) {
    $_SESSION['year'] = $_POST['year'];
    $_SESSION['total'] = $_POST['total'];
    $_SESSION['tearm'] = $_POST['tearm'];
    $_SESSION['type'] = $_POST['type'];
    echo "<script>window.location='upload.php'</script>";
}
?>