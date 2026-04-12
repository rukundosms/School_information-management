<?php
session_start(); 
include("connection.php");
$class=$_SESSION['cl'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>marks</title>
</head>
<body>
    <div class="cont">
        <form action="" method="post">
        <h1>upload marks</h1>
        <span>Academic year<sup>*</sup></span><br>
        <select name="year" id="">
            <option value="0" selected>select year</option>
                <?php
           
            $select=mysqli_query($conn,"select * from year");
            while ($a=mysqli_fetch_array($select)) {
                
                ?>
               <option value="<?php echo $a['year']?>"><?php echo $a['year']?></option>
                <?php
            }
            ?>
                
           
        </select><br>
        <span>tearm<sup>*</sup></span><br>
        <select name="term" id="">
            <option value="1">tearm 1</option>
            <option value="2">tearm 2</option>
            <option value="3">tearm 3</option>
        </select><br>
        <span>total marks<sup>*</sup></span><br>
        <input type="" name="total" id=""><br><br>
<button name="contnue">contnue</button>
</form>
    </div>
</body>
</html>
<?php
include("connection.php");
if (isset($_POST['contnue'])) {
$_SESSION['year']=$_POST['year'];
$_SESSION['total']=$_POST['total'];
$_SESSION['term']=$_POST['term'];
header("location:dodupload.php");
}
?>
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
        width: 30%;
        height:fit-content;
        border-radius: 5px;
        margin: auto;
        margin-top: 5%;
        text-align: center;
        box-shadow: 0px 0px 5px 5px rgb(159, 199, 159);

    }
   
    
    select{
        border: solid rgb(30, 139, 30) 1px;
        border-radius: 5px;
        font-size: 14px;
        width: 50%;
    }
    button{
        width: fit-content;
        height: fit-content;
        padding: 10px;
        border-radius: 5px;
        border: none;
        background-color: green;
        cursor: pointer;
        color: white;
        font-weight: bold;
        margin-top: 10px;
    }
    select option{
        background-color: #fff;
        margin: 5px;
       
    }
</style>