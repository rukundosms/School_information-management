<?php
include("connection.php");
session_start();
$teacher=$_SESSION['teacher'];
$class=$_SESSION['cl']; 
if (!isset($_SESSION['id'])) {
    header("location:index.php");
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
</head>
<body>
    <center>
<div class="cont">
<?php

$select=mysqli_query($conn,"select * from teacher where tid='$teacher'");
         while ($a=mysqli_fetch_array($select)) {
            ?><form action="" method="post">
            <div class="info">
                <h1><?php echo strtoupper($a['fname'])." ".$a['lname'] ?></h1>
                <h1><?php echo $_SESSION['level'] ?></h1>
         </div>
                <?php
         }
         ?>
    <h1>Choose module</h1>
    <form action="" method="post">
    <?php
    $select=mysqli_query($conn,"SELECT * from module where class='$class'");
    $count=0;
        while ($a=mysqli_fetch_array($select)) {
$count++;
$view="cals{$count}";
            ?>
<button name="<?php echo $view ?>"><?php echo $a['mname']?></button>
    <?php
    if (isset($_POST[$view])) {
       $mid=$a['moid'];
     $name=$a['mname']; 
     $chech1=mysqli_query($conn,"SELECT * FROM permision where cid='$class' and mid='$mid' and tid='$teacher'");
    if (mysqli_num_rows($chech1)>=1) {
        echo"<script>alert('you are have this permision'),location='permision_module.php'</script>";
     }
     $chech=mysqli_query($conn,"SELECT * FROM permision where cid='$class' and mid='$mid'");
     if (mysqli_num_rows($chech)>=1) {
        echo"<script>alert('this permision exist'),location='permision_module.php'</script>";
     }
    
     else{
     mysqli_query($conn,"INSERT INTO permision(cid,tid,mid) values('$class','$teacher','$mid')");
     echo"<script>alert('permision granted'),location='permision_module.php'</script>";
    }}
    }
    ?>
    </form>
</div>
    </center>
</body>
</html>
<style>
    .cont{
        width: 100%;
        height: 80vh;
    }
    button{
        width: 20%;
        height: 10vh;
        margin: 10px;
        background-color: #fff;
        color: black;
        font-weight: 10px;
        font-size: 30px;
        border: none;
        box-shadow: 0px 0px 3px 3px rgb(161, 196, 161);
        border-radius: 5px;
    }
</style>