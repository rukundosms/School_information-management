<?php
include("connection.php");
$row=$_GET['id'];
$select=mysqli_query($conn,"SELECT * FROM student,class where class.cid=student.class and sid='$row'");
while ($a=mysqli_fetch_array($select)) {
    ?>
    <form action="" method="post">
    <div class="cont">
    <h1>Add student</h1>
        <div class="info">
        <span>First Name<sup>*</sup></span><br>
        <input type="text" name="fname" value="<?php echo $a['firstname']?>"><br>
        <span>Last Name<sup>*</sup></span><br>
        <input type="text" name="lname" value="<?php echo $a['lastname']?>"><br>
        <span>Reg Number<sup>*</sup></span><br>
        <input type="number" name="reg" value="<?php echo $a['reg']?>"><br>
        <span>District<sup>*</sup></span><br>
        <input type="text" name="district" value="<?php echo $a['district']?>"><br>
        <span>secter<sup>*</sup></span><br>
        <input type="text" name="secter" value="<?php echo $a['secter']?>"><br>
        <span>Level<sup>*</sup></span><br>
        <select name="class" id="">
        <option value="<?php echo $a['class']?>" selected><?php echo $a['level']?></option>
                <?php
            $select1=mysqli_query($conn,"select * from class");
            while ($c=mysqli_fetch_array($select1)) {
                
                ?>
               <option value="<?php echo $c['cid']?>"><div class="list"><?php echo $c['level']. '' .$c['class_name']?></div></option>
                <?php
            } 
            ?>
        </select><br><br>
        <button name="update">update</button><br>
        </div>
</div>
    </form>
    
    <?php
}
if (isset($_POST['update'])) {
$fname=$_POST['fname'];
$trade=$_POST['trade'];
$class=$_POST['class'];
$lname=$_POST['lname'];
$secter=$_POST['secter'];
$reg=$_POST['reg'];
$district=$_POST['district'];
$check=mysqli_query($conn,"SELECT * FROM student where reg='$reg' and sid!='$row'");
if (mysqli_num_rows($check)>0) {
    echo"<script>alert('registration number not fund'),location='student.php'</script>";  
}
else{
$update=mysqli_query($conn,"UPDATE student set firstname='$fname',reg='$reg',lastname='$lname',secter='$secter',district='$district',trade='$trade',class='$class' where sid='$row'");
    header("location:student.php");
    }}
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


