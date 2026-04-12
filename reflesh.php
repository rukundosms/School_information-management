<?php
include("connection.php");
session_start();
if (!isset($_SESSION['id'])) {
    header("location:index.html");
}
$class=$_SESSION['cl'];
$trade=$_SESSION['t'];
header("location:report.php");

?>