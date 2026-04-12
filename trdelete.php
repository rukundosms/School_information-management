<?php
include("connection.php");
$row=$_GET['id'];
mysqli_query($conn,"DELETE from trade where trid='$row'");
header("location:trade.php");
?>

