<?php
include("connection.php");
$row=$_GET['id'];
$select=mysqli_query($conn,"SELECT * FROM teacher where tid='$row'");
while ($a=mysqli_fetch_array($select)) {
    ?>
    <form action="" method="post">
    <div class="cont">
        <h1>Teacher Update</h1>
        <div class="info" id="info">
        <span>First name<sup>*</sup></span><br>
        <input type="text" name="fname" value="<?php echo $a['fname']?>"><br>
        <span>Last Name<sup>*</sup></span><br>
        <input type="text" name="lname" id="" value="<?php echo $a['lname']?>"><br>
        <span>Code<sup>*</sup></span><br>
        <input type="text" name="code" id="" value="<?php echo $a['tcode']?>"><br><br>
        <button name="update" id="update">Update</button><br>
        </div>
</div>
    </form>
    
    <?php
}
if (isset($_POST['update'])) {
    $fname=$_POST['fname'];
    $lname=$_POST['lname'];
    $code=$_POST['code'];
    $update=mysqli_query($conn,"UPDATE teacher set fname='$fname',lname='$lname',tcode='$code' where tid='$row'");
    header("location:teacher.php");
    }
?>
<style>
    .cont{
        width: 30%;
        font-size: 14px;
        box-shadow: 0px 0px 3px 3px rgb(170, 204, 170);
        margin: auto;
        border-radius: 5px;
        text-align: center;
        padding: 10px;
    }
    button{
        font-size: 20px;
        background-color: green;
        cursor: pointer;
        border: none;
        border-radius: 3px;
        margin: 5px;
        padding: auto;
        font-weight: bold;
        color: white;
    }
    
</style>


