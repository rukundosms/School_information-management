<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>admin</title>
</head>
<body><form action="" method="POST">
    <div class="cont">
        <div class="old">
            <h1>Trades</h1>
        <table border="2">
            <tr><th>N<sup><u>o</u></sup></th><th>Trade Name</th><th>obriviation</th><th>Trade code</th><th>Option</th></tr>
            <?php
            include("connection.php");
            $select=mysqli_query($conn,"select * from trade");
            while ($a=mysqli_fetch_array($select)) {
                echo"<tr><td>".$a['trid']."</td><td>".$a['name']."</td><td>".$a['ob']."</td><td>".$a['trade_code']."</td>";
                ?>
                <td>
                <a href="trupdate.php?id=<?php echo $a['trid']?>">Edit</a>
                <a href="trdelete.php?id=<?php echo $a['trid']?>" class="delete">Delete</a>
            </td>
                <?php
            } 
            ?>
        </table>
</div>
<div class="add">
        <h1>Add trade</h1>
        <div class="info">
        <span>Trade name<sup>*</sup></span><br>
        <input type="text" name="name"><br><br>
        <span>Trade abriviation<sup>*</sup></span><br>
        <input type="text" name="ob"><br><br>
        <span>Trade code<sup>*</sup></span><br>
        <input type="text" name="code"><br><br>
        <button name="create">Add</button><br>
        </div>
    </div></div>
</form>
</body>
</html>
<?php

if (isset($_POST['create'])) {
$name=$_POST['name'];
$code=$_POST['code'];
$ob=$_POST['ob'];
$insert=mysqli_query($conn,"insert into trade(name,trade_code,ob) values('$name','$code','$ob')");
if ($insert==true) {
    echo"<script>alert('Trade registred'),location='trade.php'</script>";
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
        width:100%;
        height: 100vh;
        background-color: white;
        display: flex;
    }
    a{
        width: fit-content;
        height: fit-content;
        padding: 5px;
        margin: 5px;
        text-decoration: none;
        font-size: 14px;
        text-transform: uppercase;
        background-color: green;
        color: white;
        font-weight: bold;
        border-radius: 3px;
        
    }
    .delete{
        background-color: red;
    }
    .old{
        width: 70%;
        height: 100vh;
        position: relative;
        overflow-y: scroll;
    }
    h1{
        margin: auto;
        
    }
    .old table{
        width: 60%;
        margin: auto;
        margin-top: 10px;
        border: none;
        font-size: 14px;
        border-spacing: 0px;
    }
    td{
        padding: 5px;
        
    }
    .add{
        width: 30%;
        height: 100vh;
        text-align: center;
        
    }
    .info{
        width: 90%;
        position: relative;
        height: fit-content;
        border-radius: 5px;
        background-color: white;
        padding: 5px;
        margin: auto;
        margin-top: 10px;
        box-shadow: 0px 0px 3px 3px rgb(180, 206, 180);
    }
    label{
        position: absolute;
        color: red;
        left: 30px;
        top: 35px;
        pointer-events: none;
    }
   
    .info input{
        position: relative;
        width: 90%;
        height: 30px;
        font-size: 14px;
        border-radius: 5px;
        border: solid rgb(57, 168, 57) 1px;
    }
    .add button{
        width: fit-content;
        height: fit-content;
        padding: 10px;
        border-radius: 5px;
        border: none;
        background-color: green;
        color: white;
        font-weight: bold;
        margin-top: 10px;
    }
</style>