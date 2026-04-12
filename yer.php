<?php
include("connection.php");
session_start();
$trade=$_SESSION['t'];
$class=$_SESSION['cl'];
$ok=$_SESSION['b'];
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
    <h1>Choose year</h1>
    <form action="" method="post">
    <?php
    $select=mysqli_query($conn,"SELECT distinct(year) from marks");
    $count=0;
        while ($a=mysqli_fetch_array($select)) {
$count++;
$view="cals{$count}";
            ?>
<button name="<?php echo $view ?>"><?php echo $a['year']?></button>
    <?php
    if (isset($_POST[$view])) {
        $_SESSION['year']=$a['year'];
        $_SESSION['br']=$ok;
         header("location:term_branched.php");
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