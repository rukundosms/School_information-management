<?php
include("connection.php");
$row=$_GET['id'];
$delete=mysqli_query($conn,"DELETE from permision where tid='$row'");
if ($delete==true) {
    mysqli_query($conn,"DELETE from teacher where tid='$row'");
header("location:teacher.php");
}

?>

