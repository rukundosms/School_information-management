<?php
include("connection.php");
session_start();

if(isset($_POST['sid']) && isset($_POST['status'])) {
    $sid = $_POST['sid'];
    $status = $_POST['status'];
    
    $update = mysqli_query($conn, "UPDATE student SET status='$status' WHERE sid='$sid'");
    if($update) {
        echo "success";
    } else {
        echo "error";
    }
}
?>