<?php
include("connection.php");
session_start();
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
$_SESSION['me']=$_GET['id'];
        $id=$_SESSION['me'];
        $select=mysqli_query($conn,"select * from teacher where tid='$id'");
         while ($a=mysqli_fetch_array($select)) {
            ?><form action="" method="post">
            <div class="info">
                <h1><?php echo strtoupper($a['fname'])." ".$a['lname'] ?></h1>
         </div>
                <?php
         }
         ?>
    <h1>choose class</h1>
    <form action="" method="post">
    <?php
    $select=mysqli_query($conn,"SELECT * from class");
    $count=0;
        while ($a=mysqli_fetch_array($select)) {
$count++;
$view="cals{$count}";
            ?>
<button name="<?php echo $view ?>"><?php echo $a['level']?></button>
    <?php
    if (isset($_POST[$view])) {
        $_SESSION['cl']=$a['cid'];
        $_SESSION['level']=$a['level'];
        $_SESSION['name']=$a['name'];
        $_SESSION['teacher']=$id;
        header("location:permision_module.php");
    }
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