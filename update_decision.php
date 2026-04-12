<?php
include("connection.php");
session_start();

if(isset($_POST['sid']) && isset($_POST['decision'])) {
    $sid = $_POST['sid'];
    $decision = $_POST['decision'];
    
    $update = mysqli_query($conn, "UPDATE student SET decission='$decision' WHERE sid='$sid'");
    if($update) {
        echo "success";
    } else {
        echo "error";
    }
}
?>