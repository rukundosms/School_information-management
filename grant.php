<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grant</title>
</head>
<body>
    <center>
    <div class="cont">
        <h1>Choose teacher To give Grant</h1>
        <?php 
        include("connection.php");
        $select=mysqli_query($conn,"select * from teacher");
        $b=0;
        while ($a=mysqli_fetch_array($select)) {
            $b++;
            echo"<div class='teacher'><p>".$b.".  ".strtoupper($a['fname'])." ".$a['lname']."</p>";
            ?>
            <a href="permition.php?id=<?php echo $a['tid'] ?>">Garant</a>
        </div>
            <?php
        }
        ?>
    </div>
</center>
</body>
</html>
<style>
    .cont{
        width: 100%;
    }
    .teacher{
        display: flex;
        width: 40%;
        height: fit-content;
        padding: 10px;
        margin-top: 2px;
        background-color: rgb(236, 245, 245);
        border-radius: 10px;
    
    }
    a{
        text-decoration: none;
        background-color: green;
        color: white;
        font-size: 14px;
        text-transform: uppercase;
        border-radius: 5px;
        font-weight: bold;
        padding:5px;
        margin-left: 5px;
        
        height: fit-content;
    }
    p{
        font-size: 14px;
        margin-top: 5px;
        height: fit-content;
        width: fit-content;
        font-weight: 300px;
    }
    
</style>
