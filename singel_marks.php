<?php
include("connection.php");
session_start();
$me = $_SESSION['tid'];
if (!isset($_SESSION['cl'])) {
    header("location:singel_classes.php");
    exit();
}
if (!isset($_SESSION['module'])) {
    header("location:singel_module.php");
    exit();
}
$class = $_SESSION['cl'];
$module = $_SESSION['module'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marks Entry</title>
    <style>
        * {
            padding: 0;
            margin: 0;
            font-family: sans-serif;
            box-sizing: border-box;
        }

        body {
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .cont {
            display: flex;
            width: 95%;
            max-width: 1200px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .left {
            flex: 0 0 70%;
            padding: 20px;
            overflow-x: auto;
        }

        .right {
            flex: 0 0 30%;
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            border-left: 1px solid #eee;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        caption {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: left;
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
            font-size: 0.9em;
            padding: 8px;
            width: 80%;
            margin-bottom: 10px;
        }

        input[type="text"] {
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            width: 80%;
            font-size: 0.9em;
            box-sizing: border-box;
        }

        button {
            padding: 10px 15px;
            border-radius: 5px;
            border: none;
            background-color: green;
            cursor: pointer;
            color: white;
            font-weight: bold;
            margin-top: 10px;
            font-size: 0.9em;
            transition: background-color 0.3s ease;
        }

        button:hover {
            background-color: #008000;
        }

        p {
            font-size: 0.9em;
            margin-bottom: 10px;
            color: #555;
            text-align: left;
            width: 80%;
        }

        h1 {
            font-size: 1.1em;
            color: #333;
            margin-bottom: 15px;
        }

        span {
            display: block;
            font-size: 0.8em;
            color: #777;
            margin-bottom: 5px;
            text-align: left;
            width: 80%;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .cont {
                flex-direction: column;
            }

            .left, .right {
                flex: 0 0 100%;
                width: 100%;
                border-left: none;
            }

            .right {
                border-top: 1px solid #eee;
            }

            table {
                overflow-x: auto;
                display: block;
            }

            th, td {
                white-space: nowrap;
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

                        $sel = mysqli_query($conn, "SELECT *from class,module where module.moid='$module' and class.cid='$class'");
                        if (mysqli_num_rows($sel) > 0) {
                            $b = mysqli_fetch_array($sel);
                            echo $b['level'] . " " . $b['mname'];
                        }
                        ?></caption>
                    <tr><th colspan="2"></th><th colspan="4">Term 1</th><th colspan="4">Term 2</th><th colspan="4">Term 3</th></tr>
                    <tr><th>N<sup><u>o</u></sup></th><th>Names</th><th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                    <th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                    <th>Test</th><th>Total</th><th>Exam</th><th>Total</th>
                    </tr>
                    <?php
                    $select = mysqli_query($conn, "SELECT * from student,marks where marks.sid=student.sid and marks.team=1 and marks.mid='$module' and marks.cid='$class' and marks.tid='$me'");
                    $no = 0;
                    while ($a = mysqli_fetch_array($select)) {
                        $student = $a['sid'];
                        $no++;

                        echo "<tr><td>" . $no . "</td><td>" . $a['firstname'] . " " . $a['lastname'] .
                        "</td><td>" . $a['test'] . "</td><td>" . $a['ttotal'] . "</td><td>" . $a['exam'] .
                        "</td><td>" . $a['etotal'] . "</td>";

                        $select1 = mysqli_query($conn, "SELECT * from marks where sid='$student' and marks.mid='$module' and team=2 and cid='$class' and tid='$me'");
                        $b = mysqli_fetch_array($select1);
                        echo "<td>" . (isset($b['test']) ? $b['test'] : '') . "</td><td>" . (isset($b['ttotal']) ? $b['ttotal'] : '') . "</td><td>" . (isset($b['exam']) ? $b['exam'] : '') . "</td><td>" . (isset($b['etotal']) ? $b['etotal'] : '') . "</td>";

                        $select2 = mysqli_query($conn, "SELECT * from marks where sid='$student' and marks.mid='$module' and team=3 and cid='$class' and tid='$me'");
                        $c = mysqli_fetch_array($select2);
                        echo "<td>" . (isset($c['test']) ? $c['test'] : '') . "</td><td>" . (isset($c['ttotal']) ? $c['ttotal'] : '') . "</td><td>" . (isset($c['exam']) ? $c['exam'] : '') . "</td><td>" . (isset($c['etotal']) ? $c['etotal'] : '') . "</td>";

                        echo "</tr>";
                    }
                    ?>
                </table>
            </form>
        </div>
        <div class="right">
            <form action="" method="post">
                <p>Class: <?php echo $_SESSION['level']?></p>
                <p>Subject: <?php echo $_SESSION['name']?></p>
                <h1>Upload Marks</h1>
                <span>Academic year<sup>*</sup></span><br>
                <select name="year" id="">
                    <option value="0" selected>Select year</option>
                    <?php
                    $select = mysqli_query($conn, "select * from year");
                    while ($a = mysqli_fetch_array($select)) {
                        ?>
                       <option value="<?php echo $a['year']?>"><?php echo $a['year']?></option>
                        <?php
                    }
                    ?>
                </select><br>
                <span>Term<sup>*</sup></span><br>
                <select name="tearm" id="">
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                </select><br>
                <span>Assessment type<sup>*</sup></span><br>
                <select name="type" id="">
                    <option value="0" selected>Select assessment</option>
                    <?php
                    $ass = mysqli_query($conn, "SELECT * from assessment");
                    while ($a = mysqli_fetch_array($ass)) {
                        ?>
                        <option value="<?php echo $a['AssNo']?>"><?php echo $a['AssName']?></option>
                        <?php
                    }
                    ?>
                </select><br>
                <span>Total marks<sup>*</sup></span><br>
                <input type="text" name="total" id=""><br><br>
                <button name="contnue">Next</button><br>
                <button name="ins" style="display:none;"></button><br>
            </form>
        </div>
    </div>
</body>
</html>
<?php
include("connection.php");
if (isset($_POST['contnue'])) {
    $_SESSION['year'] = $_POST['year'];
    $_SESSION['total'] = $_POST['total'];
    $_SESSION['tearm'] = $_POST['tearm'];
    $_SESSION['type'] = $_POST['type'];
    echo"<script>window.location='singel.php'</script>";
    exit();
}
?>