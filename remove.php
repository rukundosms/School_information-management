<?php
include("connection.php");
session_start();
$id=$_GET['id'];
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
    <h1>Choose class</h1>
    <form action="" method="post">
    <?php
    $select=mysqli_query($conn,"SELECT distinct(class.level),class.cid,permision.cid,class.cid from class,permision where permision.cid=class.cid and permision.tid='$id'");
    $count=0;
    if (mysqli_num_rows($select)<=0) {
      echo"<h1>No permited class</h1>";
    }
        while ($a=mysqli_fetch_array($select)) {
$count++;
$view="cals{$count}";
            ?>
<button name="<?php echo $view ?>"><?php echo $a['level'];?></button>
    <?php
    if (isset($_POST[$view])) {
        $_SESSION['cl']=$a['cid'];
        $_SESSION['teacher']=$id;
        header("location:revoke_module.php");
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
