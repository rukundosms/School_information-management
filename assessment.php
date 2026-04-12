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
            <h1>Assessment</h1>
        <table border="2">
           
            <tr><th>N<sup><u>o</u></sup></th><th>Assessment</th><th>Option</th></tr>
            <?php
            include("connection.php");
            $select=mysqli_query($conn,"select * from assessment");
            while ($a=mysqli_fetch_array($select)) {
                echo"<tr><td>".$a['AssNo']."</td><td>".$a['AssName']."</td>";
                ?>
                <td>
                <a href="aupdate.php?id=<?php echo $a['AssNo']?>">Edit</a>
                <a href="adelete.php?id=<?php echo $a['AssNo']?>" class="delete">Delete</a>
            </td>
                <?php
            } 
            ?>
        </table>
</div>
<div class="add">
        <h1>Add Level</h1>
        <div class="info">
        <span>Assessment<sup>*</sup></span><br>
        <input type="text" name="name"><br><br>
        <button name="add">Add</button><br>
        </div>    
    </div></div>
</form>
</body>
</html>
<?php

if (isset($_POST['add'])) {
    $name=$_POST['name'];
    $sel=mysqli_query($conn,"select*from assessment");
    if (mysqli_num_rows($sel)>=2) {
        echo"<script>alert('All assessment Exist try to update'),location='assessment.php'</script>";  
    }

else {
    $insert=mysqli_query($conn,"insert into assessment(AssName) values('$name')");
    header("location:assessment.php");
}
}?>
<style>
    *{
        padding: 0;
        margin: 0;
        font-family: sans-serif;
        box-sizing: border-box;
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
    .cont{
        width:100%;
        height: 100vh;
        background-color: white;
        display: flex;
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
        width: 80%;
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