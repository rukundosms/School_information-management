<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>admin</title>
</head>
<body><form action="" method="POST">
    <div class="cont">

        <h1>Create create password</h1>
        <span>Password<sup>*</sup></span><br>
        <input type="password" name="password" id="" placeholder="Create Password"><br><br>
        <button name="create">Save password</button><br><br>
        <button name="login">Login</button><br>
        
    </div>
</form>
</body>
</html>
<?php
include("connection.php");
if (isset($_POST['create'])) {
$code=$_SESSION['tcode'];
$password=$_POST['password'];
$insert=mysqli_query($conn,"insert into user(tcode,password) values('$code','$password')");
if ($insert==true) {
    echo"<script>alert(' your account create go to login '),location='userlogin.php'</script>";
}
}
if (isset($_POST['login'])) {
    header("location:userlogin.php");
}
?>
<style>
    *{
        padding: 0;
        margin: 0;
        font-family: sans-serif;
        box-sizing: border-box;
    }
    .cont{
        width: 30%;
        height: fit-content;
        padding-left: 5%;
        padding-top: 2%;
        margin: auto;
        text-align: left;
        background-color: white;
        border-radius: 5px;
    }
 sup{
        color: rgb(18, 230, 18);
        font-size: 20px;
    }
    body{
        background-color: rgb(238, 247, 238);
        padding-top: 15%;
    }
    button{
        font-size: 20px;
        border: solid green 2px;
        border-radius: 5px;
        padding: 5px;
        border-style: groove;
        font-weight: bold;
        background: transparent;
        margin-bottom: 10px;
        cursor: pointer;
    }
    a{
        font-size: 14px;
        color: rgb(22, 223, 22);
        
    }
    
    input{
        width: 70%;
        font-size: 14px;
        height: 30px;
        padding: 5px;
        border-radius: 5px;
        border: solid green 1px;
        z-index: 1111;
    }
    span{
        font-size: 14px;
        margin-left: 10px;
    }
    #check{
        width: 15px;
        margin-top: 3%;
        height: 15px;
        margin-right: 5px;
        border: solid black;
    }
</style>