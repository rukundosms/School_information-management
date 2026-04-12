<?php
session_start();
include("connection.php");

if (isset($_POST['create'])) {
    $username = mysqli_real_escape_string($conn, $_POST['username']);
    $password = mysqli_real_escape_string($conn, $_POST['password']);
    
    $select = mysqli_query($conn, "SELECT * FROM admin WHERE username='$username' && password='$password'");
    
    if (mysqli_num_rows($select) >= 1) {
        $a = mysqli_fetch_array($select);
        $_SESSION['id'] = $a['id'];  
        $_SESSION['username'] = $a['username'];  
        $_SESSION['password'] = $a['password'];
        $_SESSION['postion'] = $a['postion'];
        
        // Redirect based on position
        switch($a['postion']) {
            case 3:
                header("location: dod.php");
                break;
            case 1:
            header("location: home.php");
            break;
            case 2:
                header("location: home.php");
                break;
            default:
                echo "<script>alert('Invalid user position'),location='index.html'</script>";
        }
        exit();
    } else {
        echo "<script>alert('Incorrect username or password'); window.location.href='index.html';</script>";
    }
}
?>