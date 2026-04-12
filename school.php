<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
   <div class="cont">
    <h1>School infirmation</h1>
    <?php
    include("connection.php");
    $select=mysqli_query($conn,"SELECT * from school");
    while ($a=mysqli_fetch_array($select)) {
      ?>
      <form action="" method="post">
    <span>school Name<sup>*</sup></span><br>
    <input type="text" name="name" value="<?php echo $a['school_name']?>"><br>
    <span>Code<sup>*</sup></span><br>
    <input type="text" name="code" value="<?php echo $a['code']?>"><br><br>
    <span>countiry<sup>*</sup></span><br>
    <input type="text" name="countiry" value="<?php echo $a['country']?>"><br>
    <span>Provence<sup>*</sup></span><br>
    <input type="text" name="provence" value="<?php echo $a['provence']?>"><br>
    <span>District<sup>*</sup></span><br>
    <input type="text" name="district" value="<?php echo $a['district']?>"><br>
    <span>secter<sup>*</sup></span><br>
    <input type="text" name="secter" value="<?php echo $a['secter']?>"><br>
    <span>contact<sup>*</sup></span><br>
    <input type="text" name="phone" value="<?php echo $a['phone']?>"><br><br>
    <span>E-mail<sup>*</sup></span><br>
    <input type="text" name="email" value="<?php echo $a['email']?>"><br><br>
    <button name="save">Save</button>
   </div>
</form>
   <?php
    }
    if (isset($_POST['save'])) {
        $name=$_POST['name'];
        $c=$_POST['countiry'];
        $po=$_POST['provence'];
        $d=$_POST['district'];
        $s=$_POST['secter'];
        $p=$_POST['phone'];
        $e=$_POST['email'];
        $code=$_POST['code'];
        mysqli_query($conn,"UPDATE school set school_name='$name',code='$code',email='$e',country='$c', phone='$p',secter='$s',district='$d',provence='$po'");
        header("location:home.php");
    }
    ?>
</body>
</html>
<style>
    *{
        padding: 0;
        margin: 0;
        font-family: sans-serif;
        box-sizing: border-box;
    }
    body{
        background-color: #fff;

    }
    .cont{
        width: 40%;
        border-radius: 5px;
        box-shadow: 0px 0px 3px 3px rgb(159, 192, 159);
        margin: auto;
        padding: 10px;
        text-align: center;
        margin-top: 5%;
    }
    input{
        width: fit-content;
        border: solid green 1px;
        border-radius: 3px;
        padding: 5px;
        height: fit-content;
        font-size: 14px;
        font-weight: bold;
    }
    button{
        width: fit-content;
        height: fit-content;
        font-size: 20px;
        background-color: green;
        color: white;
        font-weight: bold;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        padding: 5px;

    }
</style>