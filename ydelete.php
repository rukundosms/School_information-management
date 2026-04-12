<?php
include("connection.php");
$row=$_GET['id'];
mysqli_query($conn,"DELETE from year where id='$row'");
header("location:year.php");
?>

