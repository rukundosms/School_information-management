<?php
include("connection.php");
session_start();
if (!isset($_SESSION['tid'])) {
    header("location:index.html");
    exit();
}

// Check if all required session variables are set
if (!isset($_SESSION['cl']) || !isset($_SESSION['module']) || !isset($_SESSION['year']) || !isset($_SESSION['total']) || !isset($_SESSION['tearm']) || !isset($_SESSION['type'])) {
    echo "<div class='fail'><div class='error'>Please select class, module, year, total marks, term, and assessment type first.</div><button onclick=\"window.location='singel_marks.php'\">Go Back</button></div>";
    exit();
}

$class = $_SESSION['cl'];
$me = $_SESSION['tid'];
$module = $_SESSION['module'];
$year = $_SESSION['year'];
$total = $_SESSION['total'];
$tearm = $_SESSION['tearm'];
$type = $_SESSION['type'];

// Check if marks exist for any student in this term when confirm button is clicked
if (isset($_GET['selected'])) {
    $selected_sid = $_GET['selected'];
    $check_existing = mysqli_query($conn, "SELECT * FROM marks WHERE sid='$selected_sid' AND mid='$module' AND cid='$class' AND team='$tearm' AND year='$year'");

    if (mysqli_num_rows($check_existing) > 0) {
        echo "<script>alert('Marks exist for this student in the selected term.'); window.location='singel_marks.php';</script>";
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Confirmation</title>
    <style>
        body {
            font-family: sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
        }

        .cont {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 600px;
            text-align: center;
        }

        button {
            background-color: rgb(71, 231, 71);
            border: none;
            border-radius: 3px;
            padding: 10px 15px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            color: #fff;
            margin-top: 1em;
            transition: background-color 0.3s ease;
        }

        button:hover {
            background-color: rgb(50, 180, 50);
        }

        .fail {
            width: 90%;
            max-width: 400px;
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 1em;
            text-align: center;
        }

        .fail .error {
            font-size: 1em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .fail button {
            background-color: #dc3545;
        }

        .fail button:hover {
            background-color: #c82333;
        }

        a {
            color: blue;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.9em;
            text-decoration: none;
            padding: 0.5em 1em;
            display: inline-block;
            margin-top: 0.5em;
            border: 1px solid blue;
            border-radius: 5px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        a:hover {
            background-color: blue;
            color: white;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 20px;
        }

        caption {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
        }

        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="cont">
        <form action="" method="post">
            <?php
            $check = mysqli_query($conn, "SELECT * from marks where mid='$module'
                                            and tid='$me' and cid='$class' and team='$tearm' and year='$year' and test>=0 and exam>=0");
            $check1 = mysqli_query($conn, "SELECT * from marks where mid='$module'
                                             and tid='$me' and cid='$class' and team='$tearm' and year='$year' and test>0");
            $check2 = mysqli_query($conn, "SELECT * from marks where mid='$module'
                                             and tid='$me' and cid='$class' and team='$tearm' and year='$year' and test>0");
            if ($type == 2) {
                if (mysqli_num_rows($check2) <= 0) {
                    echo "<div class='fail'><div class='error'>The first assessment is not exist !!!</div>";
                    echo "<button name='back' onclick=\"window.location='marks.php'\">Back</button></div>";
                    exit();
                }
            }

            echo "<table border='2'><caption>";
            $sel = mysqli_query($conn, "select *from class,module where module.moid='$module' and class.cid='$class'");
            if (mysqli_num_rows($sel) > 0) {
                $b = mysqli_fetch_array($sel);
                echo $b['level'] . " " . $b['mname'];
            }
            echo "</caption>";
            echo "<tr><th>N<sup><u>o</u></sup></th><th>Names</th><th>Confirm</th></tr>";
            $select = mysqli_query($conn, "SELECT * from student where class='$class' order by firstname asc");
            $no = 0;
            $name = 0;
            $date = date('y/m/d');
            while ($a = mysqli_fetch_array($select)) {
                $no++;
                $name++;
                echo "<tr><td>" . $no . "</td><td>" . $a['firstname'] . " " . $a['lastname'] . "</td>";
                ?>
                <?php
                if (isset($_POST['upload'])) {
                    $mark = $_POST['name' . $name];
                    $sid = $a['sid'];

                    // Check if marks already exist for this student in this term
                    $check_existing = mysqli_query($conn, "SELECT * FROM marks WHERE sid='$sid' AND mid='$module' AND cid='$class' AND team='$tearm' AND year='$year'");

                    if (mysqli_num_rows($check_existing) > 0) {
                        echo "<script>alert('Marks exist for this student in the selected term.');</script>";
                        continue;
                    }

                    if ($type == 1) {
                        $nsert = mysqli_query($conn, "INSERT INTO marks(sid,date,cid,ttotal,team,tid,mid,year,test) values('$sid','$date','$class','$total','$tearm','$me','$module','$year','$mark')");
                        header("location:list.php");
                        exit();
                    }

                    if ($type == 2) {
                        $test = mysqli_query($conn, "SELECT * FROM marks where sid='$sid' and cid='$class' and mid='$module' and year='$year' and test>0");
                        while ($f = mysqli_fetch_array($test)) {
                            $mk = $f['mark_id'];
                            $test_marks = $f['test'];
                            $test_total = $f['ttotal'];
                            $ototal = $test_marks + $mark;
                            $mtotal = $test_total + $total;
                            if ($tearm == 1) {
                                $update = mysqli_query($conn, "UPDATE marks set etotal='$total',exam='$mark',ototal='$ototal',mtotal='$mtotal' where sid='$sid' and cid='$class' and tid='$me' and mid='$module' and year='$year' and mark_id='$mk' and team=1");
                            }
                            if ($tearm == 2) {
                                $update = mysqli_query($conn, "UPDATE marks set etotal='$total',exam='$mark',ototal='$ototal',mtotal='$mtotal' where sid='$sid' and cid='$class' and tid='$me' and mid='$module' and year='$year' and mark_id='$mk' and team=2");
                            }
                            if ($tearm == 3) {
                                $update = mysqli_query($conn, "UPDATE marks set etotal='$total',exam='$mark',ototal='$ototal',mtotal='$mtotal' where sid='$sid' and cid='$class' and tid='$me' and mid='$module' and year='$year' and mark_id='$mk' and team=3");
                            }
                        }
                        header("location:list.php");
                        exit();
                    }
                    $selec = mysqli_query($conn, "SELECT * FROM ranks where sit='$sid'");
                    if (mysqli_num_rows($selec) > 0) {
                        mysqli_query($conn, "UPDATE ranks set sit='$sid' where sit='$sid'");
                    } else {
                        $inser = mysqli_query($conn, "INSERT INTO ranks(sit) values('$sid')");
                    }
                }
                ?>
                <td><a href="singel_upload.php?selected=<?php echo $a['sid']?>">Enter_Marks</a></td>
                </tr>
            <?php
            }
            echo "</table>";
            ?>
        </form>
    </div>
</center>
</body>
</html>