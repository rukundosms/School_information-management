<?php
include("connection.php");
session_start();
$me=$_SESSION['teacher'];
$class=$_SESSION['cl']; 
if (!isset($_SESSION['id'])) {
    header("location:index.html");
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
    <h1>Choose module</h1>
    <form action="" method="post">
    <?php
    $select=mysqli_query($conn,"SELECT * from module,permision where permision.mid=module.moid  and module.class='$class' and permision.tid='$me'");
    $count=0;
        while ($a=mysqli_fetch_array($select)) {
$count++;
$view="cals{$count}";
            ?>
<button name="<?php echo $view ?>"><?php echo $a['mname']?></button>
    <?php
    if (isset($_POST[$view])) {
        $module=$a['moid'];
       mysqli_query($conn,"DELETE from permision where tid='$me' and cid='$class' and mid='$module'");
        echo"<script>alert('permision revoked'),location='revok.php'</script>";
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
        width: fit-content;
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