<?php
include("connection.php");
$row=$_GET['id'];
$delete=mysqli_query($conn,"DELETE from marks where sid='$row'");
if ($delete==true) {
  mysqli_query($conn,"DELETE from student where sid='$row'");
  mysqli_query($conn,"DELETE from ranks where sid='$row'");
header("location:student.php");
}

?>

