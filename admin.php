<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>admin</title>
</head>
<body><form action="" method="POST">
    <div class="cont">

        <h1>Create acount</h1>
        <span>Username<sup>*</sup></span><br>
        <input type="text" name="username"><br>
        <span>Password<sup>*</sup></span><br>
        <input type="password" name="password" id=""><br>
        <span>Postion<sup>*</sup></span><br>
        <select name="postion" id="">
            <option value="1">RUKUNDO</option>
            <option value="2">DOS</option>
            <option value="3">DOD</option>
        </select><br><br>
        <button name="create">Submit</button><br>
        <a href="index.html">Login</a>
    </div>
</form>
</body>
</html>
<?php
include("connection.php");
if (isset($_POST['create'])) {
$username=$_POST['username'];
$password=$_POST['password'];
$postion=$_POST['postion'];
$insert=mysqli_query($conn,"insert into admin(username,password,postion) values('$username','$password','$postion')");
if ($insert==true) {
    echo"<script>alert('account created go to Login'),location='index.html'</script>";
}
}?>
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
    select{
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