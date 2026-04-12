<?php
include("connection.php");
$row=$_GET['id'];
mysqli_query($conn,"DELETE from class where cid='$row'");
header("location:class.php");
?>

