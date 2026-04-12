<?php
include("connection.php");
$row=$_GET['id'];
mysqli_query($conn,"DELETE from module where moid='$row'");
header("location:module.php");
?>

