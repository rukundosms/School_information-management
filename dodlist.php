<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
 }
$class=$_SESSION['cl'];
$year=$_SESSION['year'];
$term=$_SESSION['term'];
if ($term==1) {
    $check=mysqli_query($conn,"SELECT * from student,conduct where conduct.class='$class' and term1>0 and year='$year' and conduct.sid=student.sid");
if (mysqli_num_rows($check)<=0) {
   header("location:dodupload.php");
}
}
if ($term==2) {
    $check=mysqli_query($conn,"SELECT * from student,conduct where conduct.class='$class' and term2>0 and year='$year' and conduct.sid=student.sid");
if (mysqli_num_rows($check)<=0) {
   header("location:dodupload.php");
}
}
if ($term==3) {
    $check=mysqli_query($conn,"SELECT * from student,conduct where conduct.class='$class' and term3>0 and year='$year' and conduct.sid=student.sid");
if (mysqli_num_rows($check)<=0) {
   header("location:dodupload.php");
}
}

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>upload</title>
</head>

<body>
    <center>
        <div class="cont">
            <form action="" method="post">
                <table border="2">
                    <caption><?php
            $sel=mysqli_query($conn,"select *from class where cid='$class'");
            if (mysqli_num_rows($sel)>0) {
            $b=mysqli_fetch_array($sel);
            echo $b['level'].$b['class_name'];
            }
            ?></caption>
                    <tr>
                        <th colspan="5"><?php echo "Term ".$term?></th>
                    </tr>
                    <tr>
                        <th>N<sup><u>0</u></sup></th>
                        <th>Names</th>
                        <th>marks</th>
                        <th>Total</th>
                    </tr>
                    <?php
        $select=mysqli_query($conn,"SELECT * from student_promotion_log,student where
         student_promotion_log.to_class='$class' and student.sid=student_promotion_log.sid and 
         student_promotion_log.to_year='$year' order by student.firstname asc");

       $no=0;
        while ($a=mysqli_fetch_array($select)) {
            $student=$a['sid'];
            $no++;
             echo"<tr><td>".$no."</td><td>".$a['firstname']." ".$a['lastname'];
            echo"</td><td>";
            $marks_select=mysqli_query($conn,"SELECT * FROM conduct where sid='$student' and year='$year'");
            $row=mysqli_fetch_array($marks_select);
            if ($term==1) {
                echo"<dt>".$row['term1']."</td>";
            }
            if ($term==2) {
                echo"<dt>".$row['term2']."</td>"; 
            }
            if ($term==3) {
                echo"<dt>".$row['term3']."</td>"; 
            }
        echo"<td>".$row['total']."</td></tr>";
        }

        if (isset($_POST['edit'])) {
            echo"<script>window.location.href='dodedit.php'</script>"; 
            }
            
           ?>
                </table>
                <button name="edit">Edit</button>
            </form>
        </div>
    </center>
</body>

</html>
<style>
button {
    width: fit-content;
    height: fit-content;
    background-color: rgb(71, 231, 71);
    border: none;
    margin-top: 0.4rem;
    border-radius: 3px;
    padding: 5px;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    color: #fff;
}
</style>