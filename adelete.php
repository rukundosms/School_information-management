<?php
include("connection.php");
$row=$_GET['id'];
mysqli_query($conn,"DELETE from assessment where AssNo='$row'");
header("location:assessment.php");
?>

